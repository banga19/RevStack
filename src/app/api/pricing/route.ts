import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { getTierFromBudget, TIERS } from "@/lib/pricing"

export const GET = withAuth(async (_req, { session }) => {
  // Define pricing tiers — Polsia-inspired model: base subscription + success fee
  const pricingTiers = [
    {
      id: "starter",
      name: TIERS.starter.name,
      description: "For solo traders and small teams getting started with AI automation",
      monthlyPrice: TIERS.starter.monthlyPrice,
      successFee: TIERS.starter.successFee,
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
      name: TIERS.growth.name,
      description: "For growing trading companies scaling their operations",
      monthlyPrice: TIERS.growth.monthlyPrice,
      successFee: TIERS.growth.successFee,
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
      name: TIERS.enterprise.name,
      description: "Full-featured solution for established trading businesses",
      monthlyPrice: TIERS.enterprise.monthlyPrice,
      successFee: TIERS.enterprise.successFee,
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
        contacts: -1,
        automationWorkflows: -1,
        teamMembers: -1
      }
    }
  ]

  const onboarding = await prisma.onboardingResponse.findFirst({
    where: { userId: session.user.id, completed: true },
    orderBy: { createdAt: "desc" }
  })

  const suggestedTier = onboarding?.budgetRange
    ? getTierFromBudget(onboarding.budgetRange)
    : "starter"

  return NextResponse.json({
    tiers: pricingTiers,
    suggestedTier
  })
})
