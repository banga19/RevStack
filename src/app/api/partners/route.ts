import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

// ── Partner Tiers (static for MVP) ─────────────────────────
export const PARTNER_TIERS = [
  {
    id: "affiliate",
    name: "Affiliate",
    commission: 0.15,
    description: "Refer clients via unique link — earn 15% commission on first 3 months",
    requirements: "Active user with valid payment method",
    badgeColor: "bg-blue-500/10 text-blue-600",
  },
  {
    id: "reseller",
    name: "Reseller",
    commission: 0.25,
    description: "Resell Mapato to your network — earn 25% recurring commission",
    requirements: "Min 5 referrals OR active subscription for 6+ months",
    badgeColor: "bg-violet-500/10 text-violet-600",
  },
  {
    id: "agency",
    name: "Agency Partner",
    commission: 0.30,
    description: "Full white-label integration — earn 30% + volume bonuses",
    requirements: "Min 20 clients onboarded, dedicated support SLAs",
    badgeColor: "bg-amber-500/10 text-amber-600",
  },
]

export const GET = withAuth(async (_req: NextRequest) => {
  const partnersRaw = await prisma.user.findMany({
    where: { role: { not: "admin" }, subscriptionStatus: { not: "expired" } },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          clients: true,
          payments: true,
          leads: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const partners = partnersRaw.map((u) => {
    const totalClients = u._count.clients
    let tierId = "affiliate"
    let eligibleForUpgrade = false

    if (totalClients >= 20) {
      tierId = "agency"
    } else if (totalClients >= 5) {
      tierId = "reseller"
      eligibleForUpgrade = totalClients < 20
    } else {
      eligibleForUpgrade = totalClients >= 5
    }

    const tier = PARTNER_TIERS.find((t) => t.id === tierId)!

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      joinedAt: u.createdAt.toISOString(),
      tier,
      tierId,
      totalClients,
      totalPayments: u._count.payments,
      totalLeads: u._count.leads,
      estimatedEarnings: Math.round(totalClients * 200 * tier.commission),
      eligibleForUpgrade,
    }
  })

  return NextResponse.json({
    tiers: PARTNER_TIERS,
    partners,
    summary: {
      totalPartners: partners.length,
      affiliates: partners.filter((p) => p.tierId === "affiliate").length,
      resellers: partners.filter((p) => p.tierId === "reseller").length,
      agencies: partners.filter((p) => p.tierId === "agency").length,
      totalEstimatedEarnings: partners.reduce((s, p) => s + p.estimatedEarnings, 0),
    },
  })
})
