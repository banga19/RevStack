import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { sendWelcomeEmail } from "@/lib/email"
import { validateCsrf } from "@/lib/csrf"
import { appendSignupRow } from "@/lib/google-sheets"
import { requireTurnstileToken, TurnstileError } from "@/lib/cloudflare/turnstile"
import { ipFromRequest } from "@/lib/rate-limiter"

export async function POST(req: NextRequest) {
  const csrfCheck = await validateCsrf(req)
  if (!csrfCheck.valid) {
    return NextResponse.json({ error: "Invalid or missing security token. Please refresh the page and try again." }, { status: 403 })
  }

  let turnstileToken: string | null = null
  let body: any = {}
  try {
    body = await req.json()
    turnstileToken = body.turnstileToken || null
  } catch {
    body = {}
  }

  if (process.env.TURNSTILE_SECRET_KEY) {
    try {
      const ip = ipFromRequest(req)
      await requireTurnstileToken(turnstileToken || "", ip)
    } catch (err) {
      if (err instanceof TurnstileError) {
        return NextResponse.json({ error: err.message }, { status: 403 })
      }
      console.warn("[Turnstile] Pre-check failed, continuing:", err)
    }
  }

  try {
    const { name, email, password, phone, termsAccepted, organizationName, industry, referralCode } = body
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }
    if (!termsAccepted) {
      return NextResponse.json({ error: "You must accept the Terms & Conditions to create an account" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const orgName = organizationName?.trim() || `${name}'s Company`
    const baseSlug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 40) || `org-${Date.now().toString(36)}`
    const orgSlug = `${baseSlug}-${Date.now().toString(36).substring(0, 8)}`

    const [organization, user] = await Promise.all([
      prisma.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
          plan: "trial",
        },
      }),
      prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: phone || null,
          termsAccepted: true,
          termsAcceptedAt: now,
          termsVersion: "1.0",
          organizationId: "", // placeholder; reassigned below
          trialStartsAt: now,
          trialEndsAt: trialEnd,
          subscriptionStatus: "trial",
          subscriptionTier: "enterprise",
          subscriptionPlan: "monthly",
        },
      }),
    ])

    await prisma.user.update({
      where: { id: user.id },
      data: { organizationId: organization.id },
    })

    let referralValidation: { valid: boolean; partnerFound: boolean; referralTracked: boolean }
    if (referralCode && typeof referralCode === "string" && referralCode.trim()) {
      try {
        const code = referralCode.trim()
        const partner = await prisma.partner.findUnique({ where: { referralCode: code } })
        if (partner) {
          const existingReferral = await prisma.referral.findFirst({
            where: { partnerId: partner.id, referredUserId: user.id },
          })
          if (!existingReferral) {
            await prisma.referral.create({
              data: {
                partnerId: partner.id,
                referredUserId: user.id,
                referredEmail: user.email,
                referredName: user.name,
                referralCode: code,
                status: "signed-up",
                signedUpAt: now,
              },
            })
          }
          referralValidation = { valid: true, partnerFound: true, referralTracked: !existingReferral }
        } else {
          referralValidation = { valid: false, partnerFound: false, referralTracked: false }
        }
      } catch (referralErr) {
        console.warn("[signup] referral tracking failed:", referralErr)
        referralValidation = { valid: false, partnerFound: false, referralTracked: false }
      }
    } else {
      referralValidation = { valid: false, partnerFound: false, referralTracked: false }
    }

    Promise.all([
      sendWelcomeEmail(user.email, user.name).catch((err) => console.warn("[signup] welcome email failed", err)),
      appendSignupRow({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        termsAccepted: true,
        trialStartedAt: now.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        subscriptionStatus: "trial",
        subscriptionPlan: "monthly",
        createdAt: now.toISOString(),
      }).catch((err) => console.warn("[signup] sheets append failed", err)),
    ])

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        termsAccepted: true,
        termsVersion: "1.0",
        trial: {
          startedAt: now.toISOString(),
          endsAt: trialEnd.toISOString(),
          daysRemaining: 3,
        },
        referralValidation,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }
}
