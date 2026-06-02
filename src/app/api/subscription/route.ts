import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// ============================================================
// Plan/Tier definitions
// ============================================================

const TIERS = {
  starter: {
    id: "starter",
    name: "Starter",
    monthlyPrice: 50,
    yearlyPrice: 500, // 2 months free
    successFee: 0.10,
    godModeRate: 19,
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthlyPrice: 200,
    yearlyPrice: 2000, // 2 months free
    successFee: 0.15,
    godModeRate: 14,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 500,
    yearlyPrice: 5000, // 2 months free
    successFee: 0.20,
    godModeRate: 0, // free
  },
} as const

type TierId = keyof typeof TIERS

// ============================================================
// Suggest plan based on onboarding data
// ============================================================

function suggestTierFromOnboarding(onboarding: {
  businessName?: string
  industry?: string
  companySize?: string
  primaryGoal?: string
  servicesNeeded?: string
  budgetRange?: string
}): { tierId: TierId; confidence: string; reasoning: string } {
  const budget = onboarding.budgetRange || ""

  // Budget-based suggestion (primary signal)
  const budgetToTier: Record<string, TierId> = {
    "under-1000": "starter",
    "1000-2500": "growth",
    "2500-5000": "enterprise",
    "5000-10000": "enterprise",
    "10000+": "enterprise",
    "not-sure": "starter",
  }

  const budgetTier = budgetToTier[budget] || "starter"

  // Company size signals
  const sizeSignals: Record<string, TierId> = {
    "1": "starter",
    "2-10": "starter",
    "11-50": "growth",
    "51-200": "enterprise",
    "201+": "enterprise",
  }

  // Tier priority for combining signals
  const tierPriority: Record<string, number> = { starter: 1, growth: 2, enterprise: 3 }

  // Combine signals
  let tierId: TierId = budgetTier
  let reasoning = `Based on your budget range`

  if (onboarding.companySize && sizeSignals[onboarding.companySize]) {
    const sizeTier = sizeSignals[onboarding.companySize]
    // Use the higher tier between budget and company size
    if (tierPriority[sizeTier] > tierPriority[tierId]) {
      tierId = sizeTier
      reasoning += ` and company size (${onboarding.companySize} employees)`
    }
  }

  // Services signals
  if (onboarding.servicesNeeded) {
    const premiumServices = ["full-stack-automation", "consulting"]
    if (premiumServices.includes(onboarding.servicesNeeded)) {
      tierId = tierPriority[tierId] < 3 ? "growth" : tierId
      reasoning += ` and selected service (${onboarding.servicesNeeded.replace(/-/g, " ")})`
    }
  }

  const confidence = onboarding.budgetRange ? "high" : "medium"

  return { tierId, confidence, reasoning }
}

// ============================================================
// GET — Get trial/subscription status for current user
// ============================================================

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // Calculate trial status
    const now = new Date()
    const trialStart = user.trialStartsAt || user.createdAt
    const trialEnd = user.trialEndsAt || new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000)
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const isTrialExpired = daysRemaining <= 0 && user.subscriptionStatus === "trial"

    // Get onboarding data for plan suggestion
    const onboarding = user.onboardingResponses[0]
    let suggestedTier: TierId = "starter"
    let suggestionConfidence = "medium"
    let suggestionReasoning = "Default suggestion"

    if (onboarding) {
      // Convert null fields to undefined to match function signature
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
      // Trial info
      trial: {
        startedAt: trialStart.toISOString(),
        endsAt: trialEnd.toISOString(),
        daysRemaining,
        isExpired: isTrialExpired,
        isActive: !isTrialExpired && user.subscriptionStatus === "trial",
      },
      // Subscription info
      subscription: {
        status: user.subscriptionStatus,
        tier: user.subscriptionTier || suggestedTier,
        plan: user.subscriptionPlan,
        startedAt: user.subscriptionStartsAt?.toISOString() || null,
        endsAt: user.subscriptionEndsAt?.toISOString() || null,
        billingEmail: user.billingEmail || user.email,
      },
      // Available tiers
      tiers: TIERS,
      // Suggested plan based on onboarding
      suggestedTier: {
        ...TIERS[suggestedTier],
        confidence: suggestionConfidence,
        reasoning: suggestionReasoning,
      },
    })
  } catch (error) {
    console.error("Subscription GET error:", error)
    return NextResponse.json({ error: "Failed to fetch subscription data" }, { status: 500 })
  }
}

// ============================================================
// POST — Subscribe to a plan (after trial or change plan)
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { tier, plan } = body

    if (!tier || !["starter", "growth", "enterprise"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier. Must be: starter, growth, or enterprise" }, { status: 400 })
    }

    if (!plan || !["monthly", "yearly"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan. Must be: monthly or yearly" }, { status: 400 })
    }

    const now = new Date()

    // Calculate subscription end date
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
        // If user was on trial, keep trial dates for reference
        trialEndsAt: now, // trial technically ends when subscription starts
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
  } catch (error) {
    console.error("Subscription POST error:", error)
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
  }
}

// ============================================================
// PATCH — Update trial/subscription settings
// ============================================================

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const updateData: Record<string, any> = {}

    // Update billing email
    if (body.billingEmail) {
      updateData.billingEmail = body.billingEmail
    }

    // Change plan (monthly <-> yearly)
    if (body.plan && ["monthly", "yearly"].includes(body.plan)) {
      updateData.subscriptionPlan = body.plan
    }

    // Change tier
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
  } catch (error) {
    console.error("Subscription PATCH error:", error)
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
  }
}

// ============================================================
// DELETE — Cancel subscription
// ============================================================

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionStatus: "canceled",
        subscriptionEndsAt: new Date(), // immediately
      },
    })

    return NextResponse.json({ message: "Subscription canceled" })
  } catch (error) {
    console.error("Subscription DELETE error:", error)
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 })
  }
}
