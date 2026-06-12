"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { useOrganization } from "@/components/auth-provider"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  MessageSquare,
  Activity,
  Clock,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Bot,
  Mail,
  Phone,
  Shield,
  Crown,
  CalendarDays,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  BarChart3,
  UserPlus,
  Settings,
  Globe,
  CreditCard,
  FileText,
} from "lucide-react"
import Link from "next/link"

// ── Types ──────────────────────────────────────────────────────────────────

interface PortalData {
  profile: {
    name: string
    email: string
    role: string
    subscriptionStatus: string | null
    subscriptionTier: string | null
    trialEndsAt: string | null
  }
  organization: {
    id: string
    name: string
    slug: string
    plan: string
    createdAt: string
  } | null
  metrics: {
    totalLeads: number
    qualifiedLeads: number
    activeClients: number
    totalClients: number
    monthlyRecurringRevenue: number
    totalMessages: number
    recentActivity: number
  }
  recentLeads: Array<{
    id: string
    companyName: string
    contactName: string
    status: string
    score: number | null
    tier: string | null
    createdAt: string
  }>
  recentClients: Array<{
    id: string
    name: string
    company: string
    tier: string | null
    retainer: number | null
    createdAt: string
  }>
  recentInvoices: Array<{
    id: string
    invoiceNumber: string
    amountUsd: number
    status: string
    dueDate: string
    clientName: string
  }>
  teamMembers: Array<{
    id: string
    name: string
    email: string
    role: string
    image: string | null
    joinedAt: string
  }>
  recentActivity: Array<{
    id: string
    type: string
    description: string
    entityType: string | null
    createdAt: string
  }>
  scope: {
    organizationId: string | null
    isAdmin: boolean
    memberCount: number
  }
}

