/**
 * SSE Registry — In-Memory Client Registry for Server-Sent Events
 *
 * Shared module that both the SSE stream route and background workers
 * can import to emit real-time events to connected clients.
 *
 * Usage (server-side emit):
 *   import { emitToUser } from "@/lib/sse-registry"
 *   emitToUser(userId, { id: "...", type: "system", title: "Done", ... })
 */

// ── In-Memory Client Registry ──────────────────────────────────────────────
// Key: userId, Value: Set of ReadableStream controllers
const clients = new Map<string, Set<ReadableStreamDefaultController>>()

// ── Types ──────────────────────────────────────────────────────────────────

export type NotificationEvent = {
  id: string
  type: "lead" | "payment" | "trial" | "subscription" | "outreach" | "campaign" | "system" | "hermes"
  title: string
  description?: string
  variant?: "default" | "success" | "error" | "warning" | "info"
  link?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// ── Emit to all connected clients for a user ───────────────────────────────

export function emitToUser(userId: string, event: NotificationEvent) {
  const userClients = clients.get(userId)
  if (!userClients) return { delivered: 0 }

  const data = `data: ${JSON.stringify(event)}\n\n`
  let delivered = 0

  for (const controller of userClients) {
    try {
      controller.enqueue(new TextEncoder().encode(data))
      delivered++
    } catch {
      // Client disconnected — will be cleaned up on next heartbeat
      userClients.delete(controller)
    }
  }

  if (userClients.size === 0) {
    clients.delete(userId)
  }

  return { delivered }
}

// ── Registry access for the stream route ───────────────────────────────────

export function registerClient(userId: string, controller: ReadableStreamDefaultController) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set())
  }
  clients.get(userId)!.add(controller)
}

export function unregisterClient(userId: string, controller: ReadableStreamDefaultController) {
  const userClients = clients.get(userId)
  if (userClients) {
    userClients.delete(controller)
    if (userClients.size === 0) {
      clients.delete(userId)
    }
  }
}

export function getConnectedUserIds(): string[] {
  return Array.from(clients.keys())
}
