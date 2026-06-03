"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Sparkles, Brain, Crown, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const TIER_DETAILS = {
  starter: {
    name: "Starter",
    monthlyPrice: 50,
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
    monthlyPrice: 0,
    features: [
      "Enterprise-grade AI automation & orchestration",
      "Omnichannel engagement platform",
      "Unlimited contacts & workflows",
      "Custom integrations & full API access",
      "AI-powered predictive trade analytics",
      "Trade finance application management",
      "God Mode — Autonomous AI agents",
      "24/7 premium support & SLA guarantees",
    ],
  },
}

type TierId = keyof typeof TIER_DETAILS

export default function PricingPage() {
  const router = useRouter()

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
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            Dashboard <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Heading */}
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            ✦ Free for Everyone
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            All Enterprise features — free
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Mapato gives every user full access to all features, including God Mode autonomous agents,
            at no cost. No credit card required — just sign up and start using everything.
          </p>
        </div>

        {/* Free Enterprise Hero Card */}
        <Card className="max-w-2xl mx-auto mb-12 border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-primary/5 to-emerald-500/10 shadow-2xl shadow-emerald-500/10">
          <CardContent className="p-8 text-center">
            <div className="p-3 rounded-full bg-emerald-500/10 inline-flex mb-4">
              <Crown className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Enterprise Plan — $0/mo</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Full access to Mapato&apos;s complete feature set. God Mode autonomous agents,
              trade corridor matching, ERS scoring, compliance tracking, and more.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="h-12 px-8 text-base">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Get Started Free
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plans grid (informational only) */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-2">Compare Plans</Badge>
          <h2 className="text-2xl font-bold">What&apos;s included in each tier</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {(Object.entries(TIER_DETAILS) as [TierId, typeof TIER_DETAILS[TierId]][]).map(([id, tier]) => {
            const isEnterprise = id === "enterprise"
            const displayPrice = isEnterprise ? "Free" : `$${tier.monthlyPrice}`

            return (
              <div
                key={id}
                className={cn(
                  "relative p-6 rounded-xl border bg-card transition-all duration-300 flex flex-col",
                  isEnterprise
                    ? "border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/5 scale-105"
                    : "border-border/50 opacity-70"
                )}
              >
                {isEnterprise && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-white">Your Current Plan</Badge>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    {isEnterprise && <Crown className="h-4 w-4 text-emerald-500" />}
                    {tier.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {id === "starter" && "For solo traders"}
                    {id === "growth" && "For growing companies"}
                    {id === "enterprise" && "Everything unlocked"}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-3xl font-bold", isEnterprise && "text-emerald-500")}>
                      {displayPrice}
                    </span>
                    {!isEnterprise && (
                      <span className="text-muted-foreground">/mo</span>
                    )}
                  </div>
                  {isEnterprise && (
                    <p className="text-xs text-emerald-500 mt-1 font-medium">
                      God Mode included ($0/hr)
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className={cn("h-4 w-4 mt-0.5 shrink-0", isEnterprise ? "text-emerald-500" : "text-muted-foreground")} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isEnterprise ? (
                  <Button variant="default" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Crown className="h-4 w-4 mr-2" /> Active
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Upgrade to Enterprise
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Polsia Comparison Table */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">Why Mapato?</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Mapato vs Polsia: Built for B2B Trade</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              While Polsia is the AI co-founder for e-commerce businesses, Mapato is purpose-built for B2B trading companies —
              with more features, trade-specific tools, and now completely free for all users.
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
                  { feature: "Monthly Subscription", polsia: "$49/mo", mapato: "Free for all", highlight: true, winner: "mapato" },
                  { feature: "Success Fee", polsia: "20% of revenue", mapato: "0% — completely free", highlight: true, winner: "mapato" },
                  { feature: "AI Lead Qualification", polsia: "✅", mapato: "✅" },
                  { feature: "WhatsApp Automation", polsia: "❌", mapato: "✅" },
                  { feature: "Email Outreach", polsia: "✅", mapato: "✅" },
                  { feature: "CRM Pipeline", polsia: "✅", mapato: "✅" },
                  { feature: "Revenue Forecasting", polsia: "❌", mapato: "✅" },
                  { feature: "Trade Corridor Matching", polsia: "❌", mapato: "✅" },
                  { feature: "Export Readiness Scoring", polsia: "❌", mapato: "✅" },
                  { feature: "Trade Finance Integration", polsia: "❌", mapato: "✅" },
                  { feature: "Compliance Tracking", polsia: "❌", mapato: "✅" },
                  { feature: "God Mode (Autonomous Agents)", polsia: "❌", mapato: "✅ Free" },
                ].map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-border/30 transition-colors hover:bg-muted/10",
                      row.winner === "mapato" && "bg-emerald-500/[0.02]"
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
              { feature: "Monthly Subscription", polsia: "$49/mo", mapato: "Free for all" },
              { feature: "Success Fee", polsia: "20%", mapato: "0% — free" },
              { feature: "AI Lead Qualification", polsia: "✅", mapato: "✅" },
              { feature: "WhatsApp Automation", polsia: "❌", mapato: "✅" },
              { feature: "Email Outreach", polsia: "✅", mapato: "✅" },
              { feature: "CRM Pipeline", polsia: "✅", mapato: "✅" },
              { feature: "Revenue Forecasting", polsia: "❌", mapato: "✅" },
              { feature: "Trade Corridor Matching", polsia: "❌", mapato: "✅" },
              { feature: "Export Readiness Scoring", polsia: "❌", mapato: "✅" },
              { feature: "Trade Finance Integration", polsia: "❌", mapato: "✅" },
              { feature: "Compliance Tracking", polsia: "❌", mapato: "✅" },
              { feature: "God Mode (Autonomous Agents)", polsia: "❌", mapato: "✅ Free" },
            ].map((row, i) => (
              <div key={i} className={cn("p-4 rounded-xl border border-border/50 bg-card", i <= 2 && "border-emerald-500/20")}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{row.feature}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Polsia</p>
                    <p className="text-sm">{row.polsia}</p>
                  </div>
                  <div className="text-center bg-primary/5 rounded-lg p-2">
                    <p className="text-[10px] text-primary uppercase mb-1">Mapato</p>
                    <p className={cn("text-sm font-semibold", i <= 2 ? "text-emerald-500" : "")}>{row.mapato}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/signup">
              <Button size="lg" className="h-12 px-8 text-base">
                <Sparkles className="h-5 w-5 mr-2" />
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
