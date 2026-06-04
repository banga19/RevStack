import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { appendOnboardingRow } from "@/lib/google-sheets"
import { getSuggestionFromBudget } from "@/lib/pricing"

// Server-side analytics logging
function logEvent(event: string, data: Record<string, any>) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Analytics] ${event}:`, data)
  }
}

export const POST = withAuth(async (req: NextRequest, { session }) => {
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

  // Save onboarding response
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

  // Reset trial dates so the 14-day free trial starts NOW (after onboarding completion)
  const trialStart = new Date()
  const trialEnd = new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000)
  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      trialStartsAt: trialStart,
      trialEndsAt: trialEnd,
    },
  })

  // Track onboarding completion
  logEvent("onboarding_completed", {
    userId: dbUser.id,
    businessName: body.businessName,
    industry: body.industry,
    primaryGoal: body.primaryGoal,
    budgetRange: body.budgetRange,
    suggestedTier,
    trialStartsNow: true,
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
})

export const GET = withAuth(async (_req, { session }) => {
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
})
