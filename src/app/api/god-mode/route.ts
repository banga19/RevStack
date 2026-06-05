import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { agentOrchestrator } from "@/lib/agent-orchestrator"
import { agentMemory } from "@/lib/agent-memory"
import { RESOURCES } from "@/lib/abac"

// POST /api/god-mode — Start a new God Mode session
export const POST = withAbac(
  RESOURCES["god-mode"],
  "deploy",
  async (req: NextRequest) => {
    const body = await req.json()
    const { duration, objective, agents } = body

    if (!objective || !agents || !Array.isArray(agents) || agents.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: objective, agents" },
        { status: 400 }
      )
    }

    const session = await agentOrchestrator.startGodMode({
      duration: parseInt(duration) || 3600000,
      objective,
      agents,
      checkInterval: 60000,
    })

    return NextResponse.json({
      session: serializeSession(session),
    })
  }
)

// GET /api/god-mode — Get all sessions
export const GET = withAbac(RESOURCES["god-mode"], "read", async () => {
  const sessions = agentOrchestrator.getAllSessions()
  const allReports = agentMemory.getAllReports()
  const agentStatus = agentOrchestrator.getAgentStatus()

  return NextResponse.json({
    sessions: sessions.map(serializeSession),
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
      case "pause":
        success = await agentOrchestrator.pauseGodMode(sessionId)
        break
      case "resume":
        success = await agentOrchestrator.resumeGodMode(sessionId)
        break
      case "stop":
        success = await agentOrchestrator.stopGodMode(sessionId)
        break
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
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
