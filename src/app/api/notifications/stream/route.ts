/**
 * SSE (Server-Sent Events) Notification Stream
 *
 * Clients connect to GET /api/notifications/stream and receive
 * real-time events (new leads, payment confirmations, trial expirations, etc.)
 * as they happen anywhere in the system.
 *
 * This route registers clients in the shared SSE registry so that both
 * API routes and background workers can emit events via emitToUser().
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  registerClient,
  unregisterClient,
  type NotificationEvent,
} from "@/lib/sse-registry"

// ── Heartbeat ──────────────────────────────────────────────────────────────

function sendHeartbeat(controller: ReadableStreamDefaultController) {
  try {
    controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"))
  } catch {
    // Client disconnected
  }
}

// ── GET: SSE Stream ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const userId = session.user.id

  const stream = new ReadableStream({
    start(controller) {
      // Register this client in the shared registry
      registerClient(userId, controller)

      // Send initial connected event
      const connected: NotificationEvent = {
        id: "connected",
        type: "system",
        title: "Connected",
        description: "Real-time notifications active",
        variant: "info",
        timestamp: new Date().toISOString(),
      }
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(connected)}\n\n`))

      // Heartbeat every 30s to keep connection alive
      const heartbeatInterval = setInterval(() => sendHeartbeat(controller), 30_000)

      // Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval)
        unregisterClient(userId, controller)
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

export { type NotificationEvent } from "@/lib/sse-registry"
