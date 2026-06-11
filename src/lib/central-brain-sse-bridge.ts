/**
 * Central Brain → SSE Bridge
 *
 * Subscribes to HermesCentralBrain lifecycle events and forwards them to
 * the real-time SSE notification system. This connects the agent communication
 * layer to the user-facing notification stream.
 *
 * Architecture:
 *   HermesCentralBrain (agent events)
 *         │
 *         ▼
 *   CentralBrainSSEBridge (this file)
 *         │
 *         ├── emitToUser() → SSE clients (real-time notifications)
 *         └── internal event buffer → REST API (historical query)
 *
 * The bridge maintains a bounded event buffer so the REST API can serve
 * recent events even when no SSE clients are connected.
 */

import { centralBrain, type CentralBrainEvent } from "./hermes-central-brain"
import { emitToUser, getConnectedUserIds, type NotificationEvent } from "./sse-registry"

// ============================================================
// Types
// ============================================================

export interface BridgedEvent {
  id: string
  timestamp: string
  type: CentralBrainEvent["type"]
  summary: string
  details?: Record<string, unknown>
}

// ============================================================
// Event Buffer (bounded ring-buffer for REST API queries)
// ============================================================

const MAX_BUFFERED_EVENTS = 500
const bridgedEvents: BridgedEvent[] = []

function bufferEvent(event: BridgedEvent): void {
  bridgedEvents.unshift(event)
  if (bridgedEvents.length > MAX_BUFFERED_EVENTS) {
    bridgedEvents.length = MAX_BUFFERED_EVENTS
  }
}

/**
 * Get buffered bridge events for REST API consumption.
 */
export function getBridgedEvents(options: {
  limit?: number
  offset?: number
  type?: CentralBrainEvent["type"]
  since?: number
} = {}): BridgedEvent[] {
  let filtered = bridgedEvents

  if (options.type) {
    filtered = filtered.filter((e) => e.type === options.type)
  }
  if (options.since) {
    filtered = filtered.filter(
      (e) => new Date(e.timestamp).getTime() >= options.since!
    )
  }

  const offset = options.offset || 0
  const limit = options.limit || 50
  return filtered.slice(offset, offset + limit)
}

/**
 * Get the count of buffered events.
 */
export function getBridgedEventCount(): number {
  return bridgedEvents.length
}

/**
 * Clear the event buffer.
 */
export function clearBridgedEvents(): void {
  bridgedEvents.length = 0
}

// ============================================================
// Event → Notification Mapping
// ============================================================

/**
 * Map a CentralBrainEvent to a user-facing SSE NotificationEvent.
 * Returns null if the event should be filtered out.
 */
