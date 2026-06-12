"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog"
import { PaymentCheckout } from "@/components/payment-checkout"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  CreditCard,
  Crown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  FileText,
  DollarSign,
  CalendarDays,
  Building2,
  Sparkles,
  Receipt,
  Zap,
  Shield,
  Mail,
} from "lucide-react"
import Link from "next/link"

// ── Types ──────────────────────────────────────────────────────────────────

interface BillingData {
  trial: {
    startedAt: string
    endsAt: string
    daysRemaining: number
    isExpired: boolean
    isActive: boolean
  }
  subscription: {
    status: string
    tier: string
    plan: string
    startedAt: string | null
    endsAt: string | null
    billingEmail: string
  }
  invoices: Array<{
    id: string
    invoiceNumber: string
    amountUsd: number
    status: string
    dueDate: string
    paidAt: string | null
    clientName: string
  }>
  payments: Array<{
    id: string
    amount: number
    currency: string
    paymentMethod: string
    status: string
    tier: string | null
    createdAt: string
  }>
  organization: {
    id: string
    name: string
    slug: string
    plan: string
  } | null
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-muted-foreground/20",
  sent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground/50 border-muted-foreground/10",
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground/50 border-muted-foreground/10",
}

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
}

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 50, yearly: 500 },
  growth: { monthly: 200, yearly: 2000 },
  enterprise: { monthly: 500, yearly: 5000 },
}

