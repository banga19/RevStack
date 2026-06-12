"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslation } from "@/lib/i18n/use-translation"
import { REGIONS, type Region, getLocalizedPrice } from "@/lib/pricing"
import { RegionSelector } from "@/components/region-selector"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog"
import { PaymentCheckout } from "@/components/payment-checkout"
import { CheckCircle2, Sparkles, Brain, Loader2, ArrowRight, Clock, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

const TIER_DETAILS: Record<string, {
  name: string
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  featuresSw: string[]
  desc: string
  descSw: string
}> = {
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
    featuresSw: [
      "Bot wa uhakiki wa wateja (Voiceflow + WhatsApp)",
      "Mifuatano ya WhatsApp & barua pepe",
      "Hadi wateja 500",
      "Ufikiaji wa CRM ya bomba la mauzo",
      "Ripoti ya utendaji ya kila mwezi",
      "Msaada wa jamii",
    ],
    desc: "For solo traders and small teams getting started",
    descSw: "Kwa wafanyabiashara pekee na timu ndogo zinazoanza",
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
    featuresSw: [
      "Uhakiki wa hali ya juu na uelekezaji (unaotumia AI)",
      "Automatishe ya njia nyingi (WhatsApp, Barua Pepe, LinkedIn)",
      "Hadi anwani 5,000",
      "Kijenzi cha workflow cha automatishe maalum",
      "Utabiri wa mapato na uchambuzi wa ubashiri",
      "Ufuatiliaji wa utiifu wa biashara na uidhinishaji",
      "Msaada wa kipaumbele",
      "Meneja akaunti aliyeteuliwa",
    ],
    desc: "For growing trading companies scaling operations",
    descSw: "Kwa kampuni za biashara zinazokua zinazopanua shughuli",
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
      "God Mode — Autonomous AI agents",
      "24/7 premium support & SLA guarantees",
    ],
    featuresSw: [
      "Automatishe na uratibu wa AI wa kiwango cha biashara",
      "Jukwaa la mawasiliano ya njia zote",
      "Anwani na workflows zisizo na kikomo",
      "Muunganisho maalum na ufikiaji kamili wa API",
      "Uchambuzi wa biashara ya ubashiri unaotumia AI",
      "Usimamizi wa maombi ya fedha za biashara",
      "God Mode — Agents za AI zinazojitegemea",
      "Msaada wa kiwango cha juu 24/7 na dhamana za SLA",
    ],
    desc: "For established businesses with complex needs",
    descSw: "Kwa biashara zilizoanzishwa zenye mahitaji changamano",
  },
}

type TierId = keyof typeof TIER_DETAILS

