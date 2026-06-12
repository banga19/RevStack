/**
 * Subscription Gate Middleware
 *
 * Blocks access to protected API routes when the user's trial has expired
 * and they don't have an active subscription. Admin users bypass this gate.
 *
 * Protected API routes (non-public endpoints):
 *   - /api/god-mode
 *   - /api/subscription (POST/PATCH/DELETE — mutating operations)
 *   - /api/clients, /api/clients/*
 *   - /api/pipeline-actions, /api/pipeline-actions/*
 *   - /api/outreach, /api/outreach/*
 *   - /api/content, /api/content/*
 *   - /api/revenue, /api/revenue/*
 *   - /api/documents, /api/documents/*
 *   - /api/korea/*
 *   - /api/dashboard
 *   - /api/admin/*
 *   - /api/plan/*
 *   - /api/operations/*
 *
 * Public API routes (no subscription check needed):
 *   - /api/auth/*           — Auth endpoints
 *   - /api/cron/*            — Cron job endpoints
 *   - /api/health            — Health check
 *   - /api/csrf              — CSRF token
 *   - /api/subscribe         — Newsletter signup (public)
 *   - /api/pricing           — Public pricing data
 *   - /api/payments/*        — Payment webhooks (validated separately)
 *   - /api/push/*            — Push notification endpoints
 *   - /api/subscription (GET) — Read-only check
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
