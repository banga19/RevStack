/**
 * Cloudflare Turnstile — Server-Side Verification
 *
 * Turnstile is Cloudflare's free, privacy-friendly CAPTCHA alternative.
 * This module verifies the Turnstile widget response token on the server.
 *
 * Docs: https://developers.cloudflare.com/turnstile/
 *
 * Env vars:
 *   TURNSTILE_SECRET_KEY   (required) — from Cloudflare Turnstile dashboard
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY  (required) — used by the <Turnstile /> widget
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export interface TurnstileVerifyResult {
  success: boolean
  /** ISO timestamp of the challenge */
  challenge_ts?: string
  /** The hostname of the site that served the challenge */
  hostname?: string
  /** Error codes from the verification (if any) */
  "error-codes"?: string[]
  /** Action name (if set on the widget) */
  action?: string
  /** Custom data (if set on the widget) */
  cdata?: string
}

/**
 * Verify a Turnstile response token on the server side.
 * Call this from your API route handler before processing the request.
 *
 * @param token - The token from the Turnstile widget (cf-turnstile-response)
 * @param remoteIp - Optional visitor IP for extra validation
 * @returns Parsed verification result from Cloudflare
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) {
    console.warn("[Turnstile] TURNSTILE_SECRET_KEY not configured — skipping verification")
    return { success: true }
  }

  if (!token) {
    return { success: false, "error-codes": ["missing-input-response"] }
  }

  try {
    const formData = new URLSearchParams()
    formData.append("secret", secretKey)
    formData.append("response", token)
    if (remoteIp) {
      formData.append("remoteip", remoteIp)
    }

    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })

    const data: TurnstileVerifyResult = await response.json()
    return data
  } catch (error) {
    console.error("[Turnstile] Verification request failed:", error)
    return { success: false, "error-codes": ["network-error"] }
  }
}

/**
 * Middleware-style guard: throws a 403 TurnstileError if verification fails.
 * Use this in API routes to abort early on invalid Turnstile tokens.
 */
export class TurnstileError extends Error {
  status = 403

  constructor(message = "Security check failed. Please refresh and try again.") {
    super(message)
    this.name = "TurnstileError"
  }
}

export async function requireTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<void> {
  const result = await verifyTurnstileToken(token, remoteIp)
  if (!result.success) {
    throw new TurnstileError()
  }
}
