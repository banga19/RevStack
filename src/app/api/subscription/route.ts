import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { TIERS, suggestTierFromOnboarding, type TierId } from "@/lib/pricing"

export const GET = withAuth(async (_req, { session }) => {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      onboardingResponses: {
        where: { completed: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const now = new Date()
  const trialStart = user.trialStartsAt || user.createdAt
  const trialEnd = user.trialEndsAt || new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000)
  const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const isTrialExpired = daysRemaining <= 0 && user.subscriptionStatus === "trial"

  const onboarding = user.onboardingResponses[0]
  let suggestedTier: TierId = "starter"
  let suggestionConfidence = "medium"
  let suggestionReasoning = "Default suggestion"

  if (onboarding) {
    const onboardingClean = {
      businessName: onboarding.businessName ?? undefined,
      industry: onboarding.industry ?? undefined,
      companySize: onboarding.companySize ?? undefined,
      primaryGoal: onboarding.primaryGoal ?? undefined,
      servicesNeeded: onboarding.servicesNeeded ?? undefined,
      budgetRange: onboarding.budgetRange ?? undefined,
    }
    const suggestion = suggestTierFromOnboarding(onboardingClean)
    suggestedTier = suggestion.tierId
    suggestionConfidence = suggestion.confidence
    suggestionReasoning = suggestion.reasoning
  }

  return NextResponse.json({
    trial: {
      startedAt: trialStart.toISOString(),
      endsAt: trialEnd.toISOString(),
      daysRemaining,
      isExpired: isTrialExpired,
      isActive: !isTrialExpired && user.subscriptionStatus === "trial",
    },
    subscription: {
      status: user.subscriptionStatus,
      tier: user.subscriptionTier || suggestedTier,
      plan: user.subscriptionPlan,
      startedAt: user.subscriptionStartsAt?.toISOString() || null,
      endsAt: user.subscriptionEndsAt?.toISOString() || null,
      billingEmail: user.billingEmail || user.email,
    },
    tiers: TIERS,
    suggestedTier: {
      ...TIERS[suggestedTier],
      confidence: suggestionConfidence,
      reasoning: suggestionReasoning,
    },
  })
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()
  const { tier, plan } = body

  if (!tier || !["starter", "growth", "enterprise"].includes(tier)) {
    return NextResponse.json({ error: "Invalid tier. Must be: starter, growth, or enterprise" }, { status: 400 })
  }

  if (!plan || !["monthly", "yearly"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan. Must be: monthly or yearly" }, { status: 400 })
  }

  const now = new Date()
  const subscriptionEnd = new Date(now)
  if (plan === "monthly") {
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1)
  } else {
    subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1)
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      subscriptionStatus: "active",
      subscriptionTier: tier,
      subscriptionPlan: plan,
      subscriptionStartsAt: now,
      subscriptionEndsAt: subscriptionEnd,
      trialEndsAt: now,
    },
  })

  return NextResponse.json({
    message: `Subscribed to ${tier} (${plan})`,
    subscription: {
      status: updatedUser.subscriptionStatus,
      tier: updatedUser.subscriptionTier,
      plan: updatedUser.subscriptionPlan,
      startedAt: updatedUser.subscriptionStartsAt?.toISOString(),
      endsAt: updatedUser.subscriptionEndsAt?.toISOString(),
    },
  })
})

export const PATCH = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()
  const updateData: Record<string, any> = {}

  if (body.billingEmail) {
    updateData.billingEmail = body.billingEmail
  }

  if (body.plan && ["monthly", "yearly"].includes(body.plan)) {
    updateData.subscriptionPlan = body.plan
  }

  if (body.tier && ["starter", "growth", "enterprise"].includes(body.tier)) {
    updateData.subscriptionTier = body.tier
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  })

  return NextResponse.json({
    message: "Subscription updated",
    subscription: {
      status: updatedUser.subscriptionStatus,
      tier: updatedUser.subscriptionTier,
      plan: updatedUser.subscriptionPlan,
      billingEmail: updatedUser.billingEmail || updatedUser.email,
    },
  })
})

export const DELETE = withAuth(async (_req, { session }) => {
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      subscriptionStatus: "canceled",
      subscriptionEndsAt: new Date(),
    },
  })

  return NextResponse.json({ message: "Subscription canceled" })
})
