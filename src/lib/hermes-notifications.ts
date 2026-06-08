/**
 * Hermes Notifications — Emit real-time SSE events for Hermes agent runs
 *
 * Used by:
 *  - The BullMQ worker (src/lib/hermes/queue.ts) when a run completes
 *  - The sweep API route (src/app/api/hermes/run/route.ts) when a sweep starts
 */

import { emitToUser, type NotificationEvent } from "./sse-registry"

// ── Helpers ────────────────────────────────────────────────────────────────

export function emitHermesRunCompleted(
  userId: string | undefined | null,
  run: {
    id: string
    taskType: string
    status: string
    leadsProcessed: number | null
    errorMessage: string | null
  }
) {
  if (!userId) return { delivered: 0 }

  const isSuccess = run.status === "completed"
  const taskLabel = run.taskType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  const event: NotificationEvent = {
    id: `hermes-run-${run.id}`,
    type: "hermes",
    title: isSuccess
      ? `✅ ${taskLabel} completed`
      : `❌ ${taskLabel} failed`,
    description: isSuccess
      ? `Processed ${run.leadsProcessed ?? 0} lead${run.leadsProcessed !== 1 ? "s" : ""}`
      : run.errorMessage || "Unknown error",
    variant: isSuccess ? "success" : "error",
    timestamp: new Date().toISOString(),
    link: "/hermes",
    metadata: {
      runId: run.id,
      taskType: run.taskType,
      status: run.status,
      leadsProcessed: run.leadsProcessed ?? 0,
    },
  }

  return emitToUser(userId, event)
}

export function emitSweepStarted(
  userId: string | undefined | null,
  leadCount: number
) {
  if (!userId) return { delivered: 0 }

  const event: NotificationEvent = {
    id: `hermes-sweep-${Date.now()}`,
    type: "hermes",
    title: "🧹 Agent sweep started",
    description: `Processing ${leadCount} lead${leadCount !== 1 ? "s" : ""} — results will appear live`,
    variant: "info",
    timestamp: new Date().toISOString(),
    link: "/hermes",
    metadata: {
      type: "sweep_started",
      leadCount,
    },
  }

  return emitToUser(userId, event)
}

export function emitSweepCompleted(
  userId: string | undefined | null,
  results: { total: number; completed: number; failed: number }
) {
  if (!userId) return { delivered: 0 }

  const event: NotificationEvent = {
    id: `hermes-sweep-done-${Date.now()}`,
    type: "hermes",
    title: results.failed === 0
      ? "✅ Agent sweep complete"
      : "⚠️ Agent sweep finished with errors",
    description: `${results.completed} succeeded, ${results.failed} failed of ${results.total} total`,
    variant: results.failed === 0 ? "success" : "warning",
    timestamp: new Date().toISOString(),
    link: "/hermes",
    metadata: {
      type: "sweep_completed",
      ...results,
    },
  }

  return emitToUser(userId, event)
}
