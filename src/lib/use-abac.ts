/**
 * useAbac — Client-side hook for attribute-based access control.
 *
 * Provides reactive canAccess() checks based on the current Clerk user.
 *
 * Usage:
 *   const { canAccess, user } = useAbac()
 *   if (!canAccess("admin", "admin")) return <AccessDenied />
 *   if (!canAccess("operations", "deploy")) return <UpgradePlan />
 */

"use client"

import { useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { checkAccess, type AbacAction, type AbacResource, type AbacDecision } from "@/lib/abac"

export function useAbac() {
  const { user, isLoaded, isSignedIn } = useUser()
  const [role, setRole] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null)

  useEffect(() => {
    if (!isSignedIn || !user) {
      setRole(null)
      return
    }
    setRole((user.publicMetadata?.role as string | undefined) ?? "user")
  }, [isSignedIn, user])

  const dbUser = user
    ? {
        id: user.id,
        role: role ?? "user",
        subscriptionStatus: subscriptionStatus ?? "trial",
        subscriptionTier,
      }
    : null

  function canAccess(resource: AbacResource, action: AbacAction = "read"): boolean {
    if (!isLoaded) return true
    if (!dbUser) return false
    if (dbUser.role === "admin") return true
    return checkAccess(dbUser, resource, action).allowed
  }

  function getAccessDecision(resource: AbacResource, action: AbacAction = "read"): AbacDecision {
    if (!dbUser) return { allowed: false, reason: "Not authenticated", grants: [] }
    if (dbUser.role === "admin") return { allowed: true, reason: "Admin bypass", grants: ["admin:full"] }
    return checkAccess(dbUser, resource, action)
  }

  return {
    canAccess,
    getAccessDecision,
    user: dbUser,
    isAdmin: dbUser?.role === "admin",
    isAuthenticated: isSignedIn,
    isLoading: !isLoaded,
  }
}

export default useAbac
