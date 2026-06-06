/**
 * Email LangChain Tools
 *
 * Wraps the email sending capabilities as callable LangChain tools
 * for use in the Hermes LangGraph sales pipeline. Supports both
 * welcome emails and custom transactional emails via Nodemailer.
 *
 * Exports:
 *   emailSendSequence  — send a custom email to a lead/client
 *   emailSendWelcome   — send the standard welcome email
 */

import { tool } from "@langchain/core/tools"
import { z } from "zod"

// ============================================================
// Send Custom Email
// ============================================================

const SendEmailSchema = z.object({
  to: z.string().email().describe("Recipient email address"),
  name: z.string().describe("Recipient name for personalisation"),
  subject: z.string().describe("Email subject line"),
  body: z.string().describe("Plain text email body content"),
})

export const emailSendSequence = tool(
  async ({ to, name, subject, body }) => {
    try {
      const nodemailer = await import("nodemailer")

      // Build transport — use configured SMTP or Ethereal in dev
      let transporter
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.default.createTransport({
          host: process.env.SMTP_HOST || "smtp.ethereal.email",
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true",
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        })
      } else if (process.env.NODE_ENV !== "production") {
        const testAccount = await nodemailer.default.createTestAccount()
        transporter = nodemailer.default.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass },
        })
      } else {
        return JSON.stringify({
          success: false,
          error: "SMTP not configured — set SMTP_USER and SMTP_PASS env vars",
        })
      }

      const info = await transporter.sendMail({
        from: '"RevStack" <noreply@revstack.app>',
        to,
        subject: subject.substring(0, 998), // RFC 2821 limit
        text: body,
      })

      // Log preview URL in dev
      if (process.env.NODE_ENV !== "production" && !process.env.SMTP_USER) {
        console.log("[Email Tool] Preview URL:", nodemailer.default.getTestMessageUrl(info))
      }

      return JSON.stringify({
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.default.getTestMessageUrl(info) || undefined,
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Email send failed: ${(error as Error).message}`,
      })
    }
  },
  {
    name: "email_send_sequence",
    description:
      "Send a custom email to a lead or client via SMTP. " +
      "Use for outreach sequences, follow-ups, and transactional messages. " +
      "Falls back to Ethereal for development preview.",
    schema: SendEmailSchema,
  }
)

// ============================================================
// Send Welcome Email
// ============================================================

const SendWelcomeSchema = z.object({
  email: z.string().email().describe("New user's email address"),
  name: z.string().describe("New user's name"),
})

export const emailSendWelcome = tool(
  async ({ email, name }) => {
    try {
      const { sendWelcomeEmail } = await import("@/lib/email")
      const result = await sendWelcomeEmail(email, name)
      return JSON.stringify(result)
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Welcome email failed: ${(error as Error).message}`,
      })
    }
  },
  {
    name: "email_send_welcome",
    description:
      "Send the standard platform welcome email to a new user. " +
      "Includes onboarding instructions and getting-started guide.",
    schema: SendWelcomeSchema,
  }
)
