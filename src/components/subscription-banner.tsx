"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Clock, CreditCard, Crown, AlertTriangle, X } from "lucide-react"

interface SubscriptionData {
  trial: {
    daysRemaining: number
    isExpired: boolean
    isActive: boolean
  } | null
  subscription: {
    status: string
    tier: string
    plan: string
  } | null
  suggestedTier?: { name: string }
}

export function SubscriptionBanner() {
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return null
  if (!data) return null
  if (data.subscription?.status === "active") return null

  const trial = data.trial
  const tierName = data.suggestedTier?.name || "Starter"

  if (trial?.isActive && trial.daysRemaining > 0) {
    const dismissKey = `trial-${trial.daysRemaining}`
    if (dismissed === dismissKey) return null
    const isUrgent = trial.daysRemaining <= 3
    return (
      <div className={`relative px-4 py-2.5 border-b text-sm flex items-center gap-3 flex-wrap ${isUrgent ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-primary/5 border-primary/10 text-foreground"}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isUrgent ? <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" /> : <Clock className="h-4 w-4 shrink-0 text-primary" />}
          <span className="text-xs sm:text-sm truncate">
            {isUrgent ? (
              <strong className="font-semibold">⚠️ Your trial ends in {trial.daysRemaining} day{trial.daysRemaining !== 1 ? "s" : ""}!</strong>
            ) : (
              <>You&apos;re on a <strong>14-day free trial</strong> — <strong>{trial.daysRemaining} day{trial.daysRemaining !== 1 ? "s" : ""}</strong> remaining</>
            )}
            <span className="hidden sm:inline text-muted-foreground ml-1">{isUrgent ? "Subscribe to keep your data active." : `We recommend the ${tierName} plan.`}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-[10px] px-2 py-0 ${isUrgent ? "border-amber-500/30 text-amber-600" : "border-primary/30 text-primary"}`}>{trial.daysRemaining}d left</Badge>
          <Link href="/pricing"><Button size="sm" variant={isUrgent ? "default" : "outline"} className="h-7 text-xs px-3">{isUrgent ? "Subscribe Now" : "View Plans"}</Button></Link>
          <button onClick={() => setDismissed(dismissKey)} className="p-1 rounded hover:bg-foreground/5 transition-colors" aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    )
  }

  if (trial?.isExpired || trial?.daysRemaining === 0) {
    const dismissKey = "expired"
    if (dismissed === dismissKey) return null
    return (
      <div className="relative px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/10 text-sm flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="text-xs sm:text-sm truncate text-amber-700 dark:text-amber-300"><strong>Your free trial has ended.</strong> <span className="text-muted-foreground">Subscribe to keep your data active.</span></span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/pricing"><Button size="sm" className="h-7 text-xs px-3"><CreditCard className="h-3 w-3 mr-1" /> Subscribe Now</Button></Link>
          <button onClick={() => setDismissed(dismissKey)} className="p-1 rounded hover:bg-foreground/5 transition-colors" aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    )
  }

  if (!data.subscription || data.subscription.status !== "active") {
    const dismissKey = "nosub"
    if (dismissed === dismissKey) return null
    return (
      <div className="relative px-4 py-2.5 border-b border-primary/10 bg-primary/5 text-sm flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-xs sm:text-sm truncate">Unlock full access to Mapato. <span className="text-muted-foreground hidden sm:inline">Pay via M-Pesa, Mobile Money, or Visa/Mastercard.</span></span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/pricing"><Button size="sm" className="h-7 text-xs px-3"><Crown className="h-3 w-3 mr-1" /> Choose a Plan</Button></Link>
          <button onClick={() => setDismissed(dismissKey)} className="p-1 rounded hover:bg-foreground/5 transition-colors" aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    )
  }

  return null
}
