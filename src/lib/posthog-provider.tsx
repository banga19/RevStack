"use client"

/**
 * PostHog Provider
 *
 * Initializes PostHog analytics on the client side using posthog-js.
 * Wraps the app with PostHogProvider to enable hooks like usePostHog(),
 * useFeatureFlagEnabled(), and automatic $pageview capture.
 *
 * Environment variables:
 *   NEXT_PUBLIC_POSTHOG_KEY  — required (phc_xxx)
 *   NEXT_PUBLIC_POSTHOG_HOST — optional (defaults to https://us.i.posthog.com)
 */

import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"

// ── Initialize PostHog ────────────────────────────────────────

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // We capture manually via PostHogPageView
    capture_pageleave: true,
    persistence: "localStorage",

    loaded: (ph) => {
      // Opt out of session recording if user has DNT enabled
      if (window.navigator.doNotTrack === "1") {
        ph.opt_out_capturing()
      }
    },
  })
}

// ── Page View Tracker (inner component for useSearchParams) ───

function PostHogPageViewInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ph = usePostHog()

  useEffect(() => {
    if (pathname && ph) {
      let url = window.origin + pathname
      if (searchParams?.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      ph.capture("$pageview", { $current_url: url })
    }
  }, [pathname, searchParams, ph])

  return null
}

// ── Page View Tracker (wrapped in Suspense) ───────────────────

export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  )
}

// ── Provider Component ────────────────────────────────────────

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_KEY) {
    // PostHog not configured — render children without tracking
    return <>{children}</>
  }

  return <PHProvider client={posthog}>{children}</PHProvider>
}
