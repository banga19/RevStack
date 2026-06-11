/**
 * Central Brain SSE Stream
 *
 * GET /api/central-brain/stream?types=action_executing,action_completed
 *
 * Real-time stream of agent communication events from the Central Brain
 * MessageBus and CommunicationLog. Clients can filter by event type.
 *
 * This complements the general notification SSE stream at
 * GET /api/notifications/stream — this one is focused purely on
 * agent-to-agent communication events.
 *
 * Events are emitted as SSE `data:` lines with the following shape:
 *   {
 *     type: "agent_registered" | "agent_status_changed" | "message_sent" | ...,
 *     summary: "Agent registered: lead (Lead Agent)",
 *     timestamp: "2026-06-10T12:00:00.000Z",
 *     details: { ... event-specific payload ... }
 *   }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { centralBrain, type CentralBrainEvent, type CentralBrainListener } from "@/lib/hermes-central-brain"
import { initCentralBrainBridge } from "@/lib/central-brain-sse-bridge"

// ── ALLOWED_EVENT_TYPES ────────────────────────────────────────────────────
// Events that are streamed to clients. Can be filtered further via ?types= param.

const ALL_EVENT_TYPES: CentralBrainEvent["type"][] = [
  "agent_registered",
  "agent_status_changed",
  "message_sent",
  "message_delivered",
  "action_executing",
  "action_completed",
  "orchestration_started",
  "orchestration_completed",
  "insight_discovered",
  "error",
]

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

  // Ensure the SSE bridge is initialised so events flow
  initCentralBrainBridge()

  // Parse optional type filter
  const { searchParams } = new URL(req.url)
  const typeFilter = searchParams.get("types")
  const allowedTypes = typeFilter
    ? typeFilter.split(",").filter((t): t is CentralBrainEvent["type"] => ALL_EVENT_TYPES.includes(t as any))
    : ALL_EVENT_TYPES

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      const connected = JSON.stringify({
        type: "connected",
        summary: "Central Brain SSE connected",
        timestamp: new Date().toISOString(),
        details: { allowedEventTypes: allowedTypes },
      })
      controller.enqueue(new TextEncoder().encode(`data: ${connected}\n\n`))

      // Subscribe to all Central Brain events
      const unsub = centralBrain.onEvent((event: CentralBrainEvent) => {
        if (!allowedTypes.includes(event.type)) return

        const payload = JSON.stringify({
          type: event.type,
          summary: `${event.type}`,
          timestamp: new Date().toISOString(),
          details: extractDetails(event),
        })

        try {
          controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`))
        } catch {
          // Client disconnected — clean up
          unsub()
        }
      })

      // Heartbeat every 30s to keep connection alive
      const heartbeatInterval = setInterval(() => sendHeartbeat(controller), 30_000)

      // Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval)
        unsub()
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

// ── Helper: extract a clean JSON-serialisable event payload ────────────────

function extractDetails(event: CentralBrainEvent): Record<string, unknown> | undefined {
  try {
    switch (event.type) {
      case "agent_registered":
        return {
          agentType: event.agentType,
          displayName: event.registration.displayName,
          capabilities: event.registration.capabilities.map((c) => c.name),
        }
      case "agent_status_changed":
        return { agentType: event.agentType, status: event.status }
      case "message_sent":
        return {
          messageId: event.message.id,
          source: event.message.source,
          target: event.message.target,
          type: event.message.type,
          priority: event.message.priority,
          correlationId: event.message.correlationId,
        }
      case "message_delivered":
        return { messageId: event.messageId }
      case "action_executing":
        return { agentType: event.agentType, action: event.action, correlationId: event.correlationId }
      case "action_completed":
        return {
          agentType: event.agentType,
          action: event.action,
          success: event.success,
          durationMs: event.durationMs,
          correlationId: event.correlationId,
        }
      case "orchestration_started":
        return { workflowId: event.workflowId, objective: event.objective }
      case "orchestration_completed":
        return { workflowId: event.workflowId, status: event.status, durationMs: event.durationMs }
      case "insight_discovered":
        return {
          insightId: event.insight.id,
          agentType: event.insight.agentType,
          title: event.insight.title,
          category: event.insight.category,
        }
      case "error":
        return { source: event.source, error: event.error, correlationId: event.correlationId }
      default:
        return {}
    }
  } catch {
    return {}
  }
}