function toNotificationEvent(event: CentralBrainEvent): NotificationEvent | null {
  const timestamp = new Date().toISOString()
  const id = `cb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  switch (event.type) {
    case "agent_registered":
      return {
        id,
        type: "system",
        title: "Agent registered",
        description: `${event.agentType} — ${event.registration.displayName}`,
        variant: "info",
        timestamp,
        metadata: { agentType: event.agentType } as Record<string, unknown>,
      }

    case "agent_status_changed":
      return {
        id,
        type: "system",
        title: `Agent ${event.status}`,
        description: `${event.agentType} status changed to ${event.status}`,
        variant: event.status === "error" ? "error" : event.status === "active" ? "info" : "default",
        timestamp,
        metadata: { agentType: event.agentType, status: event.status } as Record<string, unknown>,
      }

    case "message_sent":
      return {
        id,
        type: "system",
        title: `Message: ${event.message.type}`,
        description: `${event.message.source} → ${event.message.target}: ${event.message.type}`,
        variant: event.message.priority === "critical" ? "warning" : "default",
        timestamp,
        link: "/central-brain",
        metadata: {
          messageId: event.message.id,
          source: event.message.source,
          target: event.message.target,
          priority: event.message.priority,
          correlationId: event.message.correlationId,
        } as Record<string, unknown>,
      }

    case "message_delivered":
      return null // Too verbose for notifications — delivery is implicit

    case "action_executing":
      return {
        id,
        type: "hermes",
        title: `🤖 ${event.agentType} executing`,
        description: event.action.substring(0, 120),
        variant: "info",
        timestamp,
        link: "/central-brain",
        metadata: { agentType: event.agentType, action: event.action, correlationId: event.correlationId } as Record<string, unknown>,
      }

    case "action_completed":
      return {
        id,
        type: "hermes",
        title: event.success
          ? `✅ ${event.agentType} completed`
          : `❌ ${event.agentType} failed`,
        description: `${event.action.substring(0, 80)} — ${(event.durationMs / 1000).toFixed(1)}s`,
        variant: event.success ? "success" : "error",
        timestamp,
        link: "/central-brain",
        metadata: {
          agentType: event.agentType,
          action: event.action,
          success: event.success,
          durationMs: event.durationMs,
          correlationId: event.correlationId,
        } as Record<string, unknown>,
      }

    case "orchestration_started":
      return {
        id,
        type: "hermes",
        title: "🧠 Orchestration started",
        description: event.objective.substring(0, 120),
        variant: "info",
        timestamp,
        link: "/central-brain",
        metadata: { workflowId: event.workflowId, objective: event.objective } as Record<string, unknown>,
      }

    case "orchestration_completed":
      return {
        id,
        type: "hermes",
        title: event.status === "completed"
          ? "✅ Orchestration completed"
          : "⚠️ Orchestration finished with errors",
        description: `Status: ${event.status} — ${(event.durationMs / 1000).toFixed(1)}s`,
        variant: event.status === "completed" ? "success" : "warning",
        timestamp,
        link: "/central-brain",
        metadata: { workflowId: event.workflowId, status: event.status, durationMs: event.durationMs } as Record<string, unknown>,
      }

    case "insight_discovered":
      return {
        id,
        type: "system",
        title: `💡 ${event.insight.title}`,
        description: event.insight.description.substring(0, 160),
        variant: "info",
        timestamp,
        metadata: {
          agentType: event.insight.agentType,
          category: event.insight.category,
          insightId: event.insight.id,
        } as Record<string, unknown>,
      }

    case "log_entry":
      return null // Log entries are too granular for notifications

    case "error":
      return {
        id,
        type: "system",
        title: `⚠️ Error: ${event.source}`,
        description: event.error.substring(0, 200),
        variant: "error",
        timestamp,
        metadata: { source: event.source, correlationId: event.correlationId } as Record<string, unknown>,
      }

    default:
      return null
  }
}

// ============================================================
// Bridge Initialisation
// ============================================================

let bridgeInitialized = false

/**
 * Initialise the Central Brain → SSE bridge.
 *
 * Idempotent — safe to call multiple times. Only one subscription
 * is created regardless of how many times this is called.
 *
 * Called once on server startup (e.g., from layout or API middleware).
 */
export function initCentralBrainBridge(): void {
  if (bridgeInitialized) return
  bridgeInitialized = true

  centralBrain.onEvent((event: CentralBrainEvent) => {
    // 1. Buffer for REST API
    const bridged: BridgedEvent = {
      id: `bridge-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: event.type,
      summary: `${event.type}`,
      details: extractDetails(event),
    }
    bufferEvent(bridged)

    // 2. Forward to SSE notifications for all connected users
    const notification = toNotificationEvent(event)
    if (notification) {
      const userIds = getConnectedUserIds()
      for (const uid of userIds) {
        emitToUser(uid, notification)
      }
    }
  })
}

/**
 * Extract a JSON-serialisable details object from any CentralBrainEvent.
 */
function extractDetails(event: CentralBrainEvent): Record<string, unknown> | undefined {
  try {
    // Strip out non-serialisable parts and keep a clean summary
    const { type, ...rest } = event as any
    return rest
  } catch {
    return undefined
  }
}

/**
 * Check whether the bridge has been initialised.
 */
export function isBridgeInitialized(): boolean {
  return bridgeInitialized
}

/**
 * Reset the bridge (for testing).
 */
export function resetBridgeForTest(): void {
  bridgeInitialized = false
  bridgedEvents.length = 0
}
