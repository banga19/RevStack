import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Define pricing tiers — Polsia-inspired model: base subscription + success fee
    const pricingTiers = [
      {
        id: "starter",
        name: "Starter",
        description: "For solo traders and small teams getting started with AI automation",
        monthlyPrice: 50,
        successFee: 0.10, // 10% success fee on revenue generated
        successFeeLabel: "10% success fee",
        features: [
          "Basic lead qualification chatbot (Voiceflow + WhatsApp)",
          "Email & WhatsApp follow-up sequences (WATI.io + Instantly)",
          "Pipeline CRM with lead scoring",
          "Monthly performance reporting",
          "Up to 500 contacts",
          "Community support"
        ],
        limits: {
          contacts: 500,
          automationWorkflows: 3,
          teamMembers: 1
        }
      },
      {
        id: "growth",
        name: "Growth",
        description: "For growing trading companies scaling their operations",
        monthlyPrice: 200,
        successFee: 0.15, // 15% success fee
        successFeeLabel: "15% success fee",
        features: [
          "Advanced lead scoring & routing (AI-powered)",
          "Multi-channel automation (WhatsApp, Email, LinkedIn)",
          "Custom automation workflow builder (Make.com)",
          "Revenue forecasting & predictive analytics",
          "Trade compliance & certification tracking",
          "Up to 5,000 contacts",
          "Priority support",
          "Dedicated account manager"
        ],
        limits: {
          contacts: 5000,
          automationWorkflows: 10,
          teamMembers: 3
        }
      },
      {
        id: "enterprise",
        name: "Enterprise",
        description: "Full-featured solution for established trading businesses",
        monthlyPrice: 500,
        successFee: 0.20, // 20% success fee
        successFeeLabel: "20% success fee",
        features: [
          "Enterprise-grade AI automation & orchestration",
          "Omnichannel engagement platform",
          "AI-powered predictive trade analytics",
          "Custom integrations & full API access",
          "Trade finance application management (AfDB/AFAWA)",
          "Export Readiness Scoring (ERS) framework",
          "Unlimited contacts",
          "Unlimited workflows",
          "Unlimited team members",
          "24/7 premium support",
          "Dedicated customer success manager",
          "SLA guarantees"
        ],
        limits: {
          contacts: -1, // unlimited
          automationWorkflows: -1, // unlimited
          teamMembers: -1 // unlimited
        }
      }
    ]

    // Get user's onboarding data to suggest a tier
    const onboarding = await prisma.onboardingResponse.findFirst({
      where: { userId: session.user.id, completed: true },
      orderBy: { createdAt: "desc" }
    })

    let suggestedTier = "starter" // default
    if (onboarding?.budgetRange) {
      // Map budget ranges to suggested tiers
      const budgetToTier: Record<string, string> = {
        "under-1000": "starter",
        "1000-2500": "growth",
        "2500-5000": "enterprise",
        "5000-10000": "enterprise",
        "10000+": "enterprise",
        "not-sure": "starter"
      }
      suggestedTier = budgetToTier[onboarding.budgetRange] || "starter"
    }

    return NextResponse.json({
      tiers: pricingTiers,
      suggestedTier
    })
  } catch (error) {
    console.error("Pricing API error:", error)
    return NextResponse.json({ error: "Failed to fetch pricing data" }, { status: 500 })
  }
}