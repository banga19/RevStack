"use client"

import React, { createContext, useContext, useCallback, useEffect, useState } from "react"
import { useSSE } from "@/lib/use-sse"
import type { NotificationEvent } from "@/app/api/notifications/stream/route"
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastClose,
  type ToastVariant,
} from "@/components/ui/toast"

// ── Context ────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  /** All buffered notifications */
  notifications: NotificationEvent[]
  /** Latest notification */
  latest: NotificationEvent | null
  /** Connection status */
  status: "connecting" | "connected" | "disconnected" | "error"
  /** Unread count (total notifications in buffer) */
  unreadCount: number
  /** Clear all notifications */
  clearNotifications: () => void
  /** Manually reconnect SSE */
  reconnect: () => void
  /** Manually show a toast (useful for local events) */
  showToast: (event: Omit<NotificationEvent, "id" | "timestamp">) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return ctx
}

// ── Toast Manager ──────────────────────────────────────────────────────────

type ToastEntry = {
  id: string
  event: NotificationEvent
  open: boolean
}

// ── Provider ───────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { notifications, latest, status, clear, reconnect } = useSSE({
    maxBuffer: 100,
  })

  const [toasts, setToasts] = useState<ToastEntry[]>([])

  // Show toast when a new notification arrives
  useEffect(() => {
    if (latest && latest.id !== "connected") {
      setToasts((prev) => [
        ...prev,
        { id: latest.id, event: latest, open: true },
      ])
    }
  }, [latest])

  // Clean up dismissed toasts after animation (Radix handles auto-dismiss via duration={6000} on ToastProvider)
  const handleDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Manually show a toast
  const showToast = useCallback((event: Omit<NotificationEvent, "id" | "timestamp">) => {
    const id = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const full: NotificationEvent = {
      ...event,
      id,
      timestamp: new Date().toISOString(),
    }
    setToasts((prev) => [...prev, { id, event: full, open: true }])
  }, [])

  const value: NotificationContextValue = {
    notifications,
    latest: latest?.id === "connected" ? null : latest,
    status,
    unreadCount: notifications.length,
    clearNotifications: clear,
    reconnect,
    showToast,
  }

  return (
    <NotificationContext.Provider value={value}>
      <ToastProvider swipeDirection="right" duration={6000}>
        {children}

        {/* Toast Stack — rendered at the top-right of the screen */}
        <ToastViewport>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              open={toast.open}
              onOpenChange={(open) => {
                if (!open) handleDismiss(toast.id)
              }}
              variant={toast.event.variant as ToastVariant || "default"}
              title={toast.event.title}
              description={toast.event.description}
              onDismiss={() => handleDismiss(toast.id)}
            />
          ))}
        </ToastViewport>
      </ToastProvider>
    </NotificationContext.Provider>
  )
}
