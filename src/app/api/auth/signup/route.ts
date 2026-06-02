import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { sendWelcomeEmail } from "@/lib/email"
import { validateCsrf } from "@/lib/csrf"

export async function POST(req: NextRequest) {
  // Validate CSRF token
  const csrfCheck = await validateCsrf(req)
  if (!csrfCheck.valid) {
    return NextResponse.json({ error: "Invalid or missing security token. Please refresh the page and try again." }, { status: 403 })
  }

  try {
    const { name, email, password, phone, termsAccepted } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    // Validate terms acceptance
    if (!termsAccepted) {
      return NextResponse.json(
        { error: "You must accept the Terms & Conditions to create an account" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Auto-start 14-day free trial on signup
    const now = new Date()
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        termsVersion: "1.0",
        // Start free trial immediately
        trialStartsAt: now,
        trialEndsAt: trialEnd,
        subscriptionStatus: "trial",
        subscriptionPlan: "monthly",
      },
    })

    // Send welcome email with trial info
    await sendWelcomeEmail(user.email, user.name)

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
          daysRemaining: 14,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
