import { NextResponse } from "next/server"
import { getSystemHealth } from "@/lib/monitoring"

export async function GET() {
  const health = await getSystemHealth()
  const status = health.status === "error" ? 503 : health.status === "degraded" ? 200 : 200
  return NextResponse.json(health, {
    status,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}
