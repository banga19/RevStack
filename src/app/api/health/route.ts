import { NextResponse } from "next/server"
import { getSystemHealth } from "@/lib/monitoring"

export async function GET() {
  const health = await getSystemHealth()
  const httpStatus = health.status === "error" ? 503 : health.status === "degraded" ? 200 : 200
  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Retry-After": httpStatus === 503 ? "60" : "0",
    },
  })
}
