/**
 * Client Reporting Engine
 *
 * Aggregates lead volume, conversion rates, pipeline velocity, and revenue
 * attribution data scoped to an organization. Used by the reports API endpoint
 * and the cron-scheduled email report delivery system.
 *
 * Data sources:
 *   - Lead (volume, status distribution, qualification scores)
 *   - Client (conversion rates, tier distribution, retainer revenue)
 *   - Retainer (monthly recurring revenue, billing cycles)
 *   - Invoice (paid vs overdue revenue attribution)
 *   - Followup (outreach velocity)
 *   - Message (communication volume)
 *   - FinancialSnapshot / RevenueEntry (historical revenue)
 */

import { prisma } from "@/lib/db"
import type { OrgScope } from "@/lib/get-org-scope"

// ── Types ───────────────────────────────────────────────────────────────────

export type ReportPeriod = "weekly" | "monthly" | "quarterly"

export interface ReportPeriodRange {
  start: Date
  end: Date
  label: string
  previousStart: Date // same-length period immediately before start
}

export interface LeadVolumeReport {
  total: number
  byStatus: Record<string, number>
  byDay: Array<{ date: string; count: number }>
  averageScore: number
  qualifiedCount: number
  conversionRate: number // leads converted to clients
}

export interface ConversionReport {
  totalLeads: number
  totalClients: number
  overallRate: number // clients / leads
  leadsToQualified: number // qualified leads
  qualifiedToClient: number
  averageDaysToConvert: number | null
  byStatus: Record<string, number>
}

export interface PipelineVelocityReport {
  averageDaysToQualify: number | null
  averageDaysToConvert: number | null
  averageDaysFromLeadToClient: number | null
  totalOutreachSent: number
  totalFollowups: number
  responseRate: number | null // followups with status "replied" / total sent
}

export interface RevenueAttributionReport {
  totalMonthlyRecurring: number
  totalInvoiced: number
  totalCollected: number // invoices with status "paid"
  outstanding: number // invoices with status "sent" or "overdue"
  byClient: Array<{ clientName: string; monthlyRetainer: number; totalInvoiced: number }>
  byTier: Record<string, { count: number; revenue: number }>
  revenueByMonth: Array<{ month: string; revenue: number; collected: number }>
}

export interface ClientReport {
  period: ReportPeriodRange
  leads: LeadVolumeReport
  conversions: ConversionReport
  pipeline: PipelineVelocityReport
  revenue: RevenueAttributionReport
  summary: string // AI-generated or template-based summary
  generatedAt: string
}

// ── Period Helpers ──────────────────────────────────────────────────────────

/**
 * Compute the date range for a given period type that ends today.
 */
export function getReportPeriod(period: ReportPeriod = "weekly"): ReportPeriodRange {
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  let start: Date
  const now = new Date()

  switch (period) {
    case "weekly": {
      // Last 7 days
      start = new Date(now)
      start.setDate(start.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      const prevEnd = new Date(start)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - 7)
      return {
        start,
        end,
        label: "This Week",
        previousStart: prevStart,
      }
    }
    case "monthly": {
      // Last 30 days
      start = new Date(now)
      start.setDate(start.getDate() - 30)
      start.setHours(0, 0, 0, 0)
      const prevEnd = new Date(start)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - 30)
      return {
        start,
        end,
        label: "This Month",
        previousStart: prevStart,
      }
    }
    case "quarterly": {
      // Last 90 days
      start = new Date(now)
      start.setDate(start.getDate() - 90)
      start.setHours(0, 0, 0, 0)
      const prevEnd = new Date(start)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - 90)
      return {
        start,
        end,
        label: "This Quarter",
        previousStart: prevStart,
      }
    }
  }
}

/**
 * Generate a human-readable label for a custom date range.
 */
