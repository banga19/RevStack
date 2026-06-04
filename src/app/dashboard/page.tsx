"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useOrganization } from "@/lib/organization"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency } from "@/lib/utils"
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  CalendarCheck,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  RefreshCw,
  BarChart3,
  Activity,
  Send,
  FileText,
  Sparkles,
  Clock,
  CreditCard,
  Puzzle,
  BookOpen,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"

type DashboardData = {
  stats: {
    totalRevenue: number
    monthlyRevenue: number
    activeClients: number
    totalClients: number
    pipelineValue: number
    planProgress: number
    totalTasks: number
    completedTasks: number
    leadsGenerated: number
    outreachSent: number
  }
  revenueHistory: { month: string; revenue: number; costs: number }[]
  pipelineByTier: { tier: string; value: number; count: number }[]
  recentActivity: { id: string; type: string; message: string; time: string }[]
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { organization } = useOrganization()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [trialStatus, setTrialStatus] = useState<{
    daysRemaining: number
    isExpired: boolean
    isActive: boolean
    tier: string
  } | null>(null)

  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    status: string
    tier: string
    plan: string
  } | null>(null)

  // Check if onboarding is completed (admin users skip — they have demo data)
  useEffect(() => {
    if (!session?.user) return
    if (session.user.role === "admin") return
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((res) => {
        if (!res.completed && !res.id) {
          router.push("/onboarding")
        }
      })
      .catch(() => {})
  }, [session, router])

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Fetch trial and subscription status
  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((d) => {
        if (d.trial) {
          setTrialStatus({
            daysRemaining: d.trial.daysRemaining,
            isExpired: d.trial.isExpired,
            isActive: d.trial.isActive,
            tier: d.suggestedTier?.name || "Starter",
          })
        }
        if (d.subscription) {
          setSubscriptionStatus({
            status: d.subscription.status,
            tier: d.subscription.tier || "starter",
            plan: d.subscription.plan || "monthly",
          })
        }
      })
      .catch(() => {})
  }, [])

  // Determine whether user needs a payment
  const subLoaded = subscriptionStatus !== null || trialStatus !== null
  const needsPayment =
    subLoaded &&
    !trialStatus?.isActive &&
    (!subscriptionStatus || subscriptionStatus.status !== "active")

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="shimmer h-4 w-24 rounded mb-3" />
                <div className="shimmer h-8 w-32 rounded mb-2" />
                <div className="shimmer h-3 w-20 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="shimmer h-4 w-32 rounded mb-6" />
            <div className="shimmer h-64 w-full rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Dashboard Not Ready</h2>
        <p className="text-muted-foreground mb-6">Run the database setup to seed your data.</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
    )
  }

  const { stats, revenueHistory, pipelineByTier, recentActivity } = data
  const profitMargin = stats.totalRevenue > 0 ? ((stats.totalRevenue - 560) / stats.totalRevenue) * 100 : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your revenue automation system — {stats.activeClients} active client{stats.activeClients !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-sm px-3 py-1">
            <Activity className="h-3.5 w-3.5 mr-1" />
            {stats.planProgress}% Plan Complete
          </Badge>
        </div>
      </div>

      {/* Quick-Start Banner for new users */}
      {stats.activeClients === 0 && stats.totalClients === 0 && !loading && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 via-primary/5 to-purple-500/10 border border-primary/20 space-y-4">
          <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shrink-0">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold">Welcome to Mapato{organization ? `, ${organization.name}` : ""}! 👋</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get started by deploying an automation template or adding your first client to the pipeline.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/templates">
              <Button size="sm" variant="default">
                <Puzzle className="h-4 w-4 mr-2" /> Browse Templates
              </Button>
            </Link>
            <Link href="/pipeline">
              <Button size="sm" variant="outline">
                <Users className="h-4 w-4 mr-2" /> Add First Client
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="sm" variant="ghost">
                <BookOpen className="h-4 w-4 mr-2" /> View Guides
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Trial Banner */}
      {trialStatus && trialStatus.isActive && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-emerald-500/10 border border-primary/20 mt-10 space-y-1">
          <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold">You&apos;re on a <span className="text-primary">14-day free trial</span>
                {trialStatus.daysRemaining > 0 && (
                  <span> — <span className="font-bold">{trialStatus.daysRemaining} day{trialStatus.daysRemaining !== 1 ? "s" : ""} remaining</span></span>
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Enjoy full access to all Mapato features. No credit card required.
                We&apos;ll recommend the <strong className="font-semibold">{trialStatus.tier}</strong> plan based on your needs when the trial ends.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                <Clock className="h-3 w-3 mr-1" />
                {trialStatus.daysRemaining} days left
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Expired Trial Banner */}
      {trialStatus && trialStatus.isExpired && (
        <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 mt-8">
          <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
            <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                Your free trial has ended
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Subscribe to continue using Mapato. We recommend the <strong>{trialStatus.tier}</strong> plan.
              </p>
            </div>
            <Link href="/pricing">
              <Button size="sm" className="shrink-0">
                View Plans <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Payment CTA — shown when no active subscription/trial */}
      {needsPayment && (
        <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 mt-8">
          <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {trialStatus?.isExpired
                  ? "Continue using Mapato — choose a plan below."
                  : "Unlock full access with a subscription."}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pay via M-Pesa, Mobile Money, or Visa / Mastercard through Flutterwave.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/pricing">
                <Button size="sm" className="shrink-0">
                  <CreditCard className="h-3.5 w-3.5 mr-1" />
                  {trialStatus?.isExpired ? "Subscribe Now" : "View Plans & Pay"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Monthly Revenue</span>
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">+12%</span>
              <span className="text-muted-foreground ml-2">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground">{profitMargin.toFixed(0)}% margin</span>
              <span className="text-muted-foreground ml-2">· YTD</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Active Clients</span>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl font-bold">{stats.activeClients}</div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground">{stats.totalClients} total clients</span>
              <span className="text-muted-foreground ml-2">·</span>
              <span className="font-medium ml-1">{formatCurrency(stats.pipelineValue)} pipeline</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Plan Progress</span>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Target className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <div className="text-3xl font-bold">{stats.completedTasks}/{stats.totalTasks}</div>
            <Progress value={stats.planProgress} className="mt-3" />
            <div className="flex items-center mt-2 text-sm">
              <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground mr-1" />
              <span className="text-muted-foreground">{stats.planProgress}% complete</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Revenue & Costs
            </CardTitle>
            <CardDescription>Monthly revenue vs costs trajectory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                    formatter={(value: number) => [formatCurrency(value), undefined]}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costs" name="Costs" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline by Tier */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Pipeline by Tier
            </CardTitle>
            <CardDescription>Enterprise · Growth · Starter breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pipelineByTier}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="tier" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                    formatter={(value: number) => [formatCurrency(value), undefined]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Pipeline Value"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {pipelineByTier.map((tier) => (
                <div key={tier.tier} className="text-center">
                  <div className="text-sm font-medium capitalize text-muted-foreground">{tier.tier}</div>
                  <div className="text-lg font-bold">{formatCurrency(tier.value)}</div>
                  <div className="text-xs text-muted-foreground">{tier.count} client{tier.count !== 1 ? "s" : ""}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest actions across your system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 group">
                    <div className={cn(
                      "p-1.5 rounded-full mt-0.5",
                      activity.type === "revenue" && "bg-emerald-500/10 text-emerald-500",
                      activity.type === "client" && "bg-blue-500/10 text-blue-500",
                      activity.type === "outreach" && "bg-amber-500/10 text-amber-500",
                      activity.type === "task" && "bg-purple-500/10 text-purple-500",
                    )}>
                      {activity.type === "revenue" && <DollarSign className="h-3.5 w-3.5" />}
                      {activity.type === "client" && <Users className="h-3.5 w-3.5" />}
                      {activity.type === "outreach" && <Send className="h-3.5 w-3.5" />}
                      {activity.type === "task" && <FileText className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Next steps to hit $22,500/mo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Send outreach batch #2", desc: "20 logistics companies", icon: Send, color: "text-amber-500", href: "/outreach" },
              { label: "Review pipeline", desc: "3 leads need follow-up", icon: Users, color: "text-blue-500", href: "/pipeline" },
              { label: "Publish next article", desc: "WhatsApp Business API guide", icon: FileText, color: "text-purple-500", href: "/content" },
              { label: "Check financial model", desc: "Track to $22,500/mo target", icon: DollarSign, color: "text-emerald-500", href: "/financial" },
            ].map((action, i) => (
              <Link
                key={i}
                href={action.href}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
              >
                <div className={cn("p-2 rounded-lg bg-muted", action.color)}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
