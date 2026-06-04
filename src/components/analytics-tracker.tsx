/**
 * AnalyticsTracker — Client component that hooks into the layout
 * to automatically track page views on route changes.
 *
 * Include once in the root layout, no props needed.
 */

"use client"

import { usePageViewTracking } from "@/lib/analytics"

export function AnalyticsTracker() {
  usePageViewTracking()
  return null
}
