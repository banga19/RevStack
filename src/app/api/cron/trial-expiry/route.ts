import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { expireTrials } from "@/lib/subscription-followups"

/**
 * Cron endpoint to auto-expire free trials that have passed their 3-day window.
 *
 * This should be called daily by an external cron service (cron-job.org,
 * GitHub Actions, Vercel Cron, etc.) at:
 *   GET /api/cron/trial-expiry
 *
 * It checks all users with subscriptionStatus === 'trial' whose trialEndsAt
 * is in the past, and sets their status to 'expired'.
 *
 * Security: Validates via:
 *   1. x-cron-secret header matching CRON_SECRET env var
 *   2. Admin session (for manual testing)
 *   3. Dev mode fallback (cron-trigger-dev)
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const session = await auth()

    // Check x-cron-secret header (matching server env var)
    const headerSecret = req.headers.get("x-cron-secret")
    const headerMatch = cronSecret && headerSecret && cronSecret === headerSecret

    // Check admin session (for manual testing)
    const isAdmin = session?.user?.role === "admin"

    // Dev mode: also allow "cron-trigger-dev" as fallback secret
    const isDevMode = cronSecret === "cron-trigger-dev"

    if (!headerMatch && !isAdmin && !isDevMode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await expireTrials()

    return NextResponse.json({
      success: true,
      expired: result.expired,
      alreadyExpired: result.alreadyExpired,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Cron] Trial expiry error:", error)
    return NextResponse.json({ error: "Failed to expire trials" }, { status: 500 })
  }
}
