import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { TIERS, suggestTierFromOnboarding, type TierId } from "@/lib/pricing"

// TierId type imported from @/lib/pricing
// TIERS definitions imported from @/lib/pricing
// suggestTierFromOnboarding imported from @/lib/pricing

// suggestTierFromOnboarding is now imported from @/lib/pricing

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

    // All users now have full Enterprise access for free with God Mode included.
    // The subscription endpoint returns this as the default status.

    // Get onboarding data for plan suggestion (informational only)
    const onboarding = user.onboardingResponses[0]
    let suggestedTier: TierId = "enterprise"
    let suggestionConfidence = "high"
    let suggestionReasoning = "Full Enterprise access — free for all users"

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

    // Default to active enterprise if user's actual status is trial/expired
    const effectiveStatus = user.subscriptionStatus === "active" ? user.subscriptionStatus : "active"
    const effectiveTier = user.subscriptionTier || "enterprise"

    return NextResponse.json({
      trial: {
        startedAt: null,
        endsAt: null,
        daysRemaining: 365,
        isExpired: false,
        isActive: true,
      },
      subscription: {
        status: effectiveStatus,
        tier: effectiveTier,
        plan: user.subscriptionPlan || "monthly",
        startedAt: user.subscriptionStartsAt?.toISOString() || new Date().toISOString(),
        endsAt: null,
        billingEmail: user.billingEmail || user.email,
      },
      tiers: TIERS,
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
