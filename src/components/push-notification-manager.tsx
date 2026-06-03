"use client"

import { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Bell, BellOff, Loader2 } from "lucide-react"

/**
 * Utility to convert a base64-URL string to a Uint8Array for the
 * applicationServerKey in PushSubscriptionOptions.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * PushNotificationManager handles:
 * 1. Checking if push notifications are supported
 * 2. Requesting permission from the user
 * 3. Subscribing to push via the browser's Push API
 * 4. Sending the subscription to our backend
 * 5. Unsubscribing
 */
// Auth pages where the push notification prompt should be hidden
const AUTH_PAGES = ["/login", "/signup", "/onboarding", "/needs-assessment", "/terms", "/privacy"]

export function PushNotificationManager() {
  const pathname = usePathname()
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [swReady, setSwReady] = useState(false)

  // Register the service worker and check browser support on mount
  useEffect(() => {
    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window

    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)

      // Explicitly register the service worker (in addition to manifest registration)
      // This ensures the SW is available for push notifications
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          setSwReady(true)
          // Check for updates to the service worker
          reg.update()
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err)
        })
    }
  }, [])

  // Check if already subscribed
  useEffect(() => {
    if (!isSupported || permission !== "granted") return

    async function checkSubscription() {
      try {
        const reg = await navigator.serviceWorker.ready
        setSwReady(true)
        const sub = await reg.pushManager.getSubscription()
        setIsSubscribed(!!sub)
      } catch {
        // Service worker not ready yet or error
      }
    }
    checkSubscription()
  }, [isSupported, permission])

  const subscribe = useCallback(async () => {
    if (!isSupported) return
    setLoading(true)

    try {
      // Request permission if needed
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission()
        setPermission(result)
        if (result !== "granted") {
          setLoading(false)
          return
        }
      }

      if (Notification.permission !== "granted") {
        setLoading(false)
        return
      }

      // Ensure service worker is registered
      const reg = await navigator.serviceWorker.ready
      setSwReady(true)

      // Get existing subscription or create new one
      let subscription = await reg.pushManager.getSubscription()
      if (!subscription) {
        const vapidPublicKey = await fetchVapidPublicKey()
        if (!vapidPublicKey) {
          console.error("Failed to get VAPID public key")
          setLoading(false)
          return
        }

        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as string,
        })
      }

      // Send subscription to backend
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (response.ok) {
        setIsSubscribed(true)
        // Show a quick confirmation notification
        if (Notification.permission === "granted") {
          new Notification("Notifications Enabled", {
            body: "You'll now receive updates from Mapato.",
            icon: "/icons/icon.svg",
          })
        }
      }
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error)
    } finally {
      setLoading(false)
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return
    setLoading(true)

    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()

      if (subscription) {
        // Tell backend to remove subscription
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: "DELETE",
        })

        // Unsubscribe in the browser
        await subscription.unsubscribe()
        setIsSubscribed(false)
      }
    } catch (error) {
      console.error("Failed to unsubscribe:", error)
    } finally {
      setLoading(false)
    }
  }, [isSupported])

  // Hide on auth pages
  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page))
  if (isAuthPage) return null

  if (!isSupported) return null

  if (permission === "denied") return null
  if (permission === "unsupported") return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {permission === "default" && !isSubscribed && (
        <Button
          size="sm"
          variant="outline"
          onClick={subscribe}
          disabled={loading}
          className="shadow-lg bg-background/95 backdrop-blur-sm border-primary/20 hover:border-orange-500/30 transition-all duration-300 gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4 text-primary" />
          )}
          Enable Notifications
        </Button>
      )}

      {permission === "granted" && !isSubscribed && (
        <Button
          size="sm"
          variant="outline"
          onClick={subscribe}
          disabled={loading}
          className="shadow-lg bg-background/95 backdrop-blur-sm border-primary/20 hover:border-orange-500/30 transition-all duration-300 gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bell className="h-4 w-4 text-primary" />
          )}
          Enable Notifications
        </Button>
      )}

      {isSubscribed && (
        <Button
          size="sm"
          variant="outline"
          onClick={unsubscribe}
          disabled={loading}
          className="shadow-lg bg-background/95 backdrop-blur-sm border-emerald-500/30 hover:border-orange-500/30 transition-all duration-300 gap-2 text-emerald-600 dark:text-emerald-400"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          Notifications On
        </Button>
      )}
    </div>
  )
}

/**
 * Fetch the VAPID public key from our server.
 * The key is served via the manifest or a dedicated endpoint.
 */
async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    // Try to fetch from a config endpoint
    const res = await fetch("/api/push/vapid-key")
    if (res.ok) {
      const data = await res.json()
      return data.publicKey
    }
    // No fallback — if the API fails, return null so the caller can surface the error
    return null
  } catch {
    return null
  }
}
