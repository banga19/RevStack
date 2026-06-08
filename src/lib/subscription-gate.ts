/**
 * Server-Side Subscription Gate
 *
 * Utility for API route handlers to check if the user has an active
 * trial or subscription. Route handlers can call checkSubscriptionAccess()
 * to block requests from users with expired trials.
 *
 * Usage:
 *   import { checkSubscriptionAccess } from "@/lib/subscription-gate"
 *
 *   const gate = await checkSubscriptionAccess(userId)
 *   if (!gate.allowed) {
 *     return NextResponse.json({ error: gate.message, code: gate.code }, { status: 403 })
 *   }
 */

import { prisma } from "@/lib/db"

export interface SubscriptionGateResult {
  allowed: boolean
  message: string
  code: "active" | "expired" | "trial-active" | "no-subscription" | "admin-bypass"
  details: {
    status: string | null
    tier: string | null
    daysRemaining: number
    isExpired: boolean
    isAdmin: boolean
  }
}

/**
 * Check if the user has access based on their subscription/trial status.
 * Admin users always bypass the gate.
 */
export async function checkSubscriptionAccess(userId: string): Promise<SubscriptionGateResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      subscriptionStatus: true,
      subscriptionTier: true,
      trialStartsAt: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
    },
  })

  if (!user) {
    return {
      allowed: false,
      message: "User not found",
      code: "no-subscription",
      details: { status: null, tier: null, daysRemaining: 0, isExpired: false, isAdmin: false },
    }
  }

  // Admin users always bypass
  if (user.role === "admin") {
    return {
      allowed: true,
      message: "Admin access granted",
      code: "admin-bypass",
      details: { status: "active", tier: "enterprise", daysRemaining: 999, isExpired: false, isAdmin: true },
    }
  }

  const now = new Date()
  const trialEnd = user.trialEndsAt || (user.trialStartsAt
    ? new Date(user.trialStartsAt.getTime() + 3 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000))

  const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const isTrialExpired = daysRemaining <= 0 && user.subscriptionStatus === "trial"
  const isActiveSubscription = user.subscriptionStatus === "active"
  const isTrialActive = user.subscriptionStatus === "trial" && !isTrialExpired

  if (isActiveSubscription) {
    // Check if subscription has ended
    if (user.subscriptionEndsAt && user.subscriptionEndsAt < now) {
      return {
        allowed: false,
        message: "Your subscription has ended. Renew to regain access.",
        code: "expired",
        details: { status: "expired", tier: user.subscriptionTier, daysRemaining: 0, isExpired: true, isAdmin: false },
      }
    }

    return {
      allowed: true,
      message: "Active subscription",
      code: "active",
      details: { status: "active", tier: user.subscriptionTier, daysRemaining, isExpired: false, isAdmin: false },
    }
  }

  if (isTrialActive) {
    return {
      allowed: true,
      message: `Active trial — ${daysRemaining} days remaining`,
      code: "trial-active",
      details: { status: "trial", tier: user.subscriptionTier, daysRemaining, isExpired: false, isAdmin: false },
    }
  }

  // Trial expired or other status (canceled, past_due, expired)
  if (isTrialExpired || user.subscriptionStatus === "expired") {
    return {
      allowed: false,
      message: "Your 3-day free trial has ended. Subscribe to a plan to continue using Mapato.",
      code: "expired",
      details: { status: "expired", tier: user.subscriptionTier, daysRemaining: 0, isExpired: true, isAdmin: false },
    }
  }

  // Default: blocked
  return {
    allowed: false,
    message: "No active subscription. Choose a plan to get started.",
    code: "no-subscription",
    details: { status: user.subscriptionStatus, tier: user.subscriptionTier, daysRemaining, isExpired: true, isAdmin: false },
  }
}

/**
 * Quick check — returns true if the user should be blocked.
 */
export async function isBlocked(userId: string): Promise<boolean> {
  const result = await checkSubscriptionAccess(userId)
  return !result.allowed
}
