import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { getOrgScope } from "@/lib/get-org-scope"
import { generateClientReport, type ReportPeriod } from "@/lib/reporting-engine"

/**
 * GET /api/reports
 *
 * Returns paginated report history for the user's organization.
 * Query params:
 *   - limit (number, default 10): max reports to return
 *   - offset (number, default 0): pagination offset
 */
export const GET = withAuth(async (req, { session }) => {
  const userId = session.user.id as string
  const scope = await getOrgScope(userId)

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 50)
  const offset = Number(url.searchParams.get("offset")) || 0

  // Fetch report history from AgentReport table (stored as type "client-report")
  const [reports, total] = await Promise.all([
    prisma.agentReport.findMany({
      where: { agentType: "client-report" },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.agentReport.count({
      where: { agentType: "client-report" },
    }),
  ])

  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      metrics: safeParseJson(r.metrics),
      actions: safeParseJson(r.actions),
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    limit,
    offset,
  })
})

/**
 * POST /api/reports
 *
 * Generates a new client report for the current period.
 * Body params:
 *   - period ("weekly" | "monthly" | "quarterly", default "weekly")
 *   - emailTo (optional string[]): recipients to email the report
 */
export const POST = withAuth(async (req, { session }) => {
  const userId = session.user.id as string
  const scope = await getOrgScope(userId)

  const body = await req.json().catch(() => ({}))
  const period: ReportPeriod = body.period || "weekly"
  const emailTo: string[] = body.emailTo || []

  // Validate period
  if (!["weekly", "monthly", "quarterly"].includes(period)) {
    return NextResponse.json({ error: "Invalid period. Use: weekly, monthly, or quarterly" }, { status: 400 })
  }

  // Get org name
  let orgName = "My Workspace"
  if (scope.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: scope.organizationId },
      select: { name: true },
    })
    if (org) orgName = org.name
  }

  // Generate the report
  const report = await generateClientReport(scope, period)

  // Persist to AgentReport table for history
  try {
    await prisma.agentReport.create({
      data: {
        id: `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        agentType: "client-report",
        title: `${orgName} — ${report.period.label} Report`,
        summary: report.summary,
        actions: JSON.stringify([{ action: "report_generated", result: "generated", impact: `${report.leads.total} leads, ${report.conversions.totalClients} clients, $${report.revenue.totalMonthlyRecurring} MRR` }]),
        metrics: JSON.stringify({
          totalLeads: report.leads.total,
          totalClients: report.conversions.totalClients,
          conversionRate: report.conversions.overallRate,
          mrr: report.revenue.totalMonthlyRecurring,
          collected: report.revenue.totalCollected,
          totalFollowups: report.pipeline.totalFollowups,
          responseRate: report.pipeline.responseRate,
        }),
        insightRefs: JSON.stringify([]),
        nextActions: JSON.stringify([]),
        periodStart: report.period.start,
        periodEnd: report.period.end,
      },
    })
  } catch (e) {
    console.warn("[Reports] Failed to persist report:", e)
    // Non-critical — report still returned
  }

  // Send email if recipients provided
  let emailResult = null
  if (emailTo.length > 0) {
    const { sendReportEmail } = await import("@/lib/reporting-engine")
    emailResult = await sendReportEmail(report, orgName, emailTo)
  }

  return NextResponse.json({
    success: true,
    report: {
      period: report.period,
      leads: report.leads,
      conversions: report.conversions,
      pipeline: report.pipeline,
      revenue: report.revenue,
      summary: report.summary,
      generatedAt: report.generatedAt,
    },
    emailResult,
  })
})

// ── Helpers ─────────────────────────────────────────────────────────────────

function safeParseJson(str: string): any {
  try {
    return JSON.parse(str)
  } catch {
    return {}
  }
}
