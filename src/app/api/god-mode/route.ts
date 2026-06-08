import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { agentOrchestrator } from "@/lib/agent-orchestrator"
import { agentMemory } from "@/lib/agent-memory"
import { RESOURCES } from "@/lib/abac"
import { hermesAgent } from "@/lib/hermes-agent"

// POST /api/god-mode — Start a new God Mode session
export const POST = withAbac(
  RESOURCES["god-mode"],
  "deploy",
  async (req: NextRequest) => {
    const body = await req.json()
    const { objective, duration } = body

    if (!objective) {
      return NextResponse.json(
        { error: "Missing required field: objective" },
        { status: 400 }
      )
    }

    const operation = await hermesAgent.runOperation(objective, {
      userId: undefined,
    })

    return NextResponse.json({
      session: serializeHermesOperation(operation),
    })
  }
)

// GET /api/god-mode — Get all sessions
export const GET = withAbac(RESOURCES["god-mode"], "read", async () => {
  const sessions = agentOrchestrator.getAllSessions().map(serializeSession)
  const operations = hermesAgent.getAllOperations().map(serializeHermesOperation)
  const allReports = agentMemory.getAllReports()
  const agentStatus = hermesAgent.getSystemStatus()

  return NextResponse.json({
    sessions,
    operations,
    reports: allReports.map(serializeReport),
    agentStatus,
  })
})

// PATCH /api/god-mode — Control a session (pause/resume/stop)
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

    let success = false
    switch (action) {
      case "stop":
        success = agentOrchestrator.stopGodMode(sessionId)
        break
      default:
        return NextResponse.json(
          { error: `Unsupported action for Hermes-backed God Mode: ${action}` },
          { status: 400 }
        )
    }

    if (!success) {
      return NextResponse.json(
        { error: `Failed to ${action} session. It may not exist or be in an invalid state.` },
        { status: 404 }
      )
    }

    const updatedSession = agentOrchestrator.getSession(sessionId)

    return NextResponse.json({
      session: updatedSession ? serializeSession(updatedSession) : null,
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
    progress: typeof operation.completedAt === "number" ? 100 : 0,
    currentAgent: operation.results?.[0]?.action?.agentType,
    completedCount: (operation.results || []).filter((r: any) => r.result?.success !== false).length,
    totalActions: (operation.results || []).length + (operation.plannedActions || []).length,
    errorsCount: (operation.errors || []).length,
  }
}

// Serialize functions to prevent circular references
function serializeSession(session: any) {
  return {
    id: session.id,
    config: session.config,
    status: session.status,
    startTime: session.startTime,
    endTime: session.endTime,
    tasks: session.tasks.map((t: any) => ({
      id: t.id,
      agentType: t.agentType,
      action: t.action,
      status: t.status,
      result: t.result,
      error: t.error,
      completedAt: t.completedAt,
    })),
    reports: session.reports || [],
    progress: session.progress || 0,
    currentAgent: session.currentAgent,
    completedCount: session.tasks?.filter((t: any) => t.status === "completed").length || 0,
    totalActions: session.tasks?.length || 0,
    errors: session.tasks?.filter((t: any) => t.status === "failed").length || 0,
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
