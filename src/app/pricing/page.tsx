"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog"
import { PaymentCheckout } from "@/components/payment-checkout"
import { CheckCircle2, Sparkles, Brain, Loader2, ArrowRight, Clock, Crown, X } from "lucide-react"
import { cn } from "@/lib/utils"

const TIER_DETAILS = {
  starter: {
    name: "Starter",
    monthlyPrice: 50,
    yearlyPrice: 500,
    features: [
      "Lead qualification bot (Voiceflow + WhatsApp)",
      "WhatsApp & email follow-up sequences",
      "Up to 500 contacts",
      "Pipeline CRM access",
      "Monthly performance report",
      "Community support",
    ],
  },
  growth: {
    name: "Growth",
    monthlyPrice: 200,
    yearlyPrice: 2000,
    features: [
      "Advanced lead scoring & routing (AI-powered)",
      "Multi-channel automation (WhatsApp, Email, LinkedIn)",
      "Up to 5,000 contacts",
      "Custom automation workflow builder",
      "Revenue forecasting & predictive analytics",
      "Trade compliance & certification tracking",
      "Priority support",
      "Dedicated account manager",
    ],
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 500,
    yearlyPrice: 5000,
    features: [
      "Enterprise-grade AI automation & orchestration",
      "Omnichannel engagement platform",
      "Unlimited contacts & workflows",
      "Custom integrations & full API access",
      "AI-powered predictive trade analytics",
      "Trade finance application management",
      "24/7 premium support & SLA guarantees",
    ],
  },
}

type TierId = keyof typeof TIER_DETAILS

