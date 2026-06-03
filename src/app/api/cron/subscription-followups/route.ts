import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { processFollowUps } from "@/lib/subscription-followups"

/**
 * Cron endpoint to process subscription follow-ups.
 *
 * This should be called daily by an external cron service (cron-job.org,
 * GitHub Actions, Vercel Cron, etc.) at:
 *   GET /api/cron/subscription-followups
 *
 * It checks all users on trial/expired status and sends appropriate
 * follow-up messages based on where they are in the trial timeline.
 *
 * Add this to your cron provider:
 *   Schedule: 0 8 * * *  (every day at 8 AM)
 *   URL: https://your-domain.com/api/cron/subscription-followups
 *
 * Security: Validates via:
 *   1. x-cron-secret header matching CRON_SECRET env var
 *   2. Admin session (for manual testing)
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
