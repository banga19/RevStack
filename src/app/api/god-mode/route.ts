import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { hermesAgent } from "@/lib/hermes-agent"
import { centralBrain } from "@/lib/hermes-central-brain"

// POST /api/god-mode — Start a new God Mode session (backed by Hermes)
export const POST = withAbac(
  RESOURCES["god-mode"],
  "deploy",
  async (req: NextRequest, { session }: any) => {
    const body = await req.json()
    const { objective, duration } = body

    if (!objective) {
      return NextResponse.json(
        { error: "Missing required field: objective" },
        { status: 400 }
      )
    }

    const operation = await hermesAgent.runOperation(objective, {
      userId: session?.user?.id || undefined,
    })

    return NextResponse.json({
      session: serializeHermesOperation(operation),
    })
  }
)

// GET /api/god-mode — Get all sessions from Hermes
export const GET = withAbac(RESOURCES["god-mode"], "read", async () => {
  const operations = hermesAgent.getAllOperations().map(serializeHermesOperation)
  // Reports come through the Central Brain instead of direct agentMemory access
  const allReports = centralBrain.getAllReports()
  const agentStatus = hermesAgent.getSystemStatus()

  return NextResponse.json({
    sessions: operations, // God Mode sessions = Hermes operations
    operations,
    reports: allReports.map(serializeReport),
    agentStatus,
  })
})

// PATCH /api/god-mode — Control a session (pause/resume/stop) via Hermes
export const PATCH = withAbac(
  RESOURCES["god-mode"],
  "deploy",
  async (req: NextRequest) => {
    const body = await req.json()
    const { sessionId, action } = body

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, action" },
        { status: 400 }
      )
    }

    // Check if the operation exists in Hermes
    const operation = hermesAgent.getOperation(sessionId)
    if (!operation) {
      return NextResponse.json(
        { error: `Session not found: ${sessionId}` },
        { status: 404 }
      )
    }

    let success = false
    switch (action) {
      case "pause":
        success = await hermesAgent.pauseOperation(sessionId)
        break
      case "resume":
        success = await hermesAgent.resumeOperation(sessionId)
        break
      case "stop":
        success = await hermesAgent.stopOperation(sessionId)
        break
      default:
        return NextResponse.json(
          { error: `Unsupported action for God Mode: ${action}` },
          { status: 400 }
        )
    }

    if (!success) {
      return NextResponse.json(
        { error: `Failed to ${action} session. It may not exist or be in an invalid state.` },
        { status: 404 }
      )
    }

    const updatedSession = hermesAgent.getOperation(sessionId)

    return NextResponse.json({
      session: updatedSession ? serializeHermesOperation(updatedSession) : null,
    })
  }
)

function serializeHermesOperation(operation: any) {
  return {
    id: operation.id,
    status: operation.status,
    objective: operation.objective,
    startedAt: operation.startedAt,
    completedAt: operation.completedAt,
    plannedActions: operation.plannedActions || [],
    results: operation.results || [],
    insights: operation.insights || [],
    errors: operation.errors || [],
    progress: typeof operation.completedAt === "number" ? 100 : operation.status === "running" ? 50 : 0,
    currentAgent: operation.results?.[0]?.action?.agentType,
    completedCount: (operation.results || []).filter((r: any) => r.result?.success !== false).length,
    totalActions: (operation.results || []).length + (operation.plannedActions || []).length,
    errorsCount: (operation.errors || []).length,
  }
}

function serializeReport(report: any) {
  return {
    id: report.id,
    agentType: report.agentType,
    timestamp: report.timestamp,
    title: report.title,
    summary: report.summary,
    actions: report.actions,
    metrics: report.metrics,
    insights: report.insights,
    nextActions: report.nextActions,
  }
}
