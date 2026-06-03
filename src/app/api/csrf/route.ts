import { NextResponse } from "next/server"
import { setCsrfCookie } from "@/lib/csrf"

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