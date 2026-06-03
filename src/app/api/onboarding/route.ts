import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { appendOnboardingRow } from "@/lib/google-sheets"
import { getSuggestionFromBudget } from "@/lib/pricing"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionEmail = session.user.email
    const sessionUserId = (session.user as { id?: string }).id

    const dbUser =
      (sessionUserId ? await prisma.user.findUnique({ where: { id: sessionUserId } }) : null) ||
      (sessionEmail ? await prisma.user.findUnique({ where: { email: sessionEmail } }) : null)

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()

    // Validate required fields
    if (!body.businessName || !body.industry || !body.primaryGoal) {
      return NextResponse.json(
        { error: "Business name, industry, and primary goal are required" },
        { status: 400 }
      )
    }

    // Suggested pricing tier based on budget range
    const suggestion = body.budgetRange ? getSuggestionFromBudget(body.budgetRange) : null
    const suggestedTier: string | null = suggestion?.tier || null
    const suggestedMonthlyRetainer: number | null = suggestion?.monthlyPrice || null

    const response = await prisma.onboardingResponse.create({
      data: {
        userId: dbUser.id,
        businessName: body.businessName,
        industry: body.industry,
        companySize: body.companySize || null,
        primaryGoal: body.primaryGoal,
        secondaryGoals: body.secondaryGoals || null,
        currentChallenges: body.currentChallenges || null,
        targetAudience: body.targetAudience || null,
        servicesNeeded: body.servicesNeeded || null,
        budgetRange: body.budgetRange || null,
        timeline: body.timeline || null,
        referralSource: body.referralSource || null,
        additionalNotes: body.additionalNotes || null,
        completed: true,
      },
    })

    let sheetsOk = true
    let sheetsError: string | null = null
    try {
      await appendOnboardingRow({
        userId: dbUser.id,
        businessName: body.businessName,
        industry: body.industry,
        companySize: body.companySize || null,
        primaryGoal: body.primaryGoal,
        secondaryGoals: body.secondaryGoals || null,
        currentChallenges: body.currentChallenges || null,
        targetAudience: body.targetAudience || null,
        servicesNeeded: body.servicesNeeded || null,
        budgetRange: body.budgetRange || null,
        timeline: body.timeline || null,
        referralSource: body.referralSource || null,
        additionalNotes: body.additionalNotes || null,
        completed: true,
        createdAt: response.createdAt.toISOString(),
        suggestedTier,
        suggestedMonthlyRetainer,
      })
    } catch (err) {
      sheetsOk = false
      sheetsError = err instanceof Error ? err.message : "Unknown Sheets error"
      console.error("Onboarding sheets append error:", err)
    }

    return NextResponse.json({
      id: response.id,
      message: "Onboarding complete",
      sheetsOk,
      sheetsError,
    }, { status: 201 })
  } catch (error) {
    console.error("Onboarding error:", error)
    return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionEmail = session.user.email
    const sessionUserId = (session.user as { id?: string }).id
    const resolvedUser =
      (sessionUserId ? await prisma.user.findUnique({ where: { id: sessionUserId } }) : null) ||
      (sessionEmail ? await prisma.user.findUnique({ where: { email: sessionEmail } }) : null)

    if (!resolvedUser) {
      return NextResponse.json({ completed: false }, { status: 200 })
    }

    const response = await prisma.onboardingResponse.findFirst({
      where: { userId: resolvedUser.id, completed: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(response || { completed: false })
  } catch (error) {
    console.error("Onboarding GET error:", error)
    return NextResponse.json({ error: "Failed to fetch onboarding data" }, { status: 500 })
  }
}
