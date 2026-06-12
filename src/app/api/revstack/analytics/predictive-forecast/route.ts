import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("organizationId") || undefined
  const months = Math.min(Math.max(Number(searchParams.get("months")) || 3, 1), 12)

  const where: Record<string, any> = {}
  if (orgId) where.organizationId = orgId

  const now = new Date()
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [recentClients, recentLeads, recentInvoices] = await Promise.all([
    prisma.client.count({ where }),
    prisma.lead.count({ where: { ...where, createdAt: { gte: start } } }),
    prisma.invoice.findMany({
      where: { ...where, issuedAt: { gte: start } },
      select: { amountUsd: true, status: true, issuedAt: true },
    }),
  ])

  const monthlyInvoices = new Map<string, { total: number; collected: number }>()
  for (const inv of recentInvoices) {
    const month = inv.issuedAt.toISOString().slice(0, 7)
    const existing = monthlyInvoices.get(month) || { total: 0, collected: 0 }
    existing.total += inv.amountUsd
    if (inv.status === "paid") existing.collected += inv.amountUsd
    monthlyInvoices.set(month, existing)
  }

  const monthlySeries = Array.from(monthlyInvoices.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)

  const avgMonthly = monthlySeries.length > 0
    ? monthlySeries.reduce((s, [, v]) => s + v.collected, 0) / monthlySeries.length
    : 0

  const leadToClientRate = recentClients > 0 ? recentLeads / recentClients : 0
  const forecast = Array.from({ length: months }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() + i + 1, 1).toISOString().slice(0, 7)
    const growth = 1 + Math.min(i * 0.05, 0.5)
    return {
      month,
      projected: Math.round(avgMonthly * growth),
      confidence: Math.max(60 - i * 5, 40),
    }
  })

  return NextResponse.json({
    periodMonths: months,
    recentClients,
    recentLeads,
    avgMonthly,
    leadToClientRate,
    forecast,
    generatedAt: new Date().toISOString(),
  })
})
