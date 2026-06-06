/**
 * Hermes Run API — Manual Job Triggering
 *
 * Enqueues BullMQ jobs for the Hermes autonomous sales pipeline.
 * Protected by ABAC — only users with "hermes-runs:admin" access can trigger.
 *
 * Actions:
 *   POST /api/hermes/run              — enqueue a single lead for processing
 *   POST /api/hermes/run?sweep=true   — sweep all unprocessed leads
 *   POST /api/hermes/run?retry=JOB_ID — retry a previously failed job
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/hermes/run \
 *     -H "Content-Type: application/json" \
 *     -d '{"leadId": "clxx..."}'
 *
 *   curl -X POST "http://localhost:3000/api/hermes/run?sweep=true"
 *
 *   curl -X POST "http://localhost:3000/api/hermes/run?retry=clxx..."
 */

import { NextRequest, NextResponse } from "next/server"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { hermesQueue } from "@/lib/hermes/queue"

// ============================================================
// POST — Trigger a Hermes job
// ============================================================

export const POST = withAbac(RESOURCES["hermes-runs"], "admin", async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)

  // ── Sweep: enqueue all unprocessed leads ────────────────
  if (searchParams.has("sweep")) {
    await hermesQueue.add("sweep-leads", {
      allLeads: true,
      userId: session.user.id,
    })
    return NextResponse.json({
      queued: true,
      jobType: "sweep-leads",
      message: "Sweep job enqueued — all unprocessed leads will be processed.",
    })
  }

  // ── Retry: re-enqueue a failed job by original job ID ───
  const retryJobId = searchParams.get("retry")
  if (retryJobId) {
    await hermesQueue.add("retry-failed", {
      originalJobId: retryJobId,
    })
    return NextResponse.json({
      queued: true,
      jobType: "retry-failed",
      originalJobId: retryJobId,
      message: `Retry job enqueued for original job: ${retryJobId}`,
    })
  }

  // ── Single lead processing ──────────────────────────────
  let leadId: string | undefined
  let body: any

  try {
    body = await req.json()
    leadId = body?.leadId
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json(
      { error: "leadId is required and must be a string" },
      { status: 400 }
    )
  }

  await hermesQueue.add("process-lead", {
    leadId,
    userId: session.user.id,
  })

  return NextResponse.json({
    queued: true,
    jobType: "process-lead",
    leadId,
    message: `Lead ${leadId} enqueued for Hermes processing.`,
  })
})
