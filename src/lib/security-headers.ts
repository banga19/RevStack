/**
 * Security headers applied to every response through middleware.
 *
 * These headers follow standard security best practices:
 * - Content-Security-Policy (restricts what resources can load)
 * - Strict-Transport-Security (enforces HTTPS)
 * - X-Content-Type-Options (prevents MIME sniffing)
 * - X-Frame-Options (prevents clickjacking)
 * - Referrer-Policy (controls referrer info leakage)
 * - Permissions-Policy (restricts browser feature access)
 * - Cross-Origin-Embedder-Policy / Opener-Policy (COOP/COEP isolation)
 */

export interface SecurityHeadersConfig {
  /** When true, the Content-Security-Policy header is added */
  enableCsp?: boolean
  /** When true, HSTS header is added */
  enableHsts?: boolean
  /** HSTS max-age in seconds (default 1 year) */
  hstsMaxAge?: number
  /** Whether to include the `includeSubDomains` directive */
  hstsIncludeSubDomains?: boolean
  /** Frame-ancestors CSP directive value. Set to "'none'" to block all framing. */
  frameAncestors?: string
}

const DEFAULT_CONFIG: Required<SecurityHeadersConfig> = {
  enableCsp: true,
  enableHsts: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubDomains: true,
  frameAncestors: "'none'",
}

/**
 * Build a Content-Security-Policy string.
 *
 * Relaxed enough for the app to function (inline scripts/styles for
 * Next.js, recharts, etc.) while blocking most XSS vectors.
 */
function buildCsp(frameAncestors: string): string {
  const directives = [
    // Default: only same-origin
    "default-src 'self'",
    // Scripts: allow 'unsafe-inline' for Next.js hydration
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
    // Styles: allow inline styles (Next.js, recharts, framer-motion)
    `style-src 'self' 'unsafe-inline'`,
    // Images: allow data: URIs and blob: for charts
    "img-src 'self' data: blob:",
    // Fonts: self-hosted
    "font-src 'self' data:",
    // Connect: API calls + websockets
    "connect-src 'self' ws: wss:",
    // Frames: block unless overridden
    `frame-ancestors ${frameAncestors}`,
    // Form actions: only same-origin
    "form-action 'self'",
    // Base URI: restrict to same-origin
    "base-uri 'self'",
    // Object/embed: block entirely
    "object-src 'none'",
    // Manifest: same-origin
    "manifest-src 'self'",
  ].join("; ")

  return directives
}

/**
 * Apply security headers to a `NextResponse` object and return it.
 *
 * Usage in middleware:
 *   const response = applySecurityHeaders(NextResponse.next())
 *   return response
 */
export function applySecurityHeaders(
  response: Response,
  config?: SecurityHeadersConfig
): Response {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const headers = new Headers(response.headers)

  // ── Content-Security-Policy ─────────────────────────────────
  if (cfg.enableCsp) {
    headers.set("Content-Security-Policy", buildCsp(cfg.frameAncestors))
  }

  // ── Strict-Transport-Security ───────────────────────────────
  if (cfg.enableHsts) {
    let hsts = `max-age=${cfg.hstsMaxAge}`
    if (cfg.hstsIncludeSubDomains) hsts += "; includeSubDomains"
    headers.set("Strict-Transport-Security", hsts)
  }

  // ── X-Content-Type-Options ──────────────────────────────────
  headers.set("X-Content-Type-Options", "nosniff")

  // ── X-Frame-Options ─────────────────────────────────────────
  // Legacy fallback; CSP `frame-ancestors` is the modern equivalent.
  headers.set("X-Frame-Options", cfg.frameAncestors === "'none'" ? "DENY" : "SAMEORIGIN")

  // ── Referrer-Policy ─────────────────────────────────────────
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // ── Permissions-Policy ───────────────────────────────────────
  // Disable features not needed by the app to reduce attack surface.
  headers.set(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",   // FLoC / Topics API
      "browsing-topics=()",   // Topics API (successor to FLoC)
    ].join(", ")
  )

  // ── Cross-Origin isolation headers ──────────────────────────
  headers.set("Cross-Origin-Opener-Policy", "same-origin")
  headers.set("Cross-Origin-Embedder-Policy", "require-corp")

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
