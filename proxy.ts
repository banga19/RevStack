/**
 * Edge-compatible proxy (Next.js 16 replaces "middleware" with "proxy").
 *
 * Uses `getToken` from next-auth/jwt instead of the `auth()` wrapper,
 * because next-auth v4 does not export `auth` from NextAuth().
 * `getToken` works in Edge Runtime (just reads/verifies the JWT cookie
 * with crypto operations — no database access needed).
 */
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import {
  checkRateLimit,
  getDefaultLimits,
  ipFromRequest,
  RateLimitError,
} from "@/lib/rate-limiter"
import { applySecurityHeaders } from "@/lib/security-headers"

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req

  // ═══════════════════════════════════════════════════════════
  // Read session via JWT (Edge-safe – no Prisma)
  // ═══════════════════════════════════════════════════════════
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isLoggedIn = !!token
  const role = token?.role as string | undefined

  // ═══════════════════════════════════════════════════════════
  // Helper: apply rate limit + security headers to a response
  // ═══════════════════════════════════════════════════════════
  const wrap = (response: Response): Response => {
    return applySecurityHeaders(response)
  }

  // ═══════════════════════════════════════════════════════════
  // Rate limiting — applies before any other logic so we
  // don't waste resources on abusers
  // ═══════════════════════════════════════════════════════════
  const ip = ipFromRequest(req)
  const limits = getDefaultLimits()

  for (const config of limits) {
    if (nextUrl.pathname.startsWith(config.pathPrefix ?? "")) {
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

  // Skip static asset files served from public/
  const staticExtensions = /\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js|json|xml|webmanifest)$/
  if (staticExtensions.test(nextUrl.pathname)) {
    return wrap(NextResponse.next())
  }

  // ═══════════════════════════════════════════════════════════
  // Auth session endpoint — served even when unauthenticated
  // ═══════════════════════════════════════════════════════════
  const isAuthRoute = nextUrl.pathname.startsWith("/api/auth/")
  if (!isLoggedIn && isAuthRoute) {
    return wrap(NextResponse.next())
  }

  // Public routes — auth pages, needs-assessment, and API
  // routes (which handle their own auth internally)
  // ═══════════════════════════════════════════════════════════
  const publicRoutes = [
    "/login",
    "/signup",
    "/needs-assessment",
    "/terms",
    "/privacy",
    "/pricing",
  ]
  let isPublicRoute = publicRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )
  if (nextUrl.pathname === "/api" || nextUrl.pathname.startsWith("/api/")) {
    isPublicRoute = true
  }

  // Landing page is always public
  if (nextUrl.pathname === "/") {
    return wrap(NextResponse.next())
  }

  if (!isLoggedIn && !isPublicRoute) {
    const callbackUrl = nextUrl.pathname + nextUrl.search
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", callbackUrl)
    return wrap(NextResponse.redirect(loginUrl))
  }

  // If logged in and on login/signup, redirect to dashboard
  if (
    isLoggedIn &&
    (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")
  ) {
    return wrap(NextResponse.redirect(new URL("/dashboard", nextUrl)))
  }

  // Admin routes require admin role
  if (
    isLoggedIn &&
    (nextUrl.pathname === "/admin" ||
      nextUrl.pathname.startsWith("/admin/"))
  ) {
    if (role !== "admin") {
      return wrap(NextResponse.redirect(new URL("/dashboard", nextUrl)))
    }
  }

  return wrap(NextResponse.next())
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|manifest.json|sw.js).*)",
  ],
}
