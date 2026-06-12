import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (_req, { session }) => {
  const userId = session.user.id as string

  // ── 1. Revenue Forecast ──────────────────────────────────────
  // Fetch actual retainer revenue history + compute projections
  const [activeRetainers, invoices, revenueEntries, allLeads, allClients] = await Promise.all([
    prisma.retainer.findMany({
      where: { userId, status: "active" },
      select: { amountUsd: true, billingCycle: true, startDate: true },
    }),
    prisma.invoice.findMany({
      where: { userId },
      select: { amountUsd: true, status: true, issuedAt: true },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.revenueEntry.findMany({
      where: { clientName: { not: null } },
      select: { amount: true, date: true, type: true },
      orderBy: { date: "asc" },
    }),
    prisma.lead.findMany({ where: { userId }, select: { status: true, createdAt: true } }),
    prisma.client.findMany({
      where: { userId },
      select: { status: true, monthlyRetainer: true, createdAt: true },
    }),
  ])

  // Build monthly revenue history (actual + from retainers)
  const now = new Date()
  const monthsToShow = 9 // 6 past + 3 projected
  const monthlyData: Array<{
    month: string
    label: string
    actual: number
    projected: number
    newClients: number
    invoices: number
  }> = []

  for (let i = monthsToShow - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" })
    const isProjected = i <= 2 // Last 3 months are projections

    // Actual retainer revenue for this month
    const retainerRevenue = activeRetainers.reduce((sum, r) => {
      const start = new Date(r.startDate)
      if (start <= nextMonth) {
        const monthlyAmount = r.billingCycle === "monthly" ? r.amountUsd
          : r.billingCycle === "quarterly" ? r.amountUsd / 3
          : r.billingCycle === "annual" ? r.amountUsd / 12
          : r.amountUsd
        return sum + monthlyAmount
      }
      return sum
    }, 0)

    // Actual invoice revenue for past months
    const invoiceRevenue = invoices
      .filter((inv) => {
        const invDate = new Date(inv.issuedAt)
        return invDate >= d && invDate <= nextMonth && inv.status !== "cancelled"
      })
      .reduce((sum, inv) => sum + inv.amountUsd, 0)

    // Revenue entry amount for this month
    const entryRevenue = revenueEntries
      .filter((e) => {
        const eDate = new Date(e.date)
        return eDate >= d && eDate <= nextMonth
      })
      .reduce((sum, e) => sum + e.amount, 0)

    // New clients this month
    const newClients = allClients.filter((c) => {
      const cd = new Date(c.createdAt)
      return cd >= d && cd <= nextMonth
    }).length

    const actualRevenue = Math.round((retainerRevenue + invoiceRevenue + entryRevenue) * 100) / 100

    // For projected months, compute a simple trend projection
    let projectedRevenue = actualRevenue
    if (isProjected) {
      // Use the average of the last 3 actual months as projection
      const actualMonths = monthlyData.filter((m) => !m.projected).slice(-3)
      const avgActual = actualMonths.length > 0
        ? actualMonths.reduce((s, m) => s + m.actual, 0) / actualMonths.length
        : actualRevenue
      // Add a small growth factor (5% annual = 0.4% monthly)
      const growthFactor = 1 + (i === 0 ? 0.004 : i === 1 ? 0.008 : 0.012)
      projectedRevenue = Math.round(avgActual * growthFactor * 100) / 100
    }

    monthlyData.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label,
      actual: isProjected ? 0 : actualRevenue,
      projected: isProjected ? projectedRevenue : 0,
      newClients,
      invoices: isProjected ? 0 : invoiceRevenue,
    })
  }

  // ── 2. Pipeline Velocity Metrics ─────────────────────────────
  const [followups, messages] = await Promise.all([
    prisma.followup.findMany({
      where: {
        OR: [
          { lead: { userId } },
          { client: { userId } },
        ],
      },
      select: { status: true, createdAt: true },
    }),
    prisma.message.findMany({
      where: { lead: { userId } },
      select: { status: true, createdAt: true },
    }),
  ])

  // Leads that converted to clients
  const convertedLeads = allLeads.filter((l) => l.status === "converted")
  const conversionTimes = convertedLeads.map((l) => {
    const client = allClients.find((c) => c.createdAt > l.createdAt)
    if (!client) return null
    return Math.round((client.createdAt.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  }).filter((d): d is number => d !== null)

  const avgConversionDays = conversionTimes.length > 0
    ? Math.round(conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length * 10) / 10
    : null

  const totalFollowups = followups.length
  const repliedFollowups = followups.filter((f) => f.status === "replied").length
  const responseRate = totalFollowups > 0 ? Math.round((repliedFollowups / totalFollowups) * 1000) / 10 : 0

  // ── 3. Client Health Distribution ────────────────────────────
  const scoredClients = await prisma.client.findMany({
    where: {
      userId,
      status: { in: ["active", "onboarding", "qualified"] },
    },
    include: {
      retainers: { where: { status: "active" }, select: { amountUsd: true, billingCycle: true } },
      complianceRecords: { select: { status: true, expiresAt: true } },
      followups: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      invoices: {
        where: { status: "paid" },
        select: { amountUsd: true, paidAt: true },
        orderBy: { paidAt: "desc" },
        take: 3,
      },
    },
  })

  const healthResults: Array<{
    id: string
    name: string
    company: string
    score: number
    tier: string
    scoreFactors: { revenue: number; engagement: number; compliance: number; status: number; tenure: number }
    retainerValue: number
    lastInvoiceDate: string | null
  }> = []

  let healthyCount = 0
  let mediumCount = 0
  let riskCount = 0

  for (const c of scoredClients) {
    const retainerValue = c.retainers.reduce((s, r) => s + r.amountUsd, 0)
    const revenueScore = Math.min(30, Math.round(retainerValue / 100))

    const lastFp = c.followups[0]?.createdAt
    const daysSinceContact = lastFp
      ? Math.round((now.getTime() - new Date(lastFp).getTime()) / (1000 * 60 * 60 * 24))
      : 999
    const engagementScore = daysSinceContact < 7 ? 25 : daysSinceContact < 14 ? 18 : daysSinceContact < 30 ? 10 : daysSinceContact < 60 ? 5 : 0

    const obtained = c.complianceRecords.filter((r) => r.status === "obtained")
    const expiring = obtained.filter((r) => r.expiresAt && new Date(r.expiresAt) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
    const complianceScore = c.complianceRecords.length === 0 ? 10
      : expiring.length === 0 && obtained.length > 0 ? 20
      : expiring.length <= obtained.length / 2 ? 15 : 5

    const statusScore = c.status === "active" ? 15 : c.status === "onboarding" ? 8 : c.status === "qualified" ? 5 : 0
    const daysSinceCreated = Math.round((now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    const tenureScore = daysSinceCreated > 365 ? 10 : daysSinceCreated > 180 ? 8 : daysSinceCreated > 90 ? 6 : daysSinceCreated > 30 ? 4 : 2

    const total = revenueScore + engagementScore + complianceScore + statusScore + tenureScore
    const tier = total >= 70 ? "healthy" : total >= 45 ? "medium" : "at-risk"
    if (tier === "healthy") healthyCount++
    else if (tier === "medium") mediumCount++
    else riskCount++

    healthResults.push({
      id: c.id, name: c.name, company: c.company,
      score: total, tier,
      scoreFactors: { revenue: revenueScore, engagement: engagementScore, compliance: complianceScore, status: statusScore, tenure: tenureScore },
      retainerValue,
      lastInvoiceDate: c.invoices[0]?.paidAt?.toISOString() || null,
    })
  }

  return NextResponse.json({
    forecast: {
      monthly: monthlyData,
      currentMrr: Math.round(activeRetainers.reduce((s, r) => {
        if (r.billingCycle === "monthly") return s + r.amountUsd
        if (r.billingCycle === "quarterly") return s + r.amountUsd / 3
        if (r.billingCycle === "annual") return s + r.amountUsd / 12
        return s
      }, 0) * 100) / 100,
      projectedMrr: monthlyData.filter((m) => m.projected > 0).pop()?.projected || 0,
      totalInvoiced: Math.round(invoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + i.amountUsd, 0) * 100) / 100,
      paidInvoiced: Math.round(invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amountUsd, 0) * 100) / 100,
      outstanding: Math.round(invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.amountUsd, 0) * 100) / 100,
    },
    pipeline: {
      totalLeads: allLeads.length,
      byStage: {
        new: allLeads.filter((l) => l.status === "new").length,
        qualified: allLeads.filter((l) => l.status === "qualified").length,
        disqualified: allLeads.filter((l) => l.status === "disqualified").length,
        converted: allLeads.filter((l) => l.status === "converted").length,
      },
      conversionRate: allLeads.length > 0
        ? Math.round((allLeads.filter((l) => l.status === "converted").length / allLeads.length) * 1000) / 10
        : 0,
      avgConversionDays,
      totalFollowups,
      responseRate,
      totalMessages: messages.length,
      activeClients: allClients.filter((c) => c.status === "active").length,
    },
    clientHealth: {
      scored: healthResults,
      healthyCount,
      mediumCount,
      riskCount,
      totalScored: healthResults.length,
      averageScore: healthResults.length > 0
        ? Math.round(healthResults.reduce((s, c) => s + c.score, 0) / healthResults.length)
        : 0,
    },
  })
})