export default function PricingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { t, lang } = useTranslation()
  const [region, setRegion] = useState<Region>("ke")
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
    // Try to detect user's region from timezone or stored preference
    const stored = localStorage.getItem("mapato-region") as Region | null
    if (stored && Object.keys(REGIONS).includes(stored)) {
      setRegion(stored)
    } else {
      // Approximate from timezone
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz.includes("Nairobi")) setRegion("ke")
      else if (tz.includes("Dar_es_Salaam")) setRegion("tz")
      else if (tz.includes("Kampala")) setRegion("ug")
      else if (tz.includes("Kigali")) setRegion("rw")
      else setRegion("ke")
    }

    fetch("/api/subscription")
      .then((r) => r.json())
      .then((d) => {
        if (d.trial) {
          setTrialStatus({
            daysRemaining: d.trial.daysRemaining,
            isExpired: d.trial.isExpired,
            isActive: d.trial.isActive,
            currentTier: d.subscription?.tier || "enterprise",
            subscriptionStatus: d.subscription?.status || "trial",
          })
          if (d.subscription?.plan) setBillingCycle(d.subscription.plan)
        }
      })
      .catch(() => {})
  }, [])

  const handleRegionChange = (newRegion: Region) => {
    setRegion(newRegion)
    localStorage.setItem("mapato-region", newRegion)
  }

  const handleSubscribe = async (tierId: TierId) => {
    if (!session?.user) {
      router.push(`/signup?plan=${tierId}&billing=${billingCycle}&region=${region}&returnTo=/pricing`)
      return
    }
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
            <h2 className="text-2xl font-bold mb-2">
              {lang === "sw" ? "Usajili Umewashwa!" : "Subscription Active!"}
            </h2>
            <p className="text-muted-foreground">
              {lang === "sw"
                ? `Umesajiliwa kwa ${TIER_DETAILS[subscribing as TierId]?.name || "mpango wako"} (${billingCycle === "monthly" ? "kila mwezi" : "kila mwaka"}).`
                : `You're now subscribed to ${TIER_DETAILS[subscribing as TierId]?.name || "your plan"} (${billingCycle}).`}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {lang === "sw" ? "Inaelekeza kwenye dashibodi..." : "Redirecting to dashboard..."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const regionConfig = REGIONS[region]
  const displayPrice = (tierId: TierId, cycle: "monthly" | "yearly") => {
    const localized = getLocalizedPrice(tierId, region, cycle)
    if (region === "intl") {
      return `$${localized.amount}`
    }
    return `${regionConfig.symbol} ${localized.amount.toLocaleString()}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10"><Brain className="h-5 w-5 text-primary" /></div>
            <span className="text-lg font-bold">Mapato</span>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground hidden sm:inline-flex">
              {lang === "sw" ? "Bei za Kikanda" : "Regional Pricing"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <RegionSelector value={region} onChange={handleRegionChange} />
            {trialStatus?.isActive && (
              <Badge variant="outline" className="border-primary/30 text-primary hidden sm:inline-flex">
                <Clock className="h-3 w-3 mr-1" /> {trialStatus.daysRemaining} {lang === "sw" ? "siku zimesalia" : "days left"}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              Dashboard <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4">
            {lang === "sw" ? "Chagua Mpango Wako" : "Choose Your Plan"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            {trialStatus?.isExpired
              ? (lang === "sw" ? "Jaribio lako limeisha — chagua mpango kuendelea" : "Your trial has ended — pick a plan to continue")
              : (lang === "sw" ? "Chagua mpango unaofaa biashara yako" : "Pick the plan that fits your business")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {trialStatus?.isExpired
              ? (lang === "sw" ? "Jisajili kuendelea kutumia Mapato na kufungua bomba lako la automatishe." : "Subscribe to keep using Mapato and unlock your automation pipeline.")
              : (lang === "sw" ? "Anza na jaribio la siku 3 bure — hakuna kadi ya mkopo inayohitajika. Jisajili ukiwa tayari." : "Start with a 3-day free trial — no credit card required. Subscribe when you're ready.")}
          </p>
          {region !== "intl" && (
            <p className="text-xs text-emerald-500 mt-2">
              {lang === "sw" ? `Bei zinaonyeshwa kwa ${regionConfig.currency} (${regionConfig.flag})` : `Prices shown in ${regionConfig.currency} (${regionConfig.flag})`}
            </p>
          )}
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button onClick={() => setBillingCycle("monthly")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", billingCycle === "monthly" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground hover:text-foreground")}>
            {lang === "sw" ? "Kila Mwezi" : "Monthly"}
          </button>
          <button onClick={() => setBillingCycle("yearly")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", billingCycle === "yearly" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground hover:text-foreground")}>
            {lang === "sw" ? "Kila Mwaka" : "Yearly"} <span className="text-emerald-500 font-bold ml-1">{lang === "sw" ? "Okoa 17%" : "Save 17%"}</span>
          </button>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {(Object.entries(TIER_DETAILS) as [TierId, typeof TIER_DETAILS[TierId]][]).map(([id, tier]) => {
            const isPopular = id === "growth"
            const price = billingCycle === "monthly"
              ? displayPrice(id, "monthly")
              : displayPrice(id, "yearly")
            const isCurrentPlan = trialStatus?.currentTier === id && trialStatus?.subscriptionStatus === "active"
            const localized = getLocalizedPrice(id, region, billingCycle)
            const usdPrice = billingCycle === "monthly" ? tier.monthlyPrice : tier.yearlyPrice
            const saveAmount = billingCycle === "yearly" ? (tier.monthlyPrice * 12 - tier.yearlyPrice) : 0
            const usdSave = lang === "sw" ? `Okoa $${saveAmount}/mwaka` : `Save $${saveAmount}/year`

            return (
              <div key={id} className={cn("relative p-6 rounded-xl border bg-card transition-all duration-300 flex flex-col", isPopular ? "border-2 border-primary/40 shadow-xl shadow-primary/5 scale-[1.02]" : "border-border/50 hover:border-primary/20", isCurrentPlan && "ring-2 ring-emerald-500/50")}>
                {isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-primary text-primary-foreground">{lang === "sw" ? "Inayopendwa Zaidi" : "Most Popular"}</Badge></div>}
                {isCurrentPlan && <div className="absolute -top-3 right-3"><Badge className="bg-emerald-500 text-white">{lang === "sw" ? "Mpango wa Sasa" : "Current Plan"}</Badge></div>}
                <div className="mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">{id === "enterprise" && <Crown className="h-4 w-4 text-amber-500" />}{tier.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{lang === "sw" ? tier.descSw : tier.desc}</p>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{price}</span>
                    <span className="text-muted-foreground">/{billingCycle === "monthly" ? (lang === "sw" ? "mw" : "mo") : (lang === "sw" ? "mwaka" : "yr")}</span>
                  </div>
                  {region !== "intl" && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ~${localized.amount === usdPrice ? usdPrice : (billingCycle === "monthly" ? tier.monthlyPrice : tier.yearlyPrice)} USD
                    </p>
                  )}
                  {billingCycle === "yearly" && saveAmount > 0 && (
                    <p className="text-xs text-emerald-500 mt-1">{usdSave}</p>
                  )}
                </div>
                <ul className="space-y-3 mb-6 flex-1">
                  {(lang === "sw" ? tier.featuresSw : tier.features).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full" disabled><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> {lang === "sw" ? "Mpango wa Sasa" : "Current Plan"}</Button>
                ) : (
                  <Button variant={isPopular ? "default" : "outline"} className="w-full" disabled={subscribing !== null} onClick={() => handleSubscribe(id)}>
                    {subscribing === id ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {lang === "sw" ? "Inajiandikisha..." : "Subscribing..."}</> : <><Sparkles className="h-4 w-4 mr-2" /> {trialStatus?.isExpired ? (lang === "sw" ? "Jisajili Sasa" : "Subscribe Now") : (lang === "sw" ? "Chagua Mpango" : "Choose Plan")}</>}
                  </Button>
                )}
                {region !== "intl" && (
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    {lang === "sw" ? `Lipa kwa ${regionConfig.paymentMethods.map((m) => m === "mpesa" ? "M-Pesa" : m === "mobile_money" ? "Pesa za Simu" : "Kadi").join(", ")}` : `Pay with ${regionConfig.paymentMethods.map((m) => m === "mpesa" ? "M-Pesa" : m === "mobile_money" ? "Mobile Money" : "Card").join(", ")}`}
                  </p>
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
              {lang === "sw"
                ? `Kwa sasa uko kwenye jaribio la siku 3 bure na siku ${trialStatus.daysRemaining} zimesalia. Jisajili kabla jaribio halijaisha kuweka data yako na automatishe ikifanya kazi.`
                : `You're currently on a <strong>3-day free trial</strong> with <strong className="text-primary">${trialStatus.daysRemaining} day${trialStatus.daysRemaining !== 1 ? "s" : ""} remaining</strong>. Subscribe before the trial ends to keep your data and automation running.`}
            </p>
          </div>
        )}

        {/* Exchange rate reference */}
        {region !== "intl" && (
          <div className="mt-8 max-w-md mx-auto">
            <Card className="border-border/30 bg-muted/10">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {lang === "sw"
                    ? `Bei zote zinaonyeshwa kwa ${regionConfig.currency}. Kiwango cha ubadilishaji: 1 USD = ${regionConfig.rate.toLocaleString()} ${regionConfig.currency}.`
                    : `All prices shown in ${regionConfig.currency} (${regionConfig.flag}). Exchange rate: 1 USD = ${regionConfig.rate.toLocaleString()} ${regionConfig.currency}.`}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Polsia Comparison Table */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">{lang === "sw" ? "Kwa Nini Mapato?" : "Why Mapato?"}</Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              {lang === "sw" ? "Mapato dhidi ya Polsia: Imejengwa kwa Biashara ya B2B" : "Mapato vs Polsia: Built for B2B Trade"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              {lang === "sw"
                ? "Wakati Polsia ni mwanzilishi mwenza wa AI kwa biashara za e-commerce, Mapato imejengwa kwa ajili ya kampuni za biashara za B2B — kwa nusu ya ada ya mafanikio."
                : "While Polsia is the AI co-founder for e-commerce businesses, Mapato is purpose-built for B2B trading companies — with half the success fee and trade-specific features."}
            </p>
          </div>

          <div className="hidden md:block overflow-hidden rounded-xl border border-border/50 bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-6 py-4 font-semibold">{lang === "sw" ? "Kipengele" : "Feature"}</th>
                  <th className="text-center px-6 py-4"><div><span className="font-bold text-foreground">Polsia</span></div></th>
                  <th className="text-center px-6 py-4 bg-primary/5"><div><span className="font-bold text-primary">Mapato</span></div></th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: lang === "sw" ? "Soko Lengwa" : "Target Market", polsia: "E-commerce & Online Businesses", mapato: "B2B Trading Companies" },
                  { feature: lang === "sw" ? "Ada ya Kila Mwezi" : "Monthly Subscription", polsia: "$49/mo", mapato: lang === "sw" ? "Kuanzia $50/mwezi" : "Starting at $50/mo" },
                  { feature: lang === "sw" ? "Ada ya Mafanikio" : "Success Fee", polsia: "20% of revenue", mapato: lang === "sw" ? "Kuanzia 10% ya mapato" : "From 10% of revenue", winner: "mapato" },
                  { feature: "AI Lead Qualification", polsia: "✅", mapato: "✅" },
                  { feature: "WhatsApp Automation", polsia: "❌", mapato: "✅" },
                  { feature: "Email Outreach", polsia: "✅", mapato: "✅" },
                  { feature: "CRM Pipeline", polsia: "✅", mapato: "✅" },
                  { feature: "Revenue Forecasting", polsia: "❌", mapato: "✅" },
                  { feature: lang === "sw" ? "Ulinganishaji wa Njia za Biashara" : "Trade Corridor Matching", polsia: "❌", mapato: "✅" },
                  { feature: lang === "sw" ? "Ukadiriaji wa Utayari wa Kuuza Nje" : "Export Readiness Scoring", polsia: "❌", mapato: "✅" },
                  { feature: lang === "sw" ? "Muunganisho wa Fedha za Biashara" : "Trade Finance Integration", polsia: "❌", mapato: "✅" },
                  { feature: lang === "sw" ? "Ufuatiliaji wa Utiifu" : "Compliance Tracking", polsia: "❌", mapato: "✅" },
                  { feature: "God Mode (Autonomous AI Agents)", polsia: "❌", mapato: "✅" },
                ].map((row, i) => (
                  <tr key={i} className={cn("border-b border-border/30 transition-colors hover:bg-muted/10", row.winner === "mapato" && "bg-emerald-500/[0.02]")}>
                    <td className="px-6 py-3.5 font-medium text-sm">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center text-sm text-muted-foreground">{row.polsia}</td>
                    <td className={cn("px-6 py-3.5 text-center text-sm font-medium bg-primary/5", row.winner === "mapato" && "text-emerald-500 font-bold")}>{row.mapato}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3 mt-4">
            {[
              { feature: "Target Market", polsia: "E-commerce & Online", mapato: "B2B Trading Companies" },
              { feature: "Monthly Subscription", polsia: "$49/mo", mapato: "From $50/mo" },
              { feature: "Success Fee", polsia: "20%", mapato: "From 10%" },
            ].map((row, i) => (
              <div key={i} className="p-4 rounded-xl border border-border/50 bg-card border-emerald-500/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{row.feature}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center"><p className="text-[10px] text-muted-foreground uppercase mb-1">Polsia</p><p className="text-sm">{row.polsia}</p></div>
                  <div className="text-center bg-primary/5 rounded-lg p-2"><p className="text-[10px] text-primary uppercase mb-1">Mapato</p><p className="text-sm font-semibold text-emerald-500">{row.mapato}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