export function formatPeriodLabel(period: ReportPeriod, start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${fmt(start)} – ${fmt(end)}`
}

// ── Org-Scoped Where Clause Builder ─────────────────────────────────────────

function orgLeadWhere(scope: OrgScope, start: Date, end: Date): Record<string, any> {
  const base: any = {
    createdAt: { gte: start, lte: end },
  }
  if (scope.isAdmin) return base
  if (scope.organizationId) {
    base.user = { organizationId: scope.organizationId }
  } else {
    base.userId = scope.userId
  }
  return base
}

function orgClientWhere(scope: OrgScope, start?: Date, end?: Date): Record<string, any> {
  const base: any = {}
  if (start && end) {
    base.createdAt = { gte: start, lte: end }
  }
  if (scope.isAdmin) return base
  if (scope.organizationId) {
    base.organizationId = scope.organizationId
  } else {
    base.userId = scope.userId
  }
  return base
}

function orgInvoiceWhere(scope: OrgScope, start?: Date, end?: Date): Record<string, any> {
  const base: any = {}
  if (start && end) {
    base.issuedAt = { gte: start, lte: end }
  }
  if (scope.isAdmin) return base
  if (scope.organizationId) {
    base.client = { organizationId: scope.organizationId }
  } else {
    base.userId = scope.userId
  }
  return base
}

function orgFollowupWhere(scope: OrgScope, start?: Date, end?: Date): Record<string, any> {
  const base: any = {}
  if (start && end) {
    base.scheduledAt = { gte: start, lte: end }
  }
  if (scope.isAdmin) return base
  if (scope.organizationId) {
    base.OR = [
      { lead: { user: { organizationId: scope.organizationId } } },
      { client: { organizationId: scope.organizationId } },
    ]
  } else {
    base.OR = [
      { lead: { userId: scope.userId } },
      { client: { userId: scope.userId } },
    ]
  }
  return base
}

function orgMessageWhere(scope: OrgScope, start?: Date, end?: Date): Record<string, any> {
  const base: any = {}
  if (start && end) {
    base.createdAt = { gte: start, lte: end }
  }
  if (scope.isAdmin) return base
  if (scope.organizationId) {
    base.OR = [
      { lead: { user: { organizationId: scope.organizationId } } },
      { client: { organizationId: scope.organizationId } },
    ]
  } else {
    base.lead = { userId: scope.userId }
  }
  return base
}

function orgRetainerWhere(scope: OrgScope, start?: Date, end?: Date): Record<string, any> {
  const base: any = {}
  if (scope.isAdmin) return base
  if (scope.organizationId) {
    base.client = { organizationId: scope.organizationId }
  } else {
    base.userId = scope.userId
  }
  return base
}

// ── Lead Volume Report ──────────────────────────────────────────────────────

async function buildLeadVolumeReport(
  scope: OrgScope,
  start: Date,
  end: Date,
  previousStart: Date
): Promise<LeadVolumeReport> {
  const where = orgLeadWhere(scope, start, end)

  const [total, byStatus, byDay, scores, conversions] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
    }),
    // Daily lead volume
    prisma.lead.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // Qualification scores
    prisma.lead.findMany({
      where: { ...where, qualificationScore: { not: null } },
      select: { qualificationScore: true, status: true },
    }),
    // Leads that converted to clients
    prisma.lead.count({
      where: { ...where, clientId: { not: null } },
    }),
  ])

  // Aggregate by day
  const dayMap = new Map<string, number>()
  for (const lead of byDay) {
    const day = lead.createdAt.toISOString().slice(0, 10)
    dayMap.set(day, (dayMap.get(day) || 0) + 1)
  }
  const byDayArray = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  // Status distribution
  const statusMap: Record<string, number> = {}
  for (const s of byStatus) {
    statusMap[s.status] = s._count.id
  }

  // Average score
  const scoresList = scores.map((s) => s.qualificationScore!).filter(Boolean)
  const averageScore = scoresList.length > 0
    ? scoresList.reduce((a, b) => a + b, 0) / scoresList.length
    : 0

  // Qualified count
  const qualifiedCount = scores.filter(
    (s) => s.status === "qualified" || s.status === "converted"
  ).length

  // Conversion rate (leads → clients)
  const conversionRate = total > 0 ? conversions / total : 0

  return {
    total,
    byStatus: statusMap,
    byDay: byDayArray,
    averageScore: Math.round(averageScore * 10) / 10,
    qualifiedCount,
    conversionRate: Math.round(conversionRate * 1000) / 1000,
  }
}

// ── Conversion Report ───────────────────────────────────────────────────────

async function buildConversionReport(
  scope: OrgScope,
  start: Date,
  end: Date
): Promise<ConversionReport> {
  const leadWhere = orgLeadWhere(scope, start, end)
  const clientWhere = orgClientWhere(scope, start, end)

  const [totalLeads, totalClients, qualifiedLeads, convertedLeads, allLeads] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.client.count({ where: clientWhere }),
    prisma.lead.count({ where: { ...leadWhere, status: { in: ["qualified", "converted"] } } }),
    prisma.lead.count({ where: { ...leadWhere, clientId: { not: null } } }),
    prisma.lead.findMany({
      where: { ...leadWhere, clientId: { not: null }, createdAt: { gte: start, lte: end } },
      select: { createdAt: true, client: { select: { createdAt: true } } },
    }),
  ])

  // Average days from lead to client
  let averageDaysToConvert: number | null = null
  if (allLeads.length > 0) {
    const days = allLeads
      .map((l) => {
        if (!l.client?.createdAt) return null
        return Math.abs(l.client.createdAt.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      })
      .filter((d): d is number => d !== null)
    if (days.length > 0) {
      averageDaysToConvert = Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10
    }
  }

  // Status distribution for the period
  const statusGroups = await prisma.lead.groupBy({
    by: ["status"],
    where: leadWhere,
    _count: { id: true },
  })
  const byStatus: Record<string, number> = {}
  for (const g of statusGroups) {
    byStatus[g.status] = g._count.id
  }

  return {
    totalLeads,
    totalClients,
    overallRate: totalLeads > 0 ? Math.round((totalClients / totalLeads) * 1000) / 1000 : 0,
    leadsToQualified: qualifiedLeads,
    qualifiedToClient: convertedLeads,
    averageDaysToConvert,
    byStatus,
  }
}

// ── Pipeline Velocity Report ────────────────────────────────────────────────

async function buildPipelineVelocityReport(
  scope: OrgScope,
  start: Date,
  end: Date
): Promise<PipelineVelocityReport> {
  const followupWhere = orgFollowupWhere(scope, start, end)
  const messageWhere = orgMessageWhere(scope, start, end)
  const leadWhere = orgLeadWhere(scope, start, end)

  const [followups, messages, leadsWithConversions, repliedFollowups] = await Promise.all([
    prisma.followup.count({ where: followupWhere }),
    prisma.message.count({ where: messageWhere }),
    prisma.lead.findMany({
      where: { ...leadWhere, clientId: { not: null } },
      select: { createdAt: true, client: { select: { createdAt: true } } },
    }),
    prisma.followup.count({ where: { ...followupWhere, status: "replied" } }),
  ])

  // Average days from lead to client
  let averageDaysToConvert: number | null = null
  if (leadsWithConversions.length > 0) {
    const days = leadsWithConversions
      .map((l) => {
        if (!l.client?.createdAt) return null
        return Math.abs(l.client.createdAt.getTime() - l.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      })
      .filter((d): d is number => d !== null)
    if (days.length > 0) {
      averageDaysToConvert = Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10
    }
  }

  // Response rate
  const responseRate = followups > 0 ? repliedFollowups / followups : null

  return {
    averageDaysToQualify: null, // Not directly trackable without status change timestamps
    averageDaysToConvert,
    averageDaysFromLeadToClient: averageDaysToConvert,
    totalOutreachSent: messages,
    totalFollowups: followups,
    responseRate: responseRate !== null ? Math.round(responseRate * 1000) / 1000 : null,
  }
}

// ── Revenue Attribution Report ──────────────────────────────────────────────

async function buildRevenueAttributionReport(
  scope: OrgScope,
  start: Date,
  end: Date,
  previousStart: Date
): Promise<RevenueAttributionReport> {
  const retainerWhere = orgRetainerWhere(scope)
  const invoiceWhere = orgInvoiceWhere(scope, start, end)

  const [activeRetainers, invoices, allRetainers] = await Promise.all([
    // Active retainers = current MRR
    prisma.retainer.findMany({
      where: { ...retainerWhere, status: "active" },
      select: { amountUsd: true, client: { select: { name: true, tier: true } } },
    }),
    // Invoices in period
    prisma.invoice.findMany({
      where: invoiceWhere,
      select: { amountUsd: true, status: true, client: { select: { name: true } } },
    }),
    // All retainers for tier breakdown
    prisma.retainer.findMany({
      where: retainerWhere,
      select: { amountUsd: true, client: { select: { name: true, tier: true } }, status: true },
    }),
  ])

  // MRR
  const totalMonthlyRecurring = activeRetainers.reduce((sum, r) => sum + r.amountUsd, 0)

  // Invoice totals
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amountUsd, 0)
  const totalCollected = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amountUsd, 0)
  const outstandingAmount = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.amountUsd, 0)

  // Revenue by client (top 10)
  const clientRevenueMap = new Map<string, { monthlyRetainer: number; totalInvoiced: number }>()
  for (const r of allRetainers) {
    const name = r.client?.name || "Unknown"
    const existing = clientRevenueMap.get(name) || { monthlyRetainer: 0, totalInvoiced: 0 }
    existing.monthlyRetainer += r.amountUsd
    clientRevenueMap.set(name, existing)
  }
  for (const inv of invoices) {
    const name = inv.client?.name || "Unknown"
    const existing = clientRevenueMap.get(name) || { monthlyRetainer: 0, totalInvoiced: 0 }
    existing.totalInvoiced += inv.amountUsd
    clientRevenueMap.set(name, existing)
  }
  const byClient = Array.from(clientRevenueMap.entries())
    .map(([clientName, data]) => ({ clientName, ...data }))
    .sort((a, b) => b.monthlyRetainer - a.monthlyRetainer)
    .slice(0, 10)

  // Revenue by tier
  const byTier: Record<string, { count: number; revenue: number }> = {}
  for (const r of allRetainers) {
    const tier = r.client?.tier || "unassigned"
    if (!byTier[tier]) byTier[tier] = { count: 0, revenue: 0 }
    byTier[tier].count++
    byTier[tier].revenue += r.amountUsd
  }

  // Revenue by month (over the period)
  const revenueByMonth: Array<{ month: string; revenue: number; collected: number }> = []
  const monthMap = new Map<string, { revenue: number; collected: number }>()
  for (const inv of invoices) {
    const month = inv.issuedAt.toISOString().slice(0, 7) // YYYY-MM
    const existing = monthMap.get(month) || { revenue: 0, collected: 0 }
    existing.revenue += inv.amountUsd
    if (inv.status === "paid") existing.collected += inv.amountUsd
    monthMap.set(month, existing)
  }
  for (const [month, data] of monthMap) {
    revenueByMonth.push({ month, ...data })
  }
  revenueByMonth.sort((a, b) => a.month.localeCompare(b.month))

  return {
    totalMonthlyRecurring,
    totalInvoiced,
    totalCollected,
    outstanding: outstandingAmount,
    byClient,
    byTier,
    revenueByMonth,
  }
}

// ── Summary Generator ───────────────────────────────────────────────────────

function generateSummary(
  leads: LeadVolumeReport,
  conversions: ConversionReport,
  pipeline: PipelineVelocityReport,
  revenue: RevenueAttributionReport,
  period: ReportPeriodRange
): string {
  const lines: string[] = []

  // Lead summary
  lines.push(`📊 Lead Volume: ${leads.total} new leads this period`)
  if (leads.qualifiedCount > 0) {
    lines.push(`   ✅ ${leads.qualifiedCount} qualified (${Math.round(leads.qualifiedCount / leads.total * 100)}% qualification rate)`)
  }
  if (leads.conversionRate > 0) {
    lines.push(`   🔄 ${Math.round(leads.conversionRate * 100)}% lead-to-client conversion rate`)
  }

  // Conversion summary
  if (conversions.overallRate > 0) {
    lines.push(`📈 Conversion Rate: ${Math.round(conversions.overallRate * 100)}% (${conversions.totalClients} clients from ${conversions.totalLeads} leads)`)
  }
  if (conversions.averageDaysToConvert !== null) {
    lines.push(`   ⏱ Avg ${conversions.averageDaysToConvert} days to convert`)
  }

  // Pipeline velocity
  if (pipeline.totalOutreachSent > 0 || pipeline.totalFollowups > 0) {
    lines.push(`🚀 Pipeline Activity: ${pipeline.totalOutreachSent} messages sent, ${pipeline.totalFollowups} follow-ups`)
  }
  if (pipeline.responseRate !== null) {
    lines.push(`   💬 ${Math.round(pipeline.responseRate * 100)}% response rate`)
  }

  // Revenue summary
  if (revenue.totalMonthlyRecurring > 0) {
    lines.push(`💰 MRR: $${revenue.totalMonthlyRecurring.toLocaleString()}`)
    lines.push(`   💳 $${revenue.totalCollected.toLocaleString()} collected this period`)
  }
  if (revenue.outstanding > 0) {
    lines.push(`   ⏳ $${revenue.outstanding.toLocaleString()} outstanding`)
  }

  return lines.join("\n")
}

// ── HTML Email Template ─────────────────────────────────────────────────────

function generateHtmlReport(
  report: ClientReport,
  orgName: string
): string {
  const { leads, conversions, pipeline, revenue, period } = report
  const { total, byDay } = leads
  const { totalLeads, totalClients, overallRate } = conversions
  const { totalMonthlyRecurring, totalCollected, outstanding } = revenue

  const format$ = (n: number) => `$${Math.round(n).toLocaleString()}`

  // Lead volume sparkline — simple bars
  const maxDayCount = Math.max(...byDay.map((d) => d.count), 1)
  const bars = byDay
    .map(
      (d) =>
        `<div style="display:inline-block;width:${Math.max(8, Math.floor(100 / byDay.length))}px;vertical-align:bottom;text-align:center;">
          <div style="height:${Math.max(3, (d.count / maxDayCount) * 60)}px;background:#6366f1;border-radius:3px 3px 0 0;margin:0 1px;"></div>
          <span style="font-size:8px;color:#888;">${d.date.slice(5)}</span>
        </div>`
    )
    .join("")

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;color:#fff;">
      <h1 style="margin:0;font-size:20px;">${orgName} — Activity Report</h1>
      <p style="margin:4px 0 0;opacity:.8;font-size:13px;">${period.label} · ${new Date(report.generatedAt).toLocaleDateString()}</p>
    </div>

    <!-- Metrics Row -->
    <div style="padding:20px;">
      <table width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="padding:12px;background:#f8f8ff;border-radius:8px;width:25%;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#6366f1;">${total}</div>
            <div style="font-size:11px;color:#888;">Leads</div>
          </td>
          <td style="padding:12px;width:25%;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#059669;">${totalClients}</div>
            <div style="font-size:11px;color:#888;">Clients</div>
          </td>
          <td style="padding:12px;background:#f8f8ff;border-radius:8px;width:25%;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#d97706;">${Math.round(overallRate * 100)}%</div>
            <div style="font-size:11px;color:#888;">Conversion</div>
          </td>
          <td style="padding:12px;width:25%;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#059669;">${format$(totalMonthlyRecurring)}</div>
            <div style="font-size:11px;color:#888;">MRR</div>
          </td>
        </tr>
      </table>

      <!-- Lead Volume Chart (sparkline) -->
      <div style="margin-top:20px;padding:16px;background:#fafafa;border-radius:8px;border:1px solid #eee;">
        <h3 style="margin:0 0 8px;font-size:13px;color:#333;">Lead Volume</h3>
        <div style="height:70px;text-align:center;white-space:nowrap;">${bars}</div>
      </div>

      <!-- Pipeline -->
      <div style="margin-top:16px;padding:16px;background:#fafafa;border-radius:8px;border:1px solid #eee;">
        <h3 style="margin:0 0 8px;font-size:13px;color:#333;">Pipeline</h3>
        <table width="100%" style="font-size:12px;">
          <tr><td style="padding:4px 0;color:#666;">Messages Sent</td><td style="text-align:right;font-weight:600;">${pipeline.totalOutreachSent}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Follow-ups</td><td style="text-align:right;font-weight:600;">${pipeline.totalFollowups}</td></tr>
          ${pipeline.responseRate !== null ? `<tr><td style="padding:4px 0;color:#666;">Response Rate</td><td style="text-align:right;font-weight:600;">${Math.round(pipeline.responseRate * 100)}%</td></tr>` : ""}
          ${pipeline.averageDaysToConvert !== null ? `<tr><td style="padding:4px 0;color:#666;">Avg Days to Convert</td><td style="text-align:right;font-weight:600;">${pipeline.averageDaysToConvert}</td></tr>` : ""}
        </table>
      </div>

      <!-- Revenue -->
      <div style="margin-top:16px;padding:16px;background:#fafafa;border-radius:8px;border:1px solid #eee;">
        <h3 style="margin:0 0 8px;font-size:13px;color:#333;">Revenue Summary</h3>
        <table width="100%" style="font-size:12px;">
          <tr><td style="padding:4px 0;color:#666;">Monthly Recurring Revenue</td><td style="text-align:right;font-weight:600;">${format$(totalMonthlyRecurring)}</td></tr>
          <tr><td style="padding:4px 0;color:#666;">Collected This Period</td><td style="text-align:right;font-weight:600;">${format$(totalCollected)}</td></tr>
          ${outstanding > 0 ? `<tr><td style="padding:4px 0;color:#dc2626;">Outstanding</td><td style="text-align:right;font-weight:600;color:#dc2626;">${format$(outstanding)}</td></tr>` : ""}
        </table>
      </div>

      <!-- Top Clients -->
      ${revenue.byClient.length > 0 ? `
      <div style="margin-top:16px;padding:16px;background:#fafafa;border-radius:8px;border:1px solid #eee;">
        <h3 style="margin:0 0 8px;font-size:13px;color:#333;">Top Clients by Revenue</h3>
        <table width="100%" style="font-size:12px;">
          ${revenue.byClient.slice(0, 5).map((c) => `
          <tr>
            <td style="padding:4px 0;color:#333;">${c.clientName}</td>
            <td style="text-align:right;font-weight:600;">${format$(c.monthlyRetainer)}/mo</td>
          </tr>`).join("")}
        </table>
      </div>` : ""}

      <!-- Summary Text -->
      ${report.summary ? `
      <div style="margin-top:16px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
        <p style="margin:0;font-size:12px;color:#166534;white-space:pre-line;">${report.summary}</p>
      </div>` : ""}
    </div>

    <div style="padding:16px 20px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999;">
      Generated by Mapato RevStack · ${new Date(report.generatedAt).toLocaleString()}
    </div>
  </div>
</body>
</html>`
}

