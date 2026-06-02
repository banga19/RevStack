/**
 * In-memory rate limiter for API protection.
 * Uses a sliding window approach — each IP gets a counter that resets
 * after `windowMs` milliseconds. Limits are granular by path prefix.
 */

export interface RateLimitConfig {
  /** Max requests allowed within the window */
  max: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Optional — only apply to requests whose pathname starts with this */
  pathPrefix?: string
}

const windows = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of windows) {
    if (entry.resetAt <= now) windows.delete(key)
  }
}, 60_000)

/**
 * Custom error for rate-limit responses.
 */
export class RateLimitError extends Error {
  retryAfter: number

  constructor(retryAfter: number) {
    super("Too many requests")
    this.name = "RateLimitError"
    this.retryAfter = retryAfter
  }
}

/**
 * Returns an IP-like key from the request headers.
 * Falls back to "unknown" if not available.
 */
export function ipFromRequest(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

/**
 * Check whether the given key (usually IP) exceeds the configured limit.
 * Throws `RateLimitError` when the limit is hit.
 *
 * @returns the number of remaining requests for the current window
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): number {
  const now = Date.now()
  const windowKey = `${config.pathPrefix ?? "global"}::${key}`

  let entry = windows.get(windowKey)

  if (!entry || entry.resetAt <= now) {
    // Start a new window
    entry = { count: 0, resetAt: now + config.windowMs }
    windows.set(windowKey, entry)
  }

  entry.count++

  if (entry.count > config.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    throw new RateLimitError(retryAfter)
  }

  return config.max - entry.count
}

/**
 * Higher-order function that returns the standard rate-limit configs
 * used across the application.
 */
export function getDefaultLimits(): RateLimitConfig[] {
  return [
    // ── Auth endpoints — strictest limits ───────────────────
    { pathPrefix: "/api/auth/signup", max: 5, windowMs: 60_000 },         // 5 POST/min
    { pathPrefix: "/api/auth/questionnaire", max: 10, windowMs: 60_000 }, // 10 POST/min

    // ── File uploads — moderate ────────────────────────────
    { pathPrefix: "/api/documents", max: 10, windowMs: 60_000 },     // 10 requests/min (large payloads)

    // ── God Mode (expensive agent orchestration) ───────────
    { pathPrefix: "/api/god-mode", max: 6, windowMs: 60_000 },      // 6 requests/min

    // ── Subscription / billing — sensitive ─────────────────
    { pathPrefix: "/api/subscription", max: 10, windowMs: 60_000 }, // 10 requests/min

    // ── Admin — restricted ─────────────────────────────────
    { pathPrefix: "/api/admin", max: 30, windowMs: 60_000 },       // 30 requests/min

    // ── Inquiries (public-facing) ──────────────────────────
    { pathPrefix: "/api/korea/inquiries", max: 20, windowMs: 60_000 }, // 20 POST/min

    // ── General API — moderate limits ──────────────────────
    { pathPrefix: "/api", max: 100, windowMs: 60_000 },               // 100 req/min

    // ── Health check — generous ────────────────────────────
    { pathPrefix: "/api/health", max: 30, windowMs: 10_000 },         // 30 req/10s
  ]
}
