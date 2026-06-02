import { NextResponse } from "next/server"
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
 * Security: Requires CRON_SECRET header or admin auth.
 */
export async function GET() {
  try {
    // Authentication: check for CRON_SECRET or admin session
    const cronSecret = process.env.CRON_SECRET
    const session = await auth()

    const isAuthorized =
      session?.user?.role === "admin" ||
      (cronSecret && cronSecret === "cron-trigger-dev") // Dev mode

    if (!isAuthorized) {
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
