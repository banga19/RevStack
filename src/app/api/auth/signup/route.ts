import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { sendWelcomeEmail } from "@/lib/email"
import { validateCsrf } from "@/lib/csrf"
import { appendSignupRow } from "@/lib/google-sheets"

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

    // All users get full enterprise access for free — no trial gating
    const now = new Date()

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        termsVersion: "1.0",
        subscriptionStatus: "active",
        subscriptionTier: "enterprise",
        subscriptionPlan: "monthly",
        subscriptionStartsAt: now,
      },
    })

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name)

    // Fire-and-forget sheet push (admin review backfill)
    appendSignupRow({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      termsAccepted: true,
      subscriptionStatus: "active",
      subscriptionPlan: "monthly",
      createdAt: new Date().toISOString(),
    }).catch((err) => {
      console.error("Google Sheets signup append error:", err)
    })

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        termsAccepted: true,
        termsVersion: "1.0",
        access: "full",
        tier: "enterprise",
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