// ── Status colours ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  qualified: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  disqualified: "bg-red-500/10 text-red-600 border-red-500/20",
  converted: "bg-purple-500/10 text-purple-600 border-purple-500/20",
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-muted-foreground/20",
  sent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-muted text-muted-foreground/50 border-muted-foreground/10",
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function PortalPage() {
  const router = useRouter()
  const { organization } = useOrganization()
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/portal")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError("Failed to load portal data")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
        <h2 className="text-xl font-semibold mb-2">Unable to Load Portal</h2>
        <p className="text-muted-foreground mb-6">{error || "Something went wrong"}</p>
        <Button onClick={loadData}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
      </div>
    )
  }

  const { metrics, organization: org, profile, teamMembers } = data
  const daysLeft = profile.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(profile.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {org?.name || "My Workspace"}
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                {teamMembers.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
                  </span>
                )}
                {profile.subscriptionTier && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      <Crown className="h-3 w-3 mr-0.5 text-amber-500" />
                      {profile.subscriptionTier}
                    </Badge>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {profile.subscriptionStatus === "trial" && daysLeft > 0 && (
            <Badge variant="outline" className="border-primary/30 text-primary">
              <Clock className="h-3 w-3 mr-1" />
              {daysLeft} day{daysLeft !== 1 ? "s" : ""} left in trial
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Trial Banner ────────────────────────────────────── */}
      {profile.subscriptionStatus === "trial" && daysLeft <= 3 && daysLeft > 0 && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Your trial ends in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">Subscribe to keep your data and automations running.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => router.push("/pricing")}>
              <CreditCard className="h-4 w-4 mr-2" /> Subscribe Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Metrics Grid ────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Monthly Recurring Revenue</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-500">
              {formatCurrency(metrics.monthlyRecurringRevenue)}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {metrics.activeClients} active client{metrics.activeClients !== 1 ? "s" : ""}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Active Clients</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-500">{metrics.activeClients}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {metrics.totalClients} total client{metrics.totalClients !== 1 ? "s" : ""}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Leads</span>
              <Target className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-500">{metrics.totalLeads}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {metrics.qualifiedLeads} qualified
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Messages Sent</span>
              <MessageSquare className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-500">{metrics.totalMessages}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {metrics.recentActivity} recent activities
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Grid ───────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column — Recent Leads & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Leads */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary" />
                  Recent Leads
                </CardTitle>
                <CardDescription>Latest prospects in your pipeline</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push("/leads")}>
                View All <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {data.recentLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No leads yet</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/leads")}>
                    <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Lead
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        lead.status === "new" ? "bg-blue-500/10 text-blue-600" :
                        lead.status === "qualified" ? "bg-emerald-500/10 text-emerald-600" :
                        lead.status === "converted" ? "bg-purple-500/10 text-purple-600" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {lead.companyName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lead.companyName}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.contactName} · {lead.email}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[lead.status] || "")}>
                        {lead.status}
                      </Badge>
                      {lead.score !== null && (
                        <span className={cn(
                          "text-xs font-mono font-medium",
                          lead.score >= 60 ? "text-emerald-500" : "text-amber-500"
                        )}>
                          {lead.score}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest actions across your workspace</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recentActivity.slice(0, 10).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors">
                      <div className={cn(
                        "p-1 rounded-full mt-0.5 shrink-0",
                        a.entityType === "lead" && "bg-blue-500/10 text-blue-500",
                        a.entityType === "client" && "bg-emerald-500/10 text-emerald-500",
                        a.entityType === "retainer" && "bg-primary/10 text-primary",
                        a.entityType === "followup" && "bg-amber-500/10 text-amber-500",
                        a.entityType === "message" && "bg-purple-500/10 text-purple-500",
                        a.entityType === "hermes_run" && "bg-cyan-500/10 text-cyan-500",
                      )}>
                        {a.entityType === "lead" && <Users className="h-3 w-3" />}
                        {a.entityType === "client" && <Target className="h-3 w-3" />}
                        {a.entityType === "retainer" && <DollarSign className="h-3 w-3" />}
                        {a.entityType === "followup" && <MessageSquare className="h-3 w-3" />}
                        {a.entityType === "message" && <Zap className="h-3 w-3" />}
                        {a.entityType === "hermes_run" && <Bot className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{a.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDate(a.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Team & Quick Actions */}
        <div className="space-y-6">
          {/* Team Members */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  Team
                </CardTitle>
                <CardDescription>{teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No team members</p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          {member.role === "admin" && (
                            <Shield className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-3" />

              <p className="text-xs text-muted-foreground text-center">
                Manage team members and permissions in Settings
              </p>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                Recent Invoices
              </CardTitle>
              <CardDescription>Latest invoices from active retainers</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  {data.recentInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{inv.clientName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{inv.invoiceNumber}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold">{formatCurrency(inv.amountUsd)}</p>
                        <Badge variant="outline" className={cn("text-[9px] px-1 py-0", INVOICE_STATUS_COLORS[inv.status] || "")}>
                          {inv.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "View Dashboard", icon: BarChart3, href: "/dashboard", color: "text-primary" },
                { label: "Manage Leads", icon: Users, href: "/leads", color: "text-blue-500" },
                { label: "View Retainers", icon: DollarSign, href: "/retainers", color: "text-emerald-500" },
                { label: "Send Messages", icon: MessageSquare, href: "/messages", color: "text-purple-500" },
                { label: "AI Operations", icon: Bot, href: "/operations", color: "text-cyan-500" },
                { label: "Billing & Plan", icon: CreditCard, href: "/pricing", color: "text-amber-500" },
              ].map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:border-primary/20 hover:bg-muted/30 transition-all group"
                >
                  <div className={cn("p-1.5 rounded-lg bg-muted", action.color)}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm flex-1">{action.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Organization Info Card ──────────────────────────── */}
      {org && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              Workspace Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Organization Name</p>
                <p className="text-sm font-medium">{org.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Workspace ID</p>
                <p className="text-sm font-mono text-muted-foreground">{org.slug}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Plan</p>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {org.plan}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
