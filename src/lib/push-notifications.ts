/**
 * Push notification configuration and utilities.
 *
 * To generate fresh VAPID keys:
 *   npx web-push generate-vapid-keys
 *
 * Then set these environment variables in .env:
 *   VAPID_PUBLIC_KEY=<public key>
 *   VAPID_PRIVATE_KEY=<private key>
 *   VAPID_SUBJECT=mailto:your@email.com
 *
 * If environment variables are not set, defaults from development are used.
 */

import webpush from "web-push"

// Fallback dev keys — replace with real env vars in production
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  "BK_tK35a8U1u8zDXRd43cqh5nBNezL3b8QjlemzuMgH3Z-vnSXBNZIWn4R74gsZgsM01Ye0981uLctkzifT3q0M"

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "zFQXKJprGwYKmsq-JVeLwCnH4vYYgzreQEAXQvy5c-I"

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:push@mapato.app"

// Configure web-push with VAPID details
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

export { VAPID_PUBLIC_KEY, webpush }

// In-memory subscription store (replace with DB in production)
export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userId?: string
  subscribedAt: string
}

let subscriptions: PushSubscription[] = []

export function getSubscriptions(): PushSubscription[] {
  return [...subscriptions]
}

export function addSubscription(sub: PushSubscription): void {
  // Remove existing subscription with same endpoint (refresh)
  subscriptions = subscriptions.filter((s) => s.endpoint !== sub.endpoint)
  subscriptions.push(sub)
}

export function removeSubscription(endpoint: string): void {
  subscriptions = subscriptions.filter((s) => s.endpoint !== endpoint)
}

/**
 * Send a push notification to all subscribed clients.
 */
export async function sendPushNotification(
  title: string,
  options: {
    body?: string
    icon?: string
    badge?: string
    url?: string
    tag?: string
  } = {}
): Promise<{ success: number; failed: number }> {
  const payload = JSON.stringify({
    title,
    body: options.body || "",
    icon: options.icon || "/icons/icon.svg",
    badge: options.badge || "/icons/icon-192x192.png",
    data: {
      url: options.url || "/",
    },
    tag: options.tag || "mapato-notification",
  })

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      )
    )
  )

  const succeeded = results.filter((r) => r.status === "fulfilled").length
  const failed = results.filter((r) => r.status === "rejected").length

  // Remove invalid endpoints
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const err = result.reason as Error
      if (
        err.message.includes("410") ||
        err.message.includes("not found") ||
        err.message.includes("expired")
      ) {
        removeSubscription(subscriptions[index]?.endpoint)
      }
    }
  })

  return { success: succeeded, failed }
}
