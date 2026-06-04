/**
 * useAbac — Client-side hook for attribute-based access control.
 *
 * Provides reactive canAccess() checks based on the current session user.
 *
 * Usage:
 *   const { canAccess, user } = useAbac()
 *   if (!canAccess("admin", "admin")) return <AccessDenied />
 *   if (!canAccess("operations", "deploy")) return <UpgradePlan />
 */

"use client"

import { useSession } from "next-auth/react"
import { checkAccess, type AbacAction, type AbacResource, type AbacDecision } from "@/lib/abac"

export function useAbac() {
  const { data: session, status } = useSession()

  const user = session?.user
    ? {
        id: (session.user.id as string) || "",
        role: (session.user.role as string) || "user",
        // On the client, we may not have the latest subscription data,
        // so default to "trial" — the server will enforce the real gate
        subscriptionStatus: "trial",
        subscriptionTier: null,
      }
    : null

  /**
   * Check if the current user can access a resource with a given action.
   * Falls back gracefully if session is still loading.
   */
  function canAccess(
    resource: AbacResource,
    action: AbacAction = "read"
  ): boolean {
    if (status === "loading") return true // Don't flash-gate during load
    if (!user) return false
    // Admin always has full access on the client
    if (user.role === "admin") return true
    return checkAccess(user, resource, action).allowed
  }

  /**
   * Get the full ABAC decision for a resource/action.
   */
  function getAccessDecision(
    resource: AbacResource,
    action: AbacAction = "read"
  ): AbacDecision {
    if (!user) {
      return { allowed: false, reason: "Not authenticated", grants: [] }
    }
    if (user.role === "admin") {
      return { allowed: true, reason: "Admin bypass", grants: ["admin:full"] }
    }
    return checkAccess(user, resource, action)
  }

  return {
    canAccess,
    getAccessDecision,
    user,
    isAdmin: user?.role === "admin",
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
  }
}

export default useAbac
