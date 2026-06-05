import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/abac-middleware"
import { hermesAgent } from "@/lib/hermes-agent"

type RouteSession = { userId: string; [key: string]: any }

const getUserIdFromReq = (req: NextRequest) =>
  (req as unknown as { session: RouteSession }).session?.userId

// POST /api/hermes — Start a new Hermes autonomous operation
export const POST = withAuth(async (req: NextRequest) => {
  const userId = getUserIdFromReq(req)
  const body = await req.json()
  const { action, objective } = body

  if (!action) {
    return NextResponse.json(
      { error: "Missing required field: action" },
      { status: 400 }
    )
  }

  let operation

  switch (action) {
    case "run":
      if (!objective) {
        return NextResponse.json(
          { error: "Missing required field: objective for 'run' action" },
          { status: 400 }
        )
      }
      operation = await hermesAgent.runOperation(objective, { userId })
      break

    case "lead-sweep":
      operation = await hermesAgent.runLeadSweep(userId)
      break

    case "system-health":
      operation = await hermesAgent.runSystemHealthCheck(userId)
      break

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}. Valid: run, lead-sweep, system-health` },
        { status: 400 }
      )
  }

  return NextResponse.json({
    operation: serializeOperation(operation),
  })
})

// GET /api/hermes — Get Hermes status and operation history
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const operationId = searchParams.get("operationId")

  if (operationId) {
    const operation = hermesAgent.getOperation(operationId)
    if (!operation) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 }
      )
    }
    return NextResponse.json({ operation: serializeOperation(operation) })
  }

  const operations = hermesAgent.getRecentOperations(20)
  const systemStatus = hermesAgent.getSystemStatus()

  return NextResponse.json({
    operations: operations.map(serializeOperation),
    systemStatus,
  })
})

// Serialize operation to plain JSON (removes functions, handles circular refs)
function serializeOperation(op: any) {
  return {
    id: op.id,
    objective: op.objective,
    status: op.status,
    context: op.context?.substring(0, 2000) || "",
    plannedActions: (op.plannedActions || []).map((a: any) => ({
      agentType: a.agentType,
      action: a.action,
      reasoning: a.reasoning,
      priority: a.priority,
      estimatedDuration: a.estimatedDuration,
    })),
    results: (op.results || []).map((r: any) => ({
      action: r.action,
      result: {
        success: r.result?.success,
        summary: r.result?.summary?.substring(0, 500) || "",
        details: r.result?.details?.substring(0, 2000) || "",
        metrics: r.result?.metrics || {},
        errors: r.result?.errors,
      },
      duration: r.duration,
    })),
    insights: (op.insights || []).map((i: any) => ({
      id: i.id,
      title: i.title,
      description: i.description?.substring(0, 300) || "",
      category: i.category,
      agentType: i.agentType,
      relevanceScore: i.relevanceScore,
    })),
    errors: (op.errors || []).slice(0, 20),
    startedAt: op.startedAt,
    completedAt: op.completedAt,
    duration: op.completedAt ? op.completedAt - op.startedAt : undefined,
    userId: op.userId,
  }
}
