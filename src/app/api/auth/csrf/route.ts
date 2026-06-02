import { NextResponse } from "next/server"
import { setCsrfCookie } from "@/lib/csrf"

/**
 * GET /api/auth/csrf
 *
 * Returns a fresh CSRF token and sets it as an httpOnly cookie.
 * The client must include the token in the `x-csrf-token` header
 * on subsequent mutating requests (POST, PUT, PATCH, DELETE).
 */
export async function GET() {
  try {
    const { token } = await setCsrfCookie()
    return NextResponse.json({ csrfToken: token })
  } catch (error) {
    console.error("CSRF token generation failed:", error)
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    )
  }
}
