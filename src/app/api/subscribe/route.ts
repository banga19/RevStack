import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { validateCsrf } from "@/lib/csrf"
import { appendSubscriberRow } from "@/lib/google-sheets"

/**
 * Newsletter / Email Subscriber Endpoint
 *
 * This is called from the landing page email capture form.
 * It creates a Subscriber record and appends to Google Sheets for admin review.
 * Does NOT require authentication or an active subscription.
 *
 * Payment subscription initiation goes through:
 *   PaymentCheckout component → /api/payments/initiate
 *
 * Subscription lifecycle management goes through:
 *   /api/subscription (GET, POST, PATCH, DELETE)
 */
export async function POST(req: NextRequest) {
  try {
    // CSRF is optional for public subscribe (landing page form).
    // Validate if the cookie exists, but allow anonymous subscriptions.
    const csrfCheck = await validateCsrf(req)
    if (!csrfCheck.valid && csrfCheck.reason !== "Missing CSRF cookie") {
      return NextResponse.json({ error: "Invalid or missing security token" }, { status: 403 })
    }

    const body = await req.json()
    const { email, source = "landing-page" } = body

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    // Check if already subscribed
    const existing = await prisma.subscriber.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ message: "Already subscribed" })
    }

    // Create subscriber
    const subscriber = await prisma.subscriber.create({
      data: {
        email,
        source,
      },
    })

    // Save to Google Sheets for admin review
    appendSubscriberRow({
      email: subscriber.email,
      name: null,
      source: subscriber.source,
      createdAt: subscriber.createdAt.toISOString(),
    }).catch((err) => {
      console.error("Google Sheets subscriber append error:", err)
    })

    return NextResponse.json({ message: "Subscribed successfully" })
  } catch (error) {
    console.error("Subscribe error:", error)
    return NextResponse.json({ error: "Failed to subscribe. Please try again." }, { status: 500 })
  }
}
