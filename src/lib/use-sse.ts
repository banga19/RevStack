"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import type { NotificationEvent } from "@/app/api/notifications/stream/route"

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error"

interface UseSSEOptions {
  /** Maximum number of notifications to buffer in memory */
  maxBuffer?: number
  /** Whether to auto-connect on mount */
  autoConnect?: boolean
  /** Reconnection delay in ms (exponential backoff starting value) */
  reconnectDelay?: number
}

interface UseSSEResult {
  /** All buffered notifications */
  notifications: NotificationEvent[]
  /** Latest notification (for quick access) */
  latest: NotificationEvent | null
  /** Connection status */
  status: ConnectionStatus
  /** Clear all buffered notifications */
  clear: () => void
  /** Manually reconnect */
  reconnect: () => void
}

/**
 * useSSE — Connect to the server-sent events notification stream.
 *
 * Automatically reconnects with exponential backoff on disconnect.
 * Buffers notifications in memory (configurable max).
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEResult {
  const {
    maxBuffer = 50,
    autoConnect = true,
    reconnectDelay = 1000,
  } = options

  const [notifications, setNotifications] = useState<NotificationEvent[]>([])
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
      const es = new EventSource("/api/notifications/stream")
      eventSourceRef.current = es

      es.onopen = () => {
        setStatus("connected")
        attemptRef.current = 0 // Reset backoff on successful connection
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NotificationEvent

          // Skip heartbeat/connected events — they're informational
          if (data.id === "connected") return

          setNotifications((prev) => {
            const next = [data, ...prev]
            return next.length > maxBuffer ? next.slice(0, maxBuffer) : next
          })
        } catch {
          // Ignore malformed messages (e.g. heartbeats that aren't JSON)
        }
      }

      es.onerror = () => {
        setStatus("error")
        es.close()
        eventSourceRef.current = null

        // Exponential backoff: 1s, 2s, 4s, 8s, ... up to 30s
        const delay = Math.min(reconnectDelay * Math.pow(2, attemptRef.current), 30_000)
        attemptRef.current++

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    } catch {
      setStatus("error")
    }
  }, [maxBuffer, reconnectDelay])

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
    setNotifications([])
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    attemptRef.current = 0
    connect()
  }, [disconnect, connect])

  return {
    notifications,
    latest: notifications[0] || null,
    status,
    clear,
    reconnect,
  }
}
