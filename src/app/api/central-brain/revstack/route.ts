/**
 * RevStack Dashboard API — Routed Through HermesCentralBrain
 *
 * GET /api/central-brain/revstack
 *   → Full dashboard data (stats, revenue, pipeline, activity, runs)
 *
 * GET /api/central-brain/revstack?section=dashboard
 * GET /api/central-brain/revstack?section=revenue
 * GET /api/central-brain/revstack?section=pipeline
 * GET /api/central-brain/revstack?section=activity
 *   → Specific sections only
 *
 * All data queries are routed through the HermesCentralBrain MessageBus
 * and logged in the CommunicationLog, providing full traceability of
 * every analytics data request.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { centralBrain } from "@/lib/hermes-central-brain"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const section = searchParams.get("section") || "all"

  try {
    // Route the data request through the Central Brain as a "revstack" agent action.
    // The userId is passed in the action string so the agent can scope queries.
    const result = await centralBrain.executeAction(
      "revstack",
      `${section}|${session.user.id}`,
      {
        sessionId: `revstack-${session.user.id}`,
        objective: `Fetch RevStack dashboard data: ${section} for user ${session.user.id}`,
        startTime: Date.now(),
      },
      { correlationId: `revstack-${session.user.id}-${Date.now()}`, userId: session.user.id }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.summary },
        { status: 500 }
      )
    }

    // Parse the JSON details returned by the revstack agent
    let data: Record<string, any> = {}
    try {
      data = result.details ? JSON.parse(result.details) : {}
    } catch {
      data = {}
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[Central Brain / RevStack] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch RevStack dashboard data" },
      { status: 500 }
    )
  }
}