export default function BillingPage() {
  const router = useRouter()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeTier, setUpgradeTier] = useState<string>("growth")
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [billingRes, invoicesRes, paymentsRes] = await Promise.all([
        fetch("/api/subscription"),
        fetch("/api/billing/invoices?limit=20"),
        fetch("/api/billing/payments?limit=20"),
      ])
      const billing = await billingRes.json()
      let invoices: any[] = []
      let payments: any[] = []
      try {
        const inv = await invoicesRes.json()
        invoices = inv.invoices || []
      } catch {}
      try {
        const pay = await paymentsRes.json()
        payments = pay.payments || []
      } catch {}

      setData({
        trial: billing.trial,
        subscription: billing.subscription,
        invoices,
        payments,
        organization: billing.organization || null,
      })
    } catch (e) {
      setError("Failed to load billing data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? Your data will be preserved but automations will stop.")) return
    setCancelling(true)
    try {
      const res = await fetch("/api/subscription", { method: "DELETE" })
      if (res.ok) {
        setCancelled(true)
        await loadData()
      }
    } finally {
      setCancelling(false)
    }
  }

  // ── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 shimmer rounded mb-6" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="shimmer h-4 w-24 rounded mb-3" /><div className="shimmer h-8 w-32 rounded" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><div className="shimmer h-4 w-32 rounded mb-4" /><div className="shimmer h-48 w-full rounded" /></CardContent></Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-16 w-16 text-amber-500/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Billing</h2>
        <p className="text-muted-foreground mb-6">{error || "Something went wrong"}</p>
        <Button onClick={loadData}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
      </div>
    )
  }

  const { subscription, trial, invoices, payments, organization } = data
  const isActive = subscription.status === "active"
  const isTrial = subscription.status === "trial"
  const currentTier = subscription.tier || "starter"
  const currentPlanPrices = PLAN_PRICES[currentTier as keyof typeof PLAN_PRICES] || PLAN_PRICES.starter
  const monthlyAmount = currentPlanPrices.monthly
  const yearlyAmount = currentPlanPrices.yearly

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing & Plan</h1>
            <p className="text-muted-foreground mt-1">Manage your subscription, invoices, and payment methods</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {cancelled && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm">Your subscription has been cancelled. You can resubscribe at any time to reactivate.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Plan Overview ───────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Current Plan */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4 text-amber-500" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-2xl font-bold capitalize">{PLAN_LABELS[currentTier] || currentTier}</h3>
                  <Badge variant={isActive ? "success" : isTrial ? "outline" : "secondary"} className="capitalize">
                    {isActive ? "Active" : isTrial ? "Trial" : subscription.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  ${isActive ? (subscription.plan === "yearly" ? yearlyAmount : monthlyAmount) : "0"}/{subscription.plan === "yearly" ? "yr" : "mo"}
                  {isActive && ` · ${subscription.plan === "yearly" ? "Yearly" : "Monthly"} billing`}
                  {isTrial && trial.isActive && ` · Trial ends in ${trial.daysRemaining} days`}
                </p>
              </div>
              <div className="flex gap-2">
                {isActive && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setUpgradeTier(currentTier === "starter" ? "growth" : currentTier === "growth" ? "enterprise" : "enterprise"); setShowUpgrade(true) }}>
                      <Sparkles className="h-3.5 w-3.5 mr-1" /> Change Plan
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancel} disabled={cancelling} className="text-destructive hover:text-destructive">
                      {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Cancel
                    </Button>
                  </>
                )}
                {isTrial && trial.isActive && (
                  <Button size="sm" onClick={() => { setUpgradeTier(currentTier); setShowUpgrade(true) }}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> Subscribe Now
                  </Button>
                )}
              </div>
            </div>

            {(isActive || isTrial) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-0.5">Billing Email</p>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {subscription.billingEmail}
                  </p>
                </div>
                {isActive && subscription.startedAt && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-0.5">Subscribed Since</p>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(subscription.startedAt)}
                    </p>
                  </div>
                )}
                {subscription.endsAt && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {isActive ? "Period Ends" : "Expired"}
                    </p>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(subscription.endsAt)}
                    </p>
                  </div>
                )}
                {isTrial && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <p className="text-xs text-amber-600 mb-0.5">Trial Status</p>
                    <p className="text-sm font-medium flex items-center gap-1.5 text-amber-600">
                      <Clock className="h-3.5 w-3.5" />
                      {trial.daysRemaining} day{trial.daysRemaining !== 1 ? "s" : ""} remaining
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-primary" />
              Quick Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium capitalize">{PLAN_LABELS[currentTier] || currentTier}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">${isActive ? (subscription.plan === "yearly" ? yearlyAmount : monthlyAmount) : "0"}/{subscription.plan === "yearly" ? "yr" : "mo"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoices</span>
              <span className="font-medium">{invoices.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payments</span>
              <span className="font-medium">{payments.length}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={isActive ? "success" : isTrial ? "outline" : "secondary"} className="capitalize text-[10px]">
                {isActive ? "Active" : isTrial ? "Trial" : subscription.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Available Plans (for upgrades) ──────────────────── */}
      {isActive && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              Available Plans
            </CardTitle>
            <CardDescription>Upgrade or downgrade your plan at any time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {Object.entries(PLAN_PRICES).map(([tier, prices]) => {
                const isCurrent = tier === currentTier
                return (
                  <div key={tier} className={cn(
                    "p-4 rounded-xl border transition-all",
                    isCurrent ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-primary/20 hover:bg-muted/20"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold capitalize">{PLAN_LABELS[tier] || tier}</h4>
                      {isCurrent && <Badge variant="outline" className="text-[9px]">Current</Badge>}
                    </div>
                    <div className="text-2xl font-bold mb-1">${prices.monthly}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                    <p className="text-xs text-muted-foreground">${prices.yearly}/yr <span className="text-emerald-500">(save ${prices.monthly * 12 - prices.yearly})</span></p>
                    {!isCurrent && (
                      <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => { setUpgradeTier(tier); setShowUpgrade(true) }}>
                        {parseInt(tier === "starter" ? "0" : tier === "growth" ? "1" : "2") > parseInt(currentTier === "starter" ? "0" : currentTier === "growth" ? "1" : "2") ? "Upgrade" : "Downgrade"}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Invoice History ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Receipt className="h-4 w-4 text-primary" />
              Invoice History
            </CardTitle>
            <CardDescription>Recent invoices from your active retainers</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No invoices yet</p>
              <p className="text-xs mt-1">Invoices will appear here once retainers are set up</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Invoice</th>
                    <th className="text-left py-2 px-2 font-medium">Client</th>
                    <th className="text-right py-2 px-2 font-medium">Amount</th>
                    <th className="text-center py-2 px-2 font-medium">Status</th>
                    <th className="text-right py-2 px-2 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 20).map((inv) => (
                    <tr key={inv.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-2 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-2">{inv.clientName}</td>
                      <td className="py-2.5 px-2 text-right font-medium">{formatCurrency(inv.amountUsd)}</td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant="outline" className={cn("text-[10px]", INVOICE_STATUS_COLORS[inv.status] || "")}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs text-muted-foreground">
                        {formatDate(inv.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Payment History ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-primary" />
            Payment History
          </CardTitle>
          <CardDescription>All payments processed through your account</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No payments yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Date</th>
                    <th className="text-left py-2 px-2 font-medium">Method</th>
                    <th className="text-right py-2 px-2 font-medium">Amount</th>
                    <th className="text-center py-2 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 20).map((pay) => (
                    <tr key={pay.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-2 text-xs">{formatDate(pay.createdAt)}</td>
                      <td className="py-2.5 px-2 capitalize text-xs">{pay.paymentMethod.replace("_", " ")}</td>
                      <td className="py-2.5 px-2 text-right font-medium">{formatCurrency(pay.amount)} {pay.currency}</td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant="outline" className={cn("text-[10px]", PAYMENT_STATUS_COLORS[pay.status] || "")}>
                          {pay.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Organization Info ───────────────────────────────── */}
      {organization && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              Workspace Billing Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Organization</p>
                <p className="text-sm font-medium">{organization.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Workspace ID</p>
                <p className="text-sm font-mono text-muted-foreground">{organization.slug}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Plan Level</p>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {organization.plan}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Upgrade / Subscribe Dialog ──────────────────────── */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogOverlay className="bg-black/50 backdrop-blur-sm" />
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <div className="p-6">
            <PaymentCheckout
              tierId={upgradeTier}
              tierName={PLAN_LABELS[upgradeTier as keyof typeof PLAN_LABELS] || "Starter"}
              amount={billingCycle === "monthly" ? (PLAN_PRICES[upgradeTier as keyof typeof PLAN_PRICES]?.monthly || 50) : (PLAN_PRICES[upgradeTier as keyof typeof PLAN_PRICES]?.yearly || 500)}
              billingCycle={billingCycle}
              onClose={() => setShowUpgrade(false)}
              onSuccess={() => { setShowUpgrade(false); loadData() }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Billing Toggle inline ───────────────────────────── */}
      {isTrial && trial.isActive && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Your trial is active</p>
                <p className="text-xs text-muted-foreground">Subscribe now to keep your data and automations running after the trial ends.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-lg p-0.5">
                <button onClick={() => setBillingCycle("monthly")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", billingCycle === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground")}>Monthly</button>
                <button onClick={() => setBillingCycle("yearly")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", billingCycle === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground")}>Yearly <span className="text-emerald-500">-17%</span></button>
              </div>
              <Button size="sm" onClick={() => { setUpgradeTier(currentTier); setShowUpgrade(true) }}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Subscribe
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
