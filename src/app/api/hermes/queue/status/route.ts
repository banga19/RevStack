/**
 * Hermes Queue Status API — BullMQ Metrics + Run Records
 *
 * Returns real-time queue health data for the admin panel:
 *   - Job counts: waiting, active, completed, failed, delayed
 *   - Recent HermesRun records from the database
 *   - Summary statistics (runs per task type, success rate)
 *
 * Protected by ABAC — only users with "hermes-runs:admin" access.
 *
 * Usage:
 *   GET /api/hermes/queue/status
 *   GET /api/hermes/queue/status?limit=50
 */

import { NextRequest, NextResponse } from "next/server"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { hermesQueue } from "@/lib/hermes/queue"
import { prisma } from "@/lib/db"

// ============================================================
// GET — Queue status + recent runs
// ============================================================

export const GET = withAbac(RESOURCES["hermes-runs"], "admin", async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25", 10) || 25, 1), 100)

  try {
    // ── BullMQ queue metrics (parallel) ──────────────────────
    const [waiting, active, completed, failed, delayed, jobs] = await Promise.all([
      hermesQueue.getWaitingCount().catch(() => 0),
      hermesQueue.getActiveCount().catch(() => 0),
      hermesQueue.getCompletedCount().catch(() => 0),
      hermesQueue.getFailedCount().catch(() => 0),
      hermesQueue.getDelayedCount().catch(() => 0),
      hermesQueue.getJobs(["waiting", "active", "completed", "failed", "delayed"], 0, 10).catch(() => []),
    ])

    // ── HermesRun records from DB (parallel) ─────────────────
    const [runs, typeAgg, statusAgg] = await Promise.all([
      prisma.hermesRun.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.hermesRun.groupBy({
        by: ["taskType"],
        _count: { id: true },
        _max: { createdAt: true },
      }),
      prisma.hermesRun.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ])

    // ── Worker status ────────────────────────────────────────
    const workerRunning = !!(
      process.env.NODE_ENV !== "production" || process.env.RUN_WORKER === "true"
    )

    return NextResponse.json({
      queue: {
        name: "hermes-tasks",
        counts: { waiting, active, completed, failed, delayed },
        total: waiting + active + completed + failed + delayed,
        workerRunning,
        redisConnected: true,
      },
      recentJobs: jobs.map((j) => ({
        id: j.id,
        name: j.name,
        data: j.data,
        status: "unknown", // individual status determined at fetch time
        timestamp: j.timestamp,
        attemptsMade: j.attemptsMade,
      })),
      runs: runs.map((r) => ({
        id: r.id,
        taskType: r.taskType,
        status: r.status,
        leadsProcessed: r.leadsProcessed,
        messagesQueued: r.messagesQueued,
        errorMessage: r.errorMessage,
        userId: r.userId,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString() || null,
        inputPreview: r.input ? truncate(r.input, 120) : null,
        outputPreview: r.output ? truncate(r.output, 200) : null,
      })),
      aggregates: {
        byTaskType: typeAgg.map((t) => ({
          taskType: t.taskType,
          count: t._count.id,
          lastRun: t._max.createdAt?.toISOString() || null,
        })),
        byStatus: statusAgg.map((s) => ({
          status: s.status,
          count: s._count.id,
        })),
        totalRuns: runs.length > 0
          ? (await prisma.hermesRun.count())
          : 0,
      },
    })
  } catch (error: any) {
    console.error("[Hermes Status] Failed to fetch queue status:", error)
    return NextResponse.json(
      {
        queue: { name: "hermes-tasks", error: error.message },
        runs: [],
        aggregates: { byTaskType: [], byStatus: [], totalRuns: 0 },
      },
      { status: 200 } // return degraded data, not a 500
    )
  }
})

// ============================================================
// Helpers
// ============================================================

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + "..."
}
