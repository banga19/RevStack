import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hermesAgent } from "@/lib/hermes-agent"

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const session = await auth()

    const headerSecret = req.headers.get("x-cron-secret")
    const headerMatch = cronSecret && headerSecret && cronSecret === headerSecret
    const isAdmin = session?.user?.role === "admin"
    const isDevMode = cronSecret === "cron-trigger-dev"

    if (!headerMatch && !isAdmin && !isDevMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action") || "system-health"
    const objective = searchParams.get("objective")

    let operation
    switch (action) {
      case "run":
        if (!objective) {
          return NextResponse.json({ error: "Missing objective query parameter for action=run" }, { status: 400 })
        }
        operation = await hermesAgent.runOperation(objective, { userId: `cron:${cronSecret}` })
        break
      case "lead-sweep":
        operation = await hermesAgent.runLeadSweep(`cron:${cronSecret}`)
        break
      case "system-health":
      default:
        operation = await hermesAgent.runSystemHealthCheck(`cron:${cronSecret}`)
        break
    }

    return NextResponse.json({
      success: true,
      operationId: operation.id,
      status: operation.status,
      action,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Cron] Hermes run error:", error)
    return NextResponse.json({ error: "Failed to run scheduled Hermes" }, { status: 500 })
  }
}
