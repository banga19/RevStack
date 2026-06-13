/**
 * Edge-compatible proxy (Next.js 16 replaces "middleware" with "proxy").
 *
 * Responsibilities:
 *  - Apply security headers to every response
 *  - Apply per-path rate limits before unnecessary backend work
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkRateLimit, RateLimitError, getDefaultLimits, ipFromRequest } from "@/lib/rate-limiter"
import { applySecurityHeaders } from "@/lib/security-headers"

export default async function proxy(req: NextRequest) {
  const { nextUrl } = req
  const pathname = nextUrl.pathname
  const method = req.method

  const isPublicApiRoute = (path: string) => {
    const prefixes = [
      "/api/auth/",
      "/api/cron/",
      "/api/health",
      "/api/csrf",
      "/api/subscribe",
      "/api/pricing",
      "/api/payments/webhook",
      "/api/push/",
    ]
    if (prefixes.some((p) => path.startsWith(p))) return true
    return false
  }

  const wrap = (response: Response) => applySecurityHeaders(response)

  const ip = ipFromRequest(req)
  const limits = getDefaultLimits()

  for (const config of limits) {
    if (pathname.startsWith(config.pathPrefix ?? "")) {
      try {
        checkRateLimit(ip, config)
      } catch (err) {
        if (err instanceof RateLimitError) {
          return wrap(
            new NextResponse(
              JSON.stringify({
                error: "Too many requests. Please slow down.",
                retryAfter: err.retryAfter,
              }),
              {
                status: 429,
                headers: {
                  "Content-Type": "application/json",
                  "Retry-After": String(err.retryAfter),
                },
              }
            )
          )
        }
      }
      break
    }
  }

  const staticExt = /\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js|json|xml|webmanifest)$/
  if (staticExt.test(pathname)) {
    return wrap(NextResponse.next())
  }

  return wrap(NextResponse.next())
}