// ── Main Report Generator ───────────────────────────────────────────────────

/**
 * Generate a complete client report for a given organization scope and period.
 */
export async function generateClientReport(
  scope: OrgScope,
  period: ReportPeriod = "weekly"
): Promise<ClientReport> {
  const range = getReportPeriod(period)

  const [leads, conversions, pipeline, revenue] = await Promise.all([
    buildLeadVolumeReport(scope, range.start, range.end, range.previousStart),
    buildConversionReport(scope, range.start, range.end),
    buildPipelineVelocityReport(scope, range.start, range.end),
    buildRevenueAttributionReport(scope, range.start, range.end, range.previousStart),
  ])

  const summary = generateSummary(leads, conversions, pipeline, revenue, range)

  return {
    period: range,
    leads,
    conversions,
    pipeline,
    revenue,
    summary,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Send a report via email to the given recipients.
 */
export async function sendReportEmail(
  report: ClientReport,
  orgName: string,
  toAddresses: string[]
): Promise<{ sent: boolean; error?: string }> {
  const { sendCustomEmail } = await import("@/lib/email")
  const periodLabel = report.period.label
  const dateStr = new Date(report.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const subject = `${orgName} — ${periodLabel} Activity Report (${dateStr})`
  const htmlBody = generateHtmlReport(report, orgName)
  const textBody = report.summary

  // Send to each recipient individually
  const results = await Promise.allSettled(
    toAddresses.map((to) => sendCustomEmail(to, subject, htmlBody, textBody))
  )

  const failures = results.filter((r) => r.status === "rejected")
  if (failures.length > 0) {
    return {
      sent: false,
      error: `Failed to send to ${failures.length} recipient(s)`,
    }
  }

  return { sent: true }
}

export type { ClientReport as Report }
