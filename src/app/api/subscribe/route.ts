import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { validateCsrf } from "@/lib/csrf"
import { appendSubscriberRow } from "@/lib/google-sheets"

export async function POST(req: NextRequest) {
  try {
    const csrfCheck = await validateCsrf(req)
    if (!csrfCheck.valid) {
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
