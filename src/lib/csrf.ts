/**
 * Stateless CSRF protection via signed tokens stored in an httpOnly cookie.
 *
 * Architecture:
 * - GET /api/auth/csrf  →  sets a signed csrf cookie, returns the raw token
 * - Client includes the raw token in a `x-csrf-token` header on mutating requests
 * - Server validates the token against the cookie
 *
 * Security properties:
 * - Tokens are HMAC-signed with a server secret → cannot be forged without the secret
 * - Cookie is httpOnly + sameSite=lax → not readable by JS, sent automatically
 * - The client supplies the token in a custom header (not in the cookie) → CSRF
 *   attacker cannot set arbitrary headers cross-origin
 */

import { cookies } from "next/headers"
import crypto from "crypto"

// Note: deliberately avoid __Host- prefix so the cookie works over http in dev.
// Security is maintained via HMAC signing + httpOnly + sameSite=lax.
const TOKEN_COOKIE = "mapato-csrf"
const TOKEN_BYTES = 32
const ALGORITHM = "sha256"

/**
 * Derive the HMAC key from the NextAuth secret so we don't need a separate env var.
 */
function getHmacKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for CSRF protection")
  }
  // Use a fixed derivation so the same secret always produces the same key
  return crypto.createHash("sha256").update(secret).digest()
}

/**
 * Sign a value using HMAC-SHA256 and return the value:signature string.
 */
function sign(value: string): string {
  const hmac = crypto.createHmac(ALGORITHM, getHmacKey())
  hmac.update(value)
  return `${value}.${hmac.digest("hex")}`
}

/**
 * Verify a signed value. Returns the original value if valid, null otherwise.
 */
function verify(signed: string): string | null {
  const dot = signed.lastIndexOf(".")
  if (dot === -1) return null

  const value = signed.slice(0, dot)
  const expectedSig = signed.slice(dot + 1)

  const hmac = crypto.createHmac(ALGORITHM, getHmacKey())
  hmac.update(value)
  const actualSig = hmac.digest("hex")

  // Constant-time comparison to prevent timing attacks
  if (expectedSig.length !== actualSig.length) return null

  return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(actualSig))
    ? value
    : null
}

/**
 * Set the CSRF cookie and return the raw (unsigned) token.
 * Call this from GET /api/auth/csrf.
 */
export async function setCsrfCookie(): Promise<{ token: string }> {
  const cookieStore = await cookies()
  const raw = crypto.randomBytes(TOKEN_BYTES).toString("hex")
  const signed = sign(raw)

  cookieStore.set(TOKEN_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  })

  return { token: raw }
}

/**
 * Validate a CSRF token submitted in a custom header against the cookie.
 * Call this from any API route that requires CSRF protection.
 *
 * Example usage in an API route:
 *   const check = await validateCsrf(request)
 *   if (!check.valid) {
 *     return NextResponse.json({ error: check.reason }, { status: 403 })
 *   }
 */
export async function validateCsrf(
  request: Request
): Promise<{ valid: true } | { valid: false; reason: string }> {
  const cookieStore = await cookies()
  const signed = cookieStore.get(TOKEN_COOKIE)?.value

  if (!signed) {
    return { valid: false, reason: "Missing CSRF cookie" }
  }

  const raw = verify(signed)
  if (!raw) {
    return { valid: false, reason: "Invalid CSRF token signature" }
  }

  // The client must echo the token in a custom header
  const header = request.headers.get("x-csrf-token")
  if (!header) {
    return { valid: false, reason: "Missing x-csrf-token header" }
  }

  // Constant-time comparison of the raw token
  if (
    header.length !== raw.length ||
    !crypto.timingSafeEqual(Buffer.from(header), Buffer.from(raw))
  ) {
    return { valid: false, reason: "CSRF token mismatch" }
  }

  return { valid: true }
}
