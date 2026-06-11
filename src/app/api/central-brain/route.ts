/**
 * Central Brain REST API
 *
 * Exposes HermesCentralBrain state for the frontend dashboard:
 *
 * GET /api/central-brain
 *   → Agent registry, system status, stats, recent log entries
 *
 * GET /api/central-brain/log
 *   ?limit=50&offset=0&source=lead&entryType=action_executed&since=TIMESTAMP
 *   → Paginated communication log entries
 *
 * GET /api/central-brain/events
 *   ?limit=50&offset=0&type=agent_registered&since=TIMESTAMP
 *   → Paginated SSE-bridge events
 *
 * GET /api/central-brain/agents
 *   → Agent registry only
 *
 * GET /api/central-brain/stats
 *   → System statistics only
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { centralBrain } from "@/lib/hermes-central-brain"
import { getBridgedEvents, initCentralBrainBridge } from "@/lib/central-brain-sse-bridge"

// Initialise the SSE bridge on first API call so events start flowing
initCentralBrainBridge()

// ============================================================
// GET — Main dashboard data
// ============================================================

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const section = searchParams.get("section")

  // ── Agents only ─────────────────────────────────────────────
  if (section === "agents") {
    return NextResponse.json({
      agents: centralBrain.getAllAgents(),
      statuses: centralBrain.getAgentStatuses(),
    })
  }

  // ── Stats only ──────────────────────────────────────────────
  if (section === "stats") {
    return NextResponse.json(centralBrain.getStats())
  }

  // ── Communication log ───────────────────────────────────────
  if (section === "log") {
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const source = searchParams.get("source") || undefined
    const entryType = searchParams.get("entryType") || undefined
    const since = searchParams.get("since")
      ? parseInt(searchParams.get("since")!, 10)
      : undefined

    const entries = centralBrain.getLogEntries({
      limit,
      offset,
      source,
      entryType: entryType as any,
      since,
    })

    return NextResponse.json({
      entries,
      total: centralBrain.getLogEntryCount(),
      limit,
      offset,
    })
  }

  // ── Bridge events ───────────────────────────────────────────
  if (section === "events") {
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const type = searchParams.get("type") || undefined
    const since = searchParams.get("since")
      ? parseInt(searchParams.get("since")!, 10)
      : undefined

    const events = getBridgedEvents({
      limit,
      offset,
      type: type as any,
      since,
    })

    return NextResponse.json({
      events,
      limit,
      offset,
    })
  }

  // ── Full system report (default) ────────────────────────────
  const systemReport = centralBrain.getSystemReport()
  const recentEvents = getBridgedEvents({ limit: 50 })

  return NextResponse.json({
    ...systemReport,
    bridgedEvents: recentEvents,
  })
}
