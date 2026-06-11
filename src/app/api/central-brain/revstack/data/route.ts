import { NextRequest, NextResponse } from "next/server"
import { centralBrain } from "@/lib/hermes-central-brain"

/**
 * GET /api/central-brain/revstack/data?page=leads&status=new&search=coffee
 *
 * Unified data endpoint for all RevStack pages. Routes every read query
 * through centralBrain.executeAction() so all page data flows are logged
 * in the CommunicationLog and visible on the Central Brain SSE stream.
 *
 * Supported pages: leads, retainers, followups, messages, campaigns,
 * clients, pipeline-actions, revenue, hermes, god-mode
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = searchParams.get("page") || ""
  const status = searchParams.get("status") || ""
  const search = searchParams.get("search") || ""
  const channel = searchParams.get("channel") || ""
  const corridor = searchParams.get("corridor") || ""
  const clientId = searchParams.get("clientId") || ""
  const limit = searchParams.get("limit") || ""

  // Build params from query string
  const params: Record<string, any> = {}
  if (status) params.status = status
  if (search) params.search = search
  if (channel) params.channel = channel
  if (corridor) params.corridor = corridor
  if (clientId) params.clientId = clientId
  if (limit) params.limit = parseInt(limit, 10)

  // Sub-action for special combined queries (e.g. retainers+clients)
  const subAction = searchParams.get("sub") || "list"

  // Build the action string for the agent: "page|subAction|paramsJson"
  const actionString = `${page}|${subAction}|${JSON.stringify(params)}`

  try {
    const result = await centralBrain.executeAction(
      "revstack-page-data",
      actionString,
      {
        sessionId: `revstack-page-${Date.now()}`,
        objective: `Fetch ${page} page data`,
        startTime: Date.now(),
      },
      { correlationId: `revstack-page-${page}-${Date.now()}` }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.summary, details: result.errors },
        { status: 500 }
      )
    }

    // Parse the JSON details back into structured data
    let data: any
    try {
      data = JSON.parse(result.details || "[]")
    } catch {
      data = []
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: `RevStack page data fetch failed: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}
