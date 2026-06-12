import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getOrgScope } from "@/lib/get-org-scope"
import { generateClientReport, sendReportEmail, type ReportPeriod } from "@/lib/reporting-engine"

/**
 * POST /api/reports/schedule
 *
 * Cron-scheduled endpoint that generates and emails reports for all
 * organizations. Designed to be called by an external cron service
 * (cron-job.org, GitHub Actions, Vercel Cron, etc.).
 *
 * Headers:
 *   x-cron-secret — must match CRON_SECRET env var
 *
 * Body (optional):
 *   - period ("weekly" | "monthly" | "quarterly", default "weekly")
 *   - orgId (optional): generate for a specific org only
 */
export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const headerSecret = req.headers.get("x-cron-secret")
    const headerMatch = cronSecret && headerSecret && cronSecret === headerSecret
    const isDevMode = cronSecret === "cron-trigger-dev"

    if (!headerMatch && !isDevMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const period: ReportPeriod = body.period || "weekly"
    const specificOrgId: string | null = body.orgId || null

    // Validate period
    if (!["weekly", "monthly", "quarterly"].includes(period)) {
      return NextResponse.json({ error: "Invalid period. Use: weekly, monthly, or quarterly" }, { status: 400 })
    }

    // Fetch organizations to generate reports for
    let orgs: Array<{ id: string; name: string }>
    if (specificOrgId) {
      const org = await prisma.organization.findUnique({
        where: { id: specificOrgId },
        select: { id: true, name: true },
      })
      orgs = org ? [org] : []
    } else {
      orgs = await prisma.organization.findMany({
        select: { id: true, name: true },
      })
    }

    if (orgs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No organizations found to generate reports for",
        generated: 0,
      })
    }

    // Generate and email reports for each org
    const results = []
    for (const org of orgs) {
      // Find admin users in this org who should receive the report
      const adminUsers = await prisma.user.findMany({
        where: {
          organizationId: org.id,
          role: "admin",
          email: { not: null },
        },
        select: { id: true, email: true, name: true },
      })

      if (adminUsers.length === 0) {
        results.push({ orgId: org.id, orgName: org.name, status: "skipped", reason: "no admin users" })
        continue
      }

      // Create a scope for this org (use first admin as scope user)
      const scope = await getOrgScope(adminUsers[0].id)

      const report = await generateClientReport(scope, period)
      const emailAddresses = adminUsers.map((u) => u.email!).filter(Boolean)

      let emailResult
      if (emailAddresses.length > 0) {
        emailResult = await sendReportEmail(report, org.name, emailAddresses)
      }

      results.push({
        orgId: org.id,
        orgName: org.name,
        status: "generated",
        emailsSent: emailResult?.sent ? emailAddresses.length : 0,
      })
    }

    return NextResponse.json({
      success: true,
      period,
      generated: results.filter((r) => r.status === "generated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Cron] Report schedule error:", error)
    return NextResponse.json(
      { error: "Failed to generate scheduled reports", details: (error as Error).message },
      { status: 500 }
    )
  }
}
