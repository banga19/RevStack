"use client"

import { useEffect, useRef, useCallback, useState } from "react"

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error"

export interface CentralBrainAgentEvent {
  type: string
  summary: string
  timestamp: string
  details?: Record<string, unknown>
}

interface UseCentralBrainSSEOptions {
  /** Event types to filter (comma-separated, e.g. "action_executing,action_completed,error") */
  eventTypes?: string
  /** Maximum number of events to buffer */
  maxBuffer?: number
  /** Whether to auto-connect on mount */
  autoConnect?: boolean
}

interface UseCentralBrainSSEResult {
  /** All buffered events from newest to oldest */
  events: CentralBrainAgentEvent[]
  /** Latest event (for quick access) */
  latest: CentralBrainAgentEvent | null
  /** Connection status */
  status: ConnectionStatus
  /** Clear all buffered events */
  clear: () => void
}

/**
 * useCentralBrainSSE — Connect to the Hermes Central Brain SSE stream.
 *
 * Streams real-time agent communication events (actions, messages,
 * orchestrations, errors) from the Central Brain MessageBus and
 * CommunicationLog. Filter by event type using the eventTypes option.
 *
 * Example:
 *   const { events, status } = useCentralBrainSSE({
 *     eventTypes: "action_executing,action_completed,error",
 *   })
 */
export function useCentralBrainSSE(
  options: UseCentralBrainSSEOptions = {}
): UseCentralBrainSSEResult {
  const { eventTypes, maxBuffer = 50, autoConnect = true } = options

  const [events, setEvents] = useState<CentralBrainAgentEvent[]>([])
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setStatus("connecting")

    try {
      // Build the SSE URL with optional type filter
      const params = new URLSearchParams()
      if (eventTypes) {
        params.set("types", eventTypes)
      }
      const query = params.toString()
      const url = `/api/central-brain/stream${query ? `?${query}` : ""}`

      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onopen = () => {
        setStatus("connected")
        attemptRef.current = 0
      }

      es.onmessage = (event) => {
        try {
          const raw = typeof event.data === "string" ? event.data.trim() : ""
          if (!raw || raw.startsWith(":")) return
          const data = JSON.parse(raw) as CentralBrainAgentEvent & { type: string }

          // Skip heartbeat/connected events
          if (data.type === "connected") return

          setEvents((prev) => {
            const next = [data, ...prev]
            return next.length > maxBuffer ? next.slice(0, maxBuffer) : next
          })
        } catch {
          // Ignore malformed messages
        }
      }

      es.onerror = () => {
        setStatus("error")
        es.close()
        eventSourceRef.current = null

        // Exponential backoff: 1s, 2s, 4s, 8s, ... up to 30s
        const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 30_000)
        attemptRef.current++

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    } catch {
      setStatus("error")
    }
  }, [eventTypes, maxBuffer])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setStatus("disconnected")
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }
    return () => disconnect()
  }, [autoConnect, connect, disconnect])

  const clear = useCallback(() => {
    setEvents([])
  }, [])

  return {
    events,
    latest: events[0] || null,
    status,
    clear,
  }
}
