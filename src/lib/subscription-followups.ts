/**
 * Subscription Follow-up Automation
 *
 * Sends timed email + WhatsApp reminders to users as their 14-day free trial
 * progresses and after it expires. The sequence is:
 *
 *   Day 10  → "Trial ending soon — 4 days left"
 *   Day 13  → "3 days remaining — pick a plan"
 *   Day 14  → "Last day of your trial!"
 *   D+3     → "Your trial has expired"
 *   D+7     → "Last chance — extended offer"
 *
 * Run via:  GET /api/cron/subscription-followups
 *           (or triggered manually from admin dashboard)
 */

import { prisma } from "@/lib/db"
import { watiIntegration } from "@/lib/wati-integration"
import nodemailer from "nodemailer"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FollowUpResult {
  processed: number
  sent: Array<{ userId: string; stage: string; type: string }>
  errors: Array<{ userId: string; stage: string; error: string }>
}

interface UserWithTrial {
  id: string
  name: string
  email: string
  phone?: string | null
  subscriptionStatus: string
  trialEndsAt: Date | null
  subscriptionTier: string | null
}

// ---------------------------------------------------------------------------
// Stage definitions
// ---------------------------------------------------------------------------

interface FollowUpStage {
  id: string
  /** 0 = trial end date, negative = days before, positive = days after */
  dayOffset: number
  /** Subject / title for the message */
  subject: string
  /** Email body template */
  emailBody: (user: UserWithTrial) => string
  /** WhatsApp message template */
  whatsappBody: (user: UserWithTrial) => string
}

const FOLLOW_UP_STAGES: FollowUpStage[] = [
  {
    id: "day-10",
    dayOffset: -4,
    subject: "Your Mapato trial ends in 4 days",
    emailBody: (u) =>
      `Hi ${u.name},\n\nQuick heads-up — your 14-day Mapato trial is almost up. You have 4 days left to pick a plan and keep your automation running.\n\n👉 Subscribe now: ${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/pricing\n\nYour pipeline, outreach sequences, and all client data will be preserved as soon as you subscribe.\n\nAny questions? Just reply to this email.\n\n— The Mapato Team`,
    whatsappBody: (u) =>
      `Hi ${u.name} 👋\n\nYour 14-day Mapato free trial ends in 4 days! Choose a plan to keep your automation pipeline, outreach sequences, and client data active.\n\n👉 Select your plan: ${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/pricing`,
  },
  {
    id: "day-13",
    dayOffset: -1,
    subject: "⚠️ 1 day left — your trial ends tomorrow",
    emailBody: (u) =>
      `Hi ${u.name},\n\nThis is a friendly reminder that your Mapato trial ends TOMORROW.\n\nIf you don't subscribe, your pipeline, outreach automations, and client data will be paused.\n\n✅ Subscribe now to keep everything running: ${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/pricing\n\nPlans start at just $50/mo — that's less than $2/day for full AI-powered revenue operations.\n\n— The Mapato Team`,
    whatsappBody: (u) =>
      `⚠️ Hi ${u.name} — your Mapato trial ends TOMORROW!\n\nSubscribe now to keep your automations, pipeline, and data active.\n\n✅ Plans from $50/mo: ${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/pricing`,
  },
  {
    id: "day-14",
    dayOffset: 0,
    subject: "🚨 Last day! Your Mapato trial ends today",
    emailBody: (u) =>
      `Hi ${u.name},\n\nToday is the LAST DAY of your Mapato trial.\n\nHere's what you'll lose access to if you don't subscribe:\n❌ AI lead qualification chatbot\n❌ WhatsApp & email automation sequences\n❌ Pipeline CRM with lead scoring\n❌ All your client data and outreach history\n\n✅ Subscribe now: ${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/pricing\n\nIt takes 2 minutes to set up your payment and everything stays in place.\n\n— The Mapato Team`,
    whatsappBody: (u) =>
      `🚨 Hi ${u.name} — TODAY is the last day of your Mapato trial!\n\nDon't lose your data and automations. Subscribe now to keep everything running.\n\n👉 ${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/pricing`,
  },
  {
    id: "d+3",
    dayOffset: 3,
    subject: "Your trial has ended — here's how to reactivate",
    emailBody: (u) =>
      `Hi ${u.name},\n\nYour Mapato trial has ended and your account is currently paused.\n\nGood news: all your data is still here. Subscribe to any plan and everything will be instantly reactivated — your pipeline, automations, and client history.\n\n👉 Reactivate now: ${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/pricing\n\nWe'd love to have you back.\n\n— The Mapato Team`,
    whatsappBody: (u) =>
      `Hi ${u.name} 👋\n\nYour Mapato trial has ended, but all your data is safe. Subscribe to any plan to instantly reactivate your account and automations.\n\n👉 Reactivate here: ${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/pricing`,
  },
  {
    id: "d+7",
    dayOffset: 7,
    subject: "🎁 Extended offer — 7 more days free",
    emailBody: (u) =>
      `Hi ${u.name},\n\nWe noticed you didn't subscribe after your trial ended. We'd love to have you experience the full power of Mapato.\n\n🎁 Here's a special offer: get 7 MORE DAYS free on any plan. No commitment.\n\n👉 Claim your extension: ${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/pricing?extended=7\n\nIf you have questions or need help choosing the right plan, just reply to this email — we're happy to help.\n\n— The Mapato Team`,
    whatsappBody: (u) =>
      `🎁 Hi ${u.name} — special offer! Get 7 extra days free on any Mapato plan. No commitment, no risk.\n\n👉 Claim now: ${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/pricing?extended=7`,
  },
]

