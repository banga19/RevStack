/**
 * Analytics Service
 *
 * Generic analytics wrapper that tracks key events (sign-ups, activations, retention).
 * Replace the placeholder provider with your real analytics service:
 *   - Plausible: set NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible, NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
 *   - Google Analytics: set NEXT_PUBLIC_ANALYTICS_PROVIDER=ga, NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
 *   - PostHog: set NEXT_PUBLIC_ANALYTICS_PROVIDER=posthog, NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
 *   - Custom: set NEXT_PUBLIC_ANALYTICS_PROVIDER=custom, NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://...
 */

"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

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

export interface AnalyticsProps {
  provider?: string
  plausibleDomain?: string
  gaId?: string
  posthogKey?: string
  customEndpoint?: string
}

// ============================================================
// Configuration (from env vars)
// ============================================================

const config: AnalyticsProps = {
  provider: process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || "", // e.g., "plausible", "ga", "posthog", "custom"
  plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "",
  gaId: process.env.NEXT_PUBLIC_GA_ID || "",
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || "",
  customEndpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || "",
}

// ============================================================
// Core Track Function
// ============================================================

/**
 * Track an analytics event.
 * Uses the configured provider, or falls back to console.log in development.
 */
export function trackEvent(event: AnalyticsEvent, properties?: Record<string, any>) {
  const payload = { event, properties: { ...properties, timestamp: new Date().toISOString() } }

  switch (config.provider) {
    case "plausible":
      trackPlausible(event, properties)
      break
    case "ga":
      trackGoogleAnalytics(event, properties)
      break
    case "posthog":
      trackPostHog(event, properties)
      break
    case "custom":
      trackCustomEndpoint(event, properties)
      break
    default:
      // In development, log to console
      if (process.env.NODE_ENV !== "production") {
        console.log("[Analytics]", event, properties)
      }
      break
  }
}

// ============================================================
// Provider Implementations
// ============================================================

function trackPlausible(event: string, properties?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && (window as any).plausible) {
      ;(window as any).plausible(event, { props: properties || {} })
    }
  } catch { /* silently fail */ }
}

function trackGoogleAnalytics(event: string, properties?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && (window as any).gtag) {
      ;(window as any).gtag("event", event, properties || {})
    }
  } catch { /* silently fail */ }
}

function trackPostHog(event: string, properties?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && (window as any).posthog) {
      ;(window as any).posthog.capture(event, properties || {})
    }
  } catch { /* silently fail */ }
}

function trackCustomEndpoint(event: string, properties?: Record<string, any>) {
  if (!config.customEndpoint) return
  try {
    fetch(config.customEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, properties }),
      keepalive: true,
    })
  } catch { /* silently fail */ }
}

// ============================================================
// React Hook — Automatic Page View Tracking
// ============================================================

/**
 * Hook that automatically tracks page views on route change.
 * Include in the root layout or _app component.
 */
export function usePageViewTracking() {
  const pathname = usePathname()

  useEffect(() => {
    trackEvent("page_view", { path: pathname })
  }, [pathname])
}

// ============================================================
// Predefined Tracking Functions for Key Events
// ============================================================

export function trackSignUp(userId: string, method: "credentials" | "google") {
  trackEvent("signup", { userId, method })
}

export function trackLogin(userId: string, method: "credentials" | "google") {
  trackEvent("login", { userId, method })
}

export function trackOnboardingStarted(userId: string) {
  trackEvent("onboarding_started", { userId })
}

export function trackOnboardingCompleted(userId: string, businessName: string) {
  trackEvent("onboarding_completed", { userId, businessName })
}

export function trackTrialStarted(userId: string) {
  trackEvent("trial_started", { userId })
}

export function trackSubscriptionCreated(userId: string, tier: string, plan: string) {
  trackEvent("subscription_created", { userId, tier, plan })
}

export function trackGodModeDeployed(userId: string, objective: string, agents: string[]) {
  trackEvent("god_mode_deployed", { userId, objective, agents })
}

export function trackFeatureUsed(userId: string, feature: string) {
  trackEvent("feature_used", { userId, feature })
}
