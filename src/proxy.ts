/**
 * Edge middleware: auth, rate limiting, and security headers.
 *
 * Current responsibilities:
 *  - Fast-reject unauthenticated requests using ABAC `dashboard:read`
 *  - Apply per-path rate limits from `getDefaultLimits()`
 *  - Apply security headers to every response
 *
 * Subscription gating for app routes is now owned by the app proxy handler.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit, RateLimitError, getDefaultLimits, ipFromRequest } from "@/lib/rate-limiter"
import { applySecurityHeaders } from "@/lib/security-headers"
import { checkAccessFromSession } from "@/lib/abac"

const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/cron/",
  "/api/health",
  "/api/csrf",
  "/api/subscribe",
  "/api/pricing",
  "/api/payments/webhook",
  "/api/push/",
]

const ALWAYS_ALLOWED_API = [
  "/api/subscription",
  "/api/ers/snapshots",
]

function isPublicApiRoute(pathname: string, method: string): boolean {
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true
  if (method === "GET" && ALWAYS_ALLOWED_API.some((p) => pathname.startsWith(p))) return true
  return false
}

export default function proxy() {
  return async (req: NextRequest) => {
    const { pathname, method } = req
    const ip = ipFromRequest(req)

    if (!isPublicApiRoute(pathname, method || "GET")) {
      try {
        const limit = getDefaultLimits().find((c) => pathname.startsWith(c.pathPrefix))
        const config = limit || { pathPrefix: "/api", max: 100, windowMs: 60_000 }
        checkRateLimit(ip, config)
      } catch (err) {
        if (err instanceof RateLimitError) {
          const res = NextResponse.json(
            { error: "Too many requests", retryAfter: err.retryAfter },
            { status: 429 }
          )
          res.headers.set("Retry-After", String(err.retryAfter))
          return applySecurityHeaders(res)
        }
        console.error("[RateLimiter] unexpected error", err)
      }
    }

    try {
      const { decision } = await checkAccessFromSession("dashboard", "read")
      if (!decision.allowed) {
        const blocked = NextResponse.json(
          { error: decision.reason, code: "access_denied" },
          { status: isPublicApiRoute(pathname, method || "GET") ? 403 : 401 }
        )
        return applySecurityHeaders(blocked)
      }
    } catch {
      // Allow degraded mode when DB/ABAC is unavailable
    }

    const res = NextResponse.next()
    return applySecurityHeaders(res)
  }
}
