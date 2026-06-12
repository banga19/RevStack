import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { auth } from "@/lib/auth"
import { processFollowUps } from "@/lib/subscription-followups"

/**
 * Cron endpoint to process subscription follow-ups.
 *
 * This should be called daily by an external cron service (cron-job.org,
 * GitHub Actions, Vercel Cron, etc.) at:
 *   GET /api/cron/subscription-followups
 *
 * Security: Validates via:
 *   1. x-cron-secret header — constant-time comparison against CRON_SECRET env var
 *   2. Admin session (for manual testing)
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: "Server misconfigured — CRON_SECRET missing" }, { status: 500 })
    }

    const session = await auth()
    const isAdmin = session?.user?.role === "admin"

    const headerSecret = req.headers.get("x-cron-secret")
    const headerMatch = !!headerSecret && headerSecret.length === cronSecret.length &&
      crypto.timingSafeEqual(Buffer.from(headerSecret), Buffer.from(cronSecret))

    if (!headerMatch && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await processFollowUps()

    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent.length,
      errors: result.errors.length,
      details: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Cron] Subscription follow-ups error:", error)
    return NextResponse.json({ error: "Failed to process follow-ups" }, { status: 500 })
  }
}
