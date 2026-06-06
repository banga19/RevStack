"use client"

/**
 * PostHog Analytics Provider
 *
 * Provides analytics page view tracking via PostHog when configured.
 * When NEXT_PUBLIC_POSTHOG_KEY is not set, all components are inert.
 *
 * We deliberately avoid importing from "posthog-js/react" because
 * webpack has issues resolving the subpath export. Instead we use
 * posthog-js directly via dynamic import inside useEffect.
 *
 * Environment:
 *   NEXT_PUBLIC_POSTHOG_KEY  — required (phc_xxx)
 *   NEXT_PUBLIC_POSTHOG_HOST — optional (defaults to https://us.i.posthog.com)
 */

import { useEffect, Suspense, type ReactNode } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

// ── Page View Tracker ───────────────────────────────────────

function PostHogPageViewInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname || !POSTHOG_KEY) return

    let cancelled = false

    // Dynamically import posthog-js to track pageviews.
    // This avoids eager bundling and works around webpack subpath issues.
    import("posthog-js")
      .then((mod) => {
        if (cancelled) return
        const ph = mod.default || mod
        if (typeof ph.capture !== "function") return

        // Initialize on first use
        if (!ph.__loaded) {
          ph.init(POSTHOG_KEY, {
            api_host:
              process.env.NEXT_PUBLIC_POSTHOG_HOST ||
              "https://us.i.posthog.com",
            capture_pageview: false,
            capture_pageleave: true,
            persistence: "localStorage",
          })
          ph.__loaded = true
        }

        let url = window.origin + pathname
        if (searchParams?.toString()) {
          url = url + `?${searchParams.toString()}`
        }
        ph.capture("$pageview", { $current_url: url })
      })
      .catch(() => {
        // posthog-js not available — page view tracking disabled
      })

    return () => {
      cancelled = true
    }
  }, [pathname, searchParams])

  return null
}

export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  )
}

// ── Provider Component ──────────────────────────────────────
// Simply renders children. No PostHog React context needed since
// we use posthog-js as a singleton via dynamic import.

export function PostHogProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
