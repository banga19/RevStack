"use client"

/**
 * Analytics Service
 *
 * Tracks key business events via PostHog. Falls back gracefully when
 * PostHog isn't configured (logs to console in dev).
 *
 * Environment variables:
 *   NEXT_PUBLIC_POSTHOG_KEY — enables PostHog tracking
 *
 * Usage in components:
 *   import { trackSignUp, trackFeatureUsed } from "@/lib/analytics"
 *   trackSignUp(userId, "credentials")
 */

import posthog from "posthog-js"

// ============================================================
// Types
// ============================================================

export type AnalyticsEvent =
  | "signup"
  | "login"
  | "logout"
  | "onboarding_started"
  | "onboarding_completed"
  | "trial_started"
  | "subscription_created"
  | "subscription_cancelled"
  | "god_mode_deployed"
  | "feature_used"
  | "page_view"
  | "lead_qualified"
  | "lead_converted"
  | "trade_match_found"
  | "compliance_alert_sent"
  | "outreach_sent"
  | "pipeline_updated"

// ============================================================
// Core Track Function
// ============================================================

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

/**
 * Track an analytics event via PostHog.
 * Falls back to console.log in development when PostHog isn't configured.
 */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, any>
) {
  const payload = {
    event,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
  }

  if (POSTHOG_KEY && typeof window !== "undefined") {
    try {
      posthog.capture(event, properties || {})
    } catch {
      // Silently fail — analytics should never block the app
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.log("[Analytics]", event, properties)
  }
}

// ============================================================
// Predefined Tracking Functions for Key Events
// ============================================================

export function trackSignUp(userId: string, method: "credentials" | "google") {
  trackEvent("signup", { userId, method })
  if (POSTHOG_KEY && typeof window !== "undefined") {
    try {
      posthog.identify(userId, { signupMethod: method })
    } catch {
      // non-critical
    }
  }
}

export function trackLogin(userId: string, method: "credentials" | "google") {
  trackEvent("login", { userId, method })
  if (POSTHOG_KEY && typeof window !== "undefined") {
    try {
      posthog.identify(userId)
    } catch {
      // non-critical
    }
  }
}

export function trackOnboardingStarted(userId: string) {
  trackEvent("onboarding_started", { userId })
}

export function trackOnboardingCompleted(userId: string, businessName: string) {
  trackEvent("onboarding_completed", { userId, businessName })
  if (POSTHOG_KEY && typeof window !== "undefined") {
    try {
      posthog.people.set({ businessName, onboardingCompleted: true })
    } catch {
      // non-critical
    }
  }
}

export function trackTrialStarted(userId: string) {
  trackEvent("trial_started", { userId })
  if (POSTHOG_KEY && typeof window !== "undefined") {
    try {
      posthog.people.set({ trialStarted: true })
    } catch {
      // non-critical
    }
  }
}

export function trackSubscriptionCreated(
  userId: string,
  tier: string,
  plan: string
) {
  trackEvent("subscription_created", { userId, tier, plan })
  if (POSTHOG_KEY && typeof window !== "undefined") {
    try {
      posthog.people.set({ tier, plan, subscriptionActive: true })
      posthog.group("tier", tier, { name: tier, plan })
    } catch {
      // non-critical
    }
  }
}

export function trackGodModeDeployed(
  userId: string,
  objective: string,
  agents: string[]
) {
  trackEvent("god_mode_deployed", { userId, objective, agents })
}

export function trackFeatureUsed(userId: string, feature: string) {
  trackEvent("feature_used", { userId, feature })
}

export function trackLeadQualified(
  userId: string,
  leadId: string,
  score: number
) {
  trackEvent("lead_qualified", { userId, leadId, score })
}

export function trackLeadConverted(
  userId: string,
  leadId: string,
  dealValue: number
) {
  trackEvent("lead_converted", { userId, leadId, dealValue })
}

export function trackTradeMatch(
  userId: string,
  supplierId: string,
  buyerId: string,
  matchScore: number
) {
  trackEvent("trade_match_found", {
    userId,
    supplierId,
    buyerId,
    matchScore,
  })
}

export function trackComplianceAlert(userId: string, certType: string) {
  trackEvent("compliance_alert_sent", { userId, certType })
}

export function trackOutreachSent(
  userId: string,
  channel: string,
  recipientCount: number
) {
  trackEvent("outreach_sent", { userId, channel, recipientCount })
}

// ============================================================
// PostHog Feature Flag Helpers
// ============================================================

/**
 * Check if a PostHog feature flag is enabled for the current user.
 * Returns null if PostHog is not configured.
 */
export function isFeatureEnabled(flagKey: string): boolean | null | undefined {
  if (!POSTHOG_KEY || typeof window === "undefined") return null
  try {
    return posthog.isFeatureEnabled(flagKey)
  } catch {
    return null
  }
}

/**
 * Get the payload of a PostHog feature flag.
 */
export function getFeatureFlagPayload(
  flagKey: string
): Record<string, any> | null {
  if (!POSTHOG_KEY || typeof window === "undefined") return null
  try {
    return posthog.getFeatureFlagPayload(flagKey) as Record<string, any> | null
  } catch {
    return null
  }
}

/**
 * Reload feature flags (call after user identifies/login).
 */
export function reloadFeatureFlags(): void {
  if (!POSTHOG_KEY || typeof window === "undefined") return
  try {
    posthog.reloadFeatureFlags()
  } catch {
    // non-critical
  }
}
