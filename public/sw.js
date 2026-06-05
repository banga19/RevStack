// Mapato PWA Service Worker
// Cache name includes version for cache busting
const CACHE_NAME = "mapato-v2"
const STATIC_CACHE = "mapato-static-v2"

// Resources to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/login",
  "/signup",
  "/needs-assessment",
  "/pricing",
  "/terms",
  "/privacy",
  "/manifest.json",
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
]

// ─────────────────────────────────────────────────────────
// INSTALL
// ─────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    })
  )
})

// ─────────────────────────────────────────────────────────
// ACTIVATE
// ─────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  // Clean old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control of all clients immediately
  event.waitUntil(clients.claim())
})

// ─────────────────────────────────────────────────────────
// FETCH — Network-first with cache fallback
// ─────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return

  // Skip browser extension requests
  if (!event.request.url.startsWith(self.location.origin)) return

  // API requests — network only (no caching for dynamic data)
  if (event.request.url.includes("/api/")) {
    return
  }

  // Navigation requests — network first, fallback to cache or offline page
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the updated page
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned)
          })
          return response
        })
        .catch(() => {
          // Fallback to cache for offline navigation
          return caches.match(event.request).then((cached) => {
            return cached || caches.match("/")
          })
        })
    )
    return
  }

  // Static assets (JS, CSS, images, fonts) — cache-first strategy
  if (
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    event.request.destination === "image" ||
    event.request.destination === "font" ||
    event.request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/i)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone())
            }
            return response
          })
        })
      })
    )
    return
  }

  // Everything else — network only (no caching for dynamic content)
  return
})

// ─────────────────────────────────────────────────────────
// PUSH — Handle incoming push notifications
// ─────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {
    title: "Mapato",
    body: "",
    icon: "/icons/icon.svg",
    badge: "/icons/icon-192x192.png",
    data: { url: "/" },
    tag: "mapato-notification",
  }

  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
    }
  } catch (e) {
    console.error("Failed to parse push notification data:", e)
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data,
    tag: data.tag,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: "open",
        title: "Open Mapato",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// ─────────────────────────────────────────────────────────
// NOTIFICATION CLICK — Handle user interaction with notifications
// ─────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const url = event.notification.data?.url || "/"

  if (event.action === "dismiss") {
    return
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If we have an existing window, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus()
          if ("navigate" in client) {
            client.navigate(url)
          }
          return
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