export default function PricingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [subscribing, setSubscribing] = useState<TierId | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutTier, setCheckoutTier] = useState<TierId | null>(null)
  const [trialStatus, setTrialStatus] = useState<{
    daysRemaining: number
    isExpired: boolean
    isActive: boolean
    currentTier: string
    subscriptionStatus: string
  } | null>(null)

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((d) => {
        if (d.trial) {
          setTrialStatus({
            daysRemaining: d.trial.daysRemaining,
            isExpired: d.trial.isExpired,
            isActive: d.trial.isActive,
            currentTier: d.subscription?.tier || "starter",
            subscriptionStatus: d.subscription?.status || "trial",
          })

          // Pre-select suggested tier billing cycle
          if (d.subscription?.plan) {
            setBillingCycle(d.subscription.plan)
          }
        }
      })
      .catch(() => {})
  }, [])

  const handleSubscribe = async (tierId: TierId) => {
    // If not authenticated, redirect to signup with plan info
    // The signup page will redirect back to pricing after auth
    if (!session?.user) {
      router.push(`/signup?plan=${tierId}&billing=${billingCycle}&returnTo=/pricing`)
      return
    }

    // Show checkout dialog for payment
    setCheckoutTier(tierId)
    setShowCheckout(true)
  }

  const handleCheckoutSuccess = () => {
    setShowCheckout(false)
    setSubscribed(true)
    setTimeout(() => router.push("/dashboard"), 1500)
  }

  if (subscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md text-center border-emerald-500/20 shadow-2xl">
          <CardContent className="pt-10 pb-10">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Subscription Active!</h2>
            <p className="text-muted-foreground">
              You&apos;re now subscribed to {TIER_DETAILS[subscribing as TierId]?.name || "your plan"} ({billingCycle}).
            </p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold">Mapato</span>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">Mapato</Badge>
          </div>
          <div className="flex items-center gap-3">
            {trialStatus?.isActive && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                <Clock className="h-3 w-3 mr-1" /> {trialStatus.daysRemaining} days left in trial
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              Dashboard <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Heading */}
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4">Choose Your Plan</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            {trialStatus?.isExpired
              ? "Your trial has ended — pick a plan to continue"
              : "Pick the plan that fits your business"}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {trialStatus?.isExpired
              ? "Subscribe to keep using Mapato and unlock your automation pipeline."
              : "Complete your 14-day trial by subscribing. Your onboarding data helps us recommend the best plan."}
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              billingCycle === "monthly"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              billingCycle === "yearly"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Yearly <span className="text-emerald-500 font-bold ml-1">Save 17%</span>
          </button>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {(Object.entries(TIER_DETAILS) as [TierId, typeof TIER_DETAILS[TierId]][]).map(([id, tier]) => {
            const isPopular = id === "growth"
            const price = billingCycle === "monthly" ? tier.monthlyPrice : tier.yearlyPrice
            const isCurrentPlan = trialStatus?.currentTier === id && trialStatus?.subscriptionStatus === "active"

            return (
              <div
                key={id}
                className={cn(
                  "relative p-6 rounded-xl border bg-card transition-all duration-300 flex flex-col",
                  isPopular
                    ? "border-2 border-primary/40 shadow-xl shadow-primary/5 scale-105"
                    : "border-border/50 hover:border-primary/20",
                  isCurrentPlan && "ring-2 ring-emerald-500/50"
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-3">
                    <Badge className="bg-emerald-500 text-white">Current Plan</Badge>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    {id === "enterprise" && <Crown className="h-4 w-4 text-amber-500" />}
                    {tier.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {id === "starter" && "For solo traders getting started"}
                    {id === "growth" && "For growing trading companies"}
                    {id === "enterprise" && "For established businesses"}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${price}</span>
                    <span className="text-muted-foreground">/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-xs text-emerald-500 mt-1">
                      Save ${(tier.monthlyPrice * 12 - tier.yearlyPrice).toLocaleString()}/year
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> Current Plan
                  </Button>
                ) : (
                  <Button
                    variant={isPopular ? "default" : "outline"}
                    className="w-full"
                    disabled={subscribing !== null}
                    onClick={() => handleSubscribe(id)}
                  >
                    {subscribing === id ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Subscribing...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> {trialStatus?.isExpired ? "Subscribe Now" : "Choose Plan"}</>
                    )}
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Payment Checkout Dialog */}
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogOverlay className="bg-black/50 backdrop-blur-sm" />
          <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
            <div className="p-6">
              <PaymentCheckout
                tierId={checkoutTier || "starter"}
                tierName={TIER_DETAILS[checkoutTier || "starter"]?.name || "Starter"}
                amount={checkoutTier ? (billingCycle === "monthly" ? TIER_DETAILS[checkoutTier].monthlyPrice : TIER_DETAILS[checkoutTier].yearlyPrice) : 50}
                billingCycle={billingCycle}
                onClose={() => setShowCheckout(false)}
                onSuccess={handleCheckoutSuccess}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Trial info */}
        {trialStatus?.isActive && (
          <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
            <p className="text-sm text-muted-foreground">
              You&apos;re currently on a <strong>14-day free trial</strong> with{" "}
              <strong className="text-primary">{trialStatus.daysRemaining} days remaining</strong>.
              Subscribe before the trial ends to keep your data and automation running.
            </p>
          </div>
        )}

        {/* Polsia Comparison Table */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">Why Mapato?</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Mapato vs Polsia: Built for B2B Trade</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              While Polsia is the AI co-founder for e-commerce businesses, Mapato is purpose-built for B2B trading companies —
              with half the success fee and trade-specific features. Here&apos;s how we compare.
            </p>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border/50 bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-6 py-4 font-semibold">Feature</th>
                  <th className="text-center px-6 py-4">
                    <div>
                      <span className="font-bold text-foreground">Polsia</span>
                      <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Your AI Co-Founder for e-commerce</p>
                    </div>
                  </th>
                  <th className="text-center px-6 py-4 bg-primary/5">
                    <div>
                      <span className="font-bold text-primary">Mapato</span>
                      <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Your AI Revenue Operations for B2B Trade</p>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Target Market", polsia: "E-commerce & Online Businesses", mapato: "B2B Trading Companies", highlight: true },
                  { feature: "Monthly Subscription", polsia: "$49/mo", mapato: "Starting at $50/mo", highlight: true },
                  { feature: "Success Fee", polsia: "20% of revenue", mapato: "From 10% of revenue", highlight: true, winner: "mapato" },
                  { feature: "AI Lead Qualification", polsia: "✅", mapato: "✅" },
                  { feature: "WhatsApp Automation", polsia: "❌", mapato: "✅" },
                  { feature: "Email Outreach", polsia: "✅", mapato: "✅" },
                  { feature: "CRM Pipeline", polsia: "✅", mapato: "✅" },
                  { feature: "Revenue Forecasting", polsia: "❌", mapato: "✅" },
                  { feature: "Trade Corridor Matching", polsia: "❌", mapato: "✅" },
                  { feature: "Export Readiness Scoring", polsia: "❌", mapato: "✅" },
                  { feature: "Trade Finance Integration", polsia: "❌", mapato: "✅" },
                  { feature: "Compliance Tracking", polsia: "❌", mapato: "✅" },
                  { feature: "Free Trial", polsia: "❌", mapato: "14-day free trial" },
                ].map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-border/30 transition-colors",
                      i === 2 ? "bg-primary/[0.02]" : "",
                      row.highlight ? "hover:bg-muted/20" : "hover:bg-muted/10"
                    )}
                  >
                    <td className="px-6 py-3.5 font-medium text-sm">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center text-sm text-muted-foreground">{row.polsia}</td>
                    <td className={cn(
                      "px-6 py-3.5 text-center text-sm font-medium bg-primary/5",
                      row.winner === "mapato" && "text-emerald-500 font-bold"
                    )}>
                      {row.mapato}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {[
              { feature: "Target Market", polsia: "E-commerce & Online", mapato: "B2B Trading Companies" },
              { feature: "Monthly Subscription", polsia: "$49/mo", mapato: "From $50/mo" },
              { feature: "Success Fee", polsia: "20%", mapato: "From 10%" },
              { feature: "AI Lead Qualification", polsia: "✅", mapato: "✅" },
              { feature: "WhatsApp Automation", polsia: "❌", mapato: "✅" },
              { feature: "Email Outreach", polsia: "✅", mapato: "✅" },
              { feature: "CRM Pipeline", polsia: "✅", mapato: "✅" },
              { feature: "Revenue Forecasting", polsia: "❌", mapato: "✅" },
              { feature: "Trade Corridor Matching", polsia: "❌", mapato: "✅" },
              { feature: "Export Readiness Scoring", polsia: "❌", mapato: "✅" },
              { feature: "Trade Finance Integration", polsia: "❌", mapato: "✅" },
              { feature: "Compliance Tracking", polsia: "❌", mapato: "✅" },
              { feature: "Free Trial", polsia: "❌", mapato: "✅ 14-day" },
            ].map((row, i) => (
              <div key={i} className={cn(
                "p-4 rounded-xl border border-border/50",
                i === 2 ? "bg-primary/[0.02] border-primary/20" : "bg-card"
              )}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{row.feature}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Polsia</p>
                    <p className="text-sm">{row.polsia}</p>
                  </div>
                  <div className="text-center bg-primary/5 rounded-lg p-2">
                    <p className="text-[10px] text-primary uppercase mb-1">Mapato</p>
                    <p className={cn("text-sm font-semibold", i === 2 ? "text-emerald-500" : "")}>{row.mapato}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/needs-assessment">
              <Button size="lg" className="h-12 px-8 text-base">
                <Sparkles className="h-5 w-5 mr-2" />
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
