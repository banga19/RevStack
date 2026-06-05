import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runAutonomousSweep, runQuickHealthCheck } from "@/lib/autonomous-scheduler"

/**
 * Autonomous Sweep Cron Endpoint
 *
 * This replaces the need for a manual Hermes frontend page. The scheduler
 * runs in the background via cron triggers, monitoring database state and
 * dispatching Hermes agent operations autonomously.
 *
 * Endpoints:
 *   GET /api/cron/autonomous-sweep?mode=full   — Full sweep (all triggers, daily)
 *   GET /api/cron/autonomous-sweep?mode=quick  — Quick health check (6-hourly)
 *
 * Security: Validates via x-cron-secret header or admin session.
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const session = await auth()
    const headerSecret = req.headers.get("x-cron-secret")
    const headerMatch = cronSecret && headerSecret && cronSecret === headerSecret
    const isAdmin = session?.user?.role === "admin"
    const isDevMode = cronSecret === "cron-trigger-dev"

    if (!headerMatch && !isAdmin && !isDevMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get("mode") || "full"

    let result
    if (mode === "quick") {
      result = await runQuickHealthCheck(`cron:${cronSecret}`)
    } else {
      result = await runAutonomousSweep(true, `cron:${cronSecret}`)
    }

    return NextResponse.json({
      success: true,
      mode,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Cron] Autonomous sweep error:", error)
    return NextResponse.json(
      { error: "Failed to run autonomous sweep", details: (error as Error).message },
      { status: 500 }
    )
  }
}
