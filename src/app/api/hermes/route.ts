import { NextRequest, NextResponse } from "next/server"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { hermesAgent } from "@/lib/hermes-agent"

export const GET = withAbac(RESOURCES["hermes-runs"], "read", async () => {
  const operations = hermesAgent.getAllOperations()
  const systemStatus = hermesAgent.getSystemStatus()

  return NextResponse.json({
    operations,
    systemStatus,
  })
})

export const POST = withAbac(RESOURCES["hermes-runs"], "admin", async (req: NextRequest, { session }: any) => {
  const body = await req.json().catch(() => ({}))
  const action = (body as any).action
  const objective = (body as any).objective

  if (action === "system-health") {
    const op = await hermesAgent.runSystemHealthCheck(session?.user?.id)
    return NextResponse.json({ operation: op, message: "System health check started" })
  }

  if (action === "lead-sweep") {
    const op = await hermesAgent.runLeadSweep(session?.user?.id)
    return NextResponse.json({ operation: op, message: "Lead sweep started" })
  }

  if (action === "revstack-check") {
    const op = await hermesAgent.runRevStackCheck(session?.user?.id)
    return NextResponse.json({ operation: op, message: "RevStack health check started" })
  }

  if (typeof objective === "string" && objective.trim().length > 0) {
    const op = await hermesAgent.runOperation(objective.trim(), { userId: session?.user?.id })
    return NextResponse.json({ operation: op, message: "Custom operation started" })
  }

  return NextResponse.json({ error: "Invalid request. Provide action or objective." }, { status: 400 })
})
