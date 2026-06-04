"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Crown, Clock, Loader2, Ban, CreditCard, ArrowRight } from "lucide-react"

// ============================================================
// Protected paths — pages that require active trial or subscription
// ============================================================

const PROTECTED_PATHS = [
  "/dashboard",
  "/operations",
  "/pipeline",
  "/trade",
  "/korea",
  "/content",
  "/outreach",
  "/financial",
  "/admin",
  "/docs",
  "/plan",
]

function isProtectedPath(pathname: string): boolean {
  // Exact match for root-level paths, but NOT sub-paths that are public
  // e.g., /korea/buyers is also protected
  return PROTECTED_PATHS.some((p) => {
    if (p === pathname) return true
    if (pathname.startsWith(p + "/")) return true
    // Check for /korea, /korea/buyers, /korea/inquiries
    if (pathname.startsWith("/korea")) return true
    return false
  })
}

// ============================================================
// Subscription Gate Component
// ============================================================

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [gateState, setGateState] = useState<{
    loading: boolean
    blocked: boolean
    expired: boolean
    daysRemaining: number
    tier?: string
    status?: string
  }>({
    loading: true,
    blocked: false,
    expired: false,
    daysRemaining: 0,
  })
  const checkedRef = useRef(false)

  const checkSubscription = useCallback(async () => {
    // Guard: only check once per session+pathname combination
    if (!session?.user || checkedRef.current) return

    // Only gate on protected paths
    if (!isProtectedPath(pathname)) {
      checkedRef.current = true
      setGateState((prev) => ({ ...prev, loading: false }))
      return
    }

    // Admin users bypass subscription gating entirely
    if (session.user.role === "admin") {
      checkedRef.current = true
      setGateState((prev) => ({ ...prev, loading: false }))
      return
    }

    try {
      const res = await fetch("/api/subscription")
      if (!res.ok) {
        checkedRef.current = true
        setGateState((prev) => ({ ...prev, loading: false }))
        return
      }

      const data = await res.json()
      checkedRef.current = true

      // Check expired: trial.isExpired OR subscription.status === "expired" (latter covers post-cron state)
      const isExpired = data.trial?.isExpired === true || data.subscription?.status === "expired"
      const isActive = data.subscription?.status === "active" || data.trial?.isActive === true

      if (!isActive || isExpired) {
        setGateState({
          loading: false,
          blocked: true,
          expired: isExpired,
          daysRemaining: data.trial?.daysRemaining || 0,
          tier: data.subscription?.tier,
          status: data.subscription?.status,
        })
      } else {
        setGateState({
          loading: false,
          blocked: false,
          expired: false,
          daysRemaining: data.trial?.daysRemaining || 14,
          tier: data.subscription?.tier,
          status: data.subscription?.status,
        })
      }
    } catch {
      checkedRef.current = true
      setGateState((prev) => ({ ...prev, loading: false }))
    }
  }, [session, pathname])

  useEffect(() => {
    checkSubscription()
  }, [checkSubscription])

  // Always show children while auth is loading
  if (authStatus === "loading") {
    return <>{children}</>
  }

  // Not logged in — show children (they'll be redirected by auth)
  if (!session?.user) {
    return <>{children}</>
  }

  // Still loading or not on a protected path — show children
  if (gateState.loading || !gateState.blocked) {
    return <>{children}</>
  }

  // ==========================================================
  // BLOCKED STATE — Trial expired or no active subscription
  // ==========================================================

  if (gateState.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-destructive/5">
        <Card className="max-w-md w-full border-destructive/30 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                <Ban className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">Your Trial Has Ended</CardTitle>
            <CardDescription className="text-base mt-2">
              Your 14-day free trial has expired. Subscribe to a plan to regain access to all features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="p-4 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">Trial status: <strong className="text-destructive">Expired</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Crown className="h-4 w-4 text-amber-500" />
                <span className="text-muted-foreground">Plan: <strong>{gateState.tier || "Enterprise"} (during trial)</strong></span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Your data, pipeline, and automations are all preserved. Subscribe to instantly reactivate.
              </p>
            </div>

            <Button
              className="w-full h-11 text-base"
              onClick={() => router.push("/pricing")}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              View Plans & Subscribe
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/")}
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==========================================================
  // BLOCKED STATE — No subscription at all
  // ==========================================================

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-primary/5">
      <Card className="max-w-md w-full border-primary/20 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
              <Crown className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Subscribe to Continue</CardTitle>
          <CardDescription className="text-base mt-2">
            You need an active subscription to access this page. Choose a plan that fits your business.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="p-4 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Status: <strong>No Active Subscription</strong></span>
            </div>
          </div>

          <Button
            className="w-full h-11 text-base"
            onClick={() => router.push("/pricing")}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Choose a Plan
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/")}
          >
            Go to Homepage
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default SubscriptionGate
