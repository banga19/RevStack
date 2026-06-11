/**
 * Hermes Cron Sweep — Scheduled Lead Processing
 *
 * Enqueues a sweep-leads BullMQ job so all unprocessed leads are fed into
 * the autonomous sales pipeline. Designed to be called by an external cron
 * service (cron-job.org, GitHub Actions, Vercel Cron, etc.).
 *
 * Endpoints:
 *   GET /api/cron/hermes-sweep              — Default sweep (sweep-leads)
 *   GET /api/cron/hermes-sweep?mode=quick   — Quick health check (sweep-leads)
 *   GET /api/cron/hermes-sweep?mode=full    — Full sweep (sweep-leads)
 *
 * Security: Validates via x-cron-secret header or admin session.
 *
 * Add to your cron provider:
 *   Schedule: every 6 hours (e.g. cron expression: 0 /6 * * *)
 *   URL: https://your-domain.com/api/cron/hermes-sweep
 *   Headers: x-cron-secret: <your-secret>
 *
 * Or for a daily full sweep:
 *   Schedule: daily at 7 AM (0 7 * * *)
 *   URL: https://your-domain.com/api/cron/hermes-sweep?mode=full
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hermesQueue } from "@/lib/hermes/queue"
import { centralBrain } from "@/lib/hermes-central-brain"

// ============================================================
// GET — Trigger a Hermes lead sweep
// ============================================================

export async function GET(req: NextRequest) {
  try {
    // ── Authentication ──────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET
    const session = await auth()

    // Check x-cron-secret header (matching server env var)
    const headerSecret = req.headers.get("x-cron-secret")
    const headerMatch = cronSecret && headerSecret && cronSecret === headerSecret

    // Check admin session (for manual testing via browser)
    const isAdmin = session?.user?.role === "admin"

    // Dev mode: also allow "cron-trigger-dev" as fallback secret
    const isDevMode = cronSecret === "cron-trigger-dev"

    if (!headerMatch && !isAdmin && !isDevMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ── Determine sweep mode ────────────────────────────────
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get("mode") || "default"

    // ── Enqueue the sweep job ───────────────────────────────
    const userId = session?.user?.id || "cron:hermes-sweep"

    await hermesQueue.add("sweep-leads", {
      allLeads: true,
      mode,
      userId,
      triggeredBy: "cron:hermes-sweep",
      timestamp: new Date().toISOString(),
    })

    // Log sweep dispatch through Central Brain's message bus (after successful enqueue)
    centralBrain.sendMessage({
      source: "cron:hermes-sweep",
      target: "*",
      type: "sweep:dispatched",
      payload: {
        mode,
        userId,
        timestamp: new Date().toISOString(),
      },
      priority: "medium",
    })

    return NextResponse.json({
      success: true,
      mode,
      queued: true,
      jobType: "sweep-leads",
      message: `Hermes ${mode} sweep enqueued — all unprocessed leads will be processed.`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Cron] Hermes sweep error:", error)
    return NextResponse.json(
      {
        error: "Failed to trigger Hermes sweep",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