// ---------------------------------------------------------------------------
// Transporter helper (reuses logic from email.ts)
// ---------------------------------------------------------------------------

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }

  if (process.env.NODE_ENV !== "production") {
    const testAccount = await nodemailer.createTestAccount()
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    })
  }

  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
  })
}

// ---------------------------------------------------------------------------
// Core follow-up logic
// ---------------------------------------------------------------------------

/**
 * Process subscription follow-ups for all eligible users.
 *
 * Finds users whose trial is ending or has ended, checks which follow-up
 * stage they're in, and sends the appropriate message if not already sent.
 */
export async function processFollowUps(): Promise<FollowUpResult> {
  const result: FollowUpResult = { processed: 0, sent: [], errors: [] }

  try {
    const now = new Date()

    // Find all users on trial or expired trial
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { subscriptionStatus: "trial" },
          { subscriptionStatus: "expired" },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionTier: true,
      },
    })

    for (const user of users) {
      if (!user.trialEndsAt) continue

      const trialEnd = new Date(user.trialEndsAt)
      const daysSinceEnd = Math.ceil((now.getTime() - trialEnd.getTime()) / (1000 * 60 * 60 * 24))

      for (const stage of FOLLOW_UP_STAGES) {
        const targetDay = stage.dayOffset
        const isMatch = daysSinceEnd === targetDay

        if (!isMatch) continue

        // Check if this stage was already sent for this user
        const alreadySent = await prisma.followUpLog.findUnique({
          where: {
            userId_stage_type: {
              userId: user.id,
              stage: stage.id,
              type: "email",
            },
          },
        })

        if (alreadySent) continue

        // Send email
        try {
          await sendFollowUpEmail(user, stage)
          await logSent(user.id, stage.id, "email")
          result.sent.push({ userId: user.id, stage: stage.id, type: "email" })
        } catch (error: any) {
          result.errors.push({ userId: user.id, stage: stage.id, error: `Email: ${error.message}` })
        }

        // Send WhatsApp via WATI if user has a phone number
        if (user.phone) {
          try {
            await watiIntegration.sendMessage(user.phone, stage.whatsappBody(user))
            await logSent(user.id, stage.id, "whatsapp")
            result.sent.push({ userId: user.id, stage: stage.id, type: "whatsapp" })
          } catch (error: any) {
            result.errors.push({ userId: user.id, stage: stage.id, error: `WhatsApp: ${error.message}` })
          }
        }
      }

      result.processed++
    }
  } catch (error: any) {
    console.error("[FollowUps] Error:", error)
  }

  return result
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sendFollowUpEmail(user: { id: string; name: string; email: string }, stage: FollowUpStage) {
  const transporter = await getTransporter()

  const body = stage.emailBody({ ...user, phone: null, subscriptionStatus: "trial", trialEndsAt: null, subscriptionTier: null })
  const htmlBody = body
    .replace(/\n/g, "<br>")
    .replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" style="color: #2563eb; text-decoration: underline;">$1</a>'
    )

  const info = await transporter.sendMail({
    from: '"Mapato" <followup@mapato.app>',
    to: user.email,
    subject: stage.subject,
    text: body,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${htmlBody}
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 0.8em; color: #666;">
        You're receiving this because you started a free trial at Mapato.<br>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/unsubscribe?email=${user.email}">Unsubscribe</a>
      </p>
    </div>`,
  })

  if (process.env.NODE_ENV !== "production" && !process.env.SMTP_USER) {
    console.log("[FollowUps] Preview URL:", nodemailer.getTestMessageUrl(info))
  }
}

async function logSent(userId: string, stage: string, type: "email" | "whatsapp") {
  try {
    await prisma.followUpLog.create({
      data: { userId, stage, type },
    })
  } catch (error) {
    if ((error as any)?.code !== "P2002") {
      console.error("[FollowUps] Failed to log:", error)
    }
  }
}

/**
 * Manually trigger a follow-up for a specific user (admin tool).
 */
export async function triggerFollowUpForUser(userId: string, stageId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  })

  if (!user) return false

  const stage = FOLLOW_UP_STAGES.find((s) => s.id === stageId)
  if (!stage) return false

  try {
    await sendFollowUpEmail(user, stage)
    await logSent(user.id, stage.id, "email")
    return true
  } catch {
    return false
  }
}
