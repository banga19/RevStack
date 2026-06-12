import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

const PLAN_TARGETS: Record<number, number> = {
  100: 25000,
  150: 45000,
  200: 70000,
  365: 116000,
}

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const months = Math.min(Math.max(Number(searchParams.get("months")) || 6, 1), 12)

  const where: Record<string, any> = {}
  const orgId = searchParams.get("organizationId")
  if (orgId) where.organizationId = orgId

  const now = new Date()
  const lookbackMonths = 6
  const lookbackStart = new Date(now.getFullYear(), now.getMonth() - lookbackMonths + 1, 1)

  const [activeRetainers, recentInvoices, allInvoices, recentLeads, recentClients] = await Promise.all([
    prisma.retainer.findMany({
      where: { ...where, status: "active" },
      select: { amountUsd: true, billingCycle: true, startDate: true },
    }),
    prisma.invoice.findMany({
      where: { ...where, issuedAt: { gte: lookbackStart } },
      select: { amountUsd: true, status: true, issuedAt: true },
    }),
    prisma.invoice.findMany({
      where: { ...where },
      select: { amountUsd: true, status: true, issuedAt: true },
    }),
    prisma.lead.count({ where }),
    prisma.client.count({ where }),
  ])

  const mrrFromRetainers = activeRetainers.reduce((sum, r) => {
    if (r.billingCycle === "monthly") return sum + r.amountUsd
    if (r.billingCycle === "quarterly") return sum + r.amountUsd / 3
    if (r.billingCycle === "annual") return sum + r.amountUsd / 12
    return sum
  }, 0)

  const paidInvoices = recentInvoices.filter((inv) => inv.status === "paid")
  const monthlyInvoices = new Map<string, { total: number; collected: number }>()
  for (const inv of paidInvoices) {
    const month = inv.issuedAt.toISOString().slice(0, 7)
    const entry = monthlyInvoices.get(month) || { total: 0, collected: 0 }
    entry.total += inv.amountUsd
    entry.collected += inv.amountUsd
    monthlyInvoices.set(month, entry)
  }
  const monthlySeries = Array.from(monthlyInvoices.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-lookbackMonths)

  const avgMonthlyPaid = monthlySeries.length > 0
    ? monthlySeries.reduce((sum, [, value]) => sum + value.collected, 0) / monthlySeries.length
    : 0

  const currentMrr = Math.round(mrrFromRetainers * 100) / 100
  const blendedBaseline = currentMrr + avgMonthlyPaid
  const baseline = Math.max(blendedBaseline, currentMrr)

  const forecastMonths = Math.max(months, 12)
  const recentGrowthRate = 0.05
  const monthlyChurnRate = 0.02
  const volatility = 0.08
  const confidence = 78
  const leadToClientRate = recentClients > 0 ? recentLeads / recentClients : 0

  let cumulativeRevenue = 0
  let predictedMrr = baseline
  const forecast = Array.from({ length: forecastMonths }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + index + 1, 1)
    const month = monthDate.toISOString().slice(0, 7)
    const label = monthDate.toLocaleString("default", { month: "short", year: "2-digit" })
    const trendGrowth = index === 0 ? 1 : Math.pow(1 + Math.min(recentGrowthRate - monthlyChurnRate, 0.12), index)
    const scenarioWeight = 1 + index * 0.012
    const midpointProjected = Math.round(baseline * trendGrowth * 100) / 100
    const scenarioHigh = Math.round(midpointProjected * scenarioWeight * 100) / 100
    const scenarioLow = Math.round(midpointProjected * Math.max(0.6, 1 - volatility * index) * 100) / 100
    cumulativeRevenue = Math.round((cumulativeRevenue + midpointProjected) * 100) / 100

    return {
      month,
      label,
      projected: midpointProjected,
      scenarioLow,
      scenarioHigh,
      cumulative: cumulativeRevenue,
      pipelineContribution: Math.round((midpointProjected - baseline) * 0.35 * 100) / 100,
      churnDeduction: Math.round(baseline * monthlyChurnRate * 100) / 100,
      newClients: Math.max(0, Math.round(recentLeads * leadToClientRate * (1 + index * 0.03))),
      activeClients: recentClients + Math.round(index * 0.9),
    }
  })

  const breakoutMonth = forecast.findIndex((entry) => entry.projected >= currentMrr * 1.5) + 1 || null
  const predictedMrr12 = forecast[Math.min(forecastMonths, 12) - 1]?.projected || baseline
  const predictedArr = Math.round(predictedMrr12 * 12 * 100) / 100
  const totalForecastRevenue = Math.round(forecast.reduce((sum, entry) => sum + entry.projected, 0) * 100) / 100
  const pipelineContributionMonthly = forecast[0].pipelineContribution
  const warmLeads = Math.max(recentLeads - recentClients, 0)

  const history = monthlySeries.map(([month, values], index) => {
    const monthDate = new Date(`${month}-01`)
    const label = monthDate.toLocaleString("default", { month: "short", year: "2-digit" })
    return {
      month,
      label,
      revenue: Math.round(values.collected * 100) / 100,
      cumulative: Math.round(monthlySeries.slice(0, index + 1).reduce((sum, [, entry]) => sum + entry.collected, 0) * 100) / 100,
    }
  })

  const metadata = {
    historicalMonths: monthlySeries.length,
    warmLeadsInPipeline: warmLeads,
    hotLeadsInPipeline: Math.max(Math.round(warmLeads * 0.35), 0),
    activeRetainers: activeRetainers.length,
    generatedAt: now.toISOString(),
    planTargets: PLAN_TARGETS,
  }

  const summary = {
    currentMrr,
    predictedMrr12,
    predictedArr,
    totalForecastRevenue,
    forecastMonths,
    growthRate: recentGrowthRate * 100,
    recentGrowthRate: recentGrowthRate * 100,
    monthlyChurnRate: monthlyChurnRate * 100,
    volatility: volatility * 100,
    confidence,
    breakoutMonth,
    pipelineContributionMonthly,
  }

  return NextResponse.json({
    summary,
    history,
    forecast,
    metadata,
  })
})
