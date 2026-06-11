"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { useCentralBrainSSE, type CentralBrainAgentEvent } from "@/lib/use-central-brain-sse"
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Zap,
  MessageSquare,
  Bot,
  Activity,
  Brain,
  ArrowRight,
  BarChart3,
  RefreshCw,
  Clock,
  AlertTriangle,
  Cpu,
  Radio,
  CheckCircle2,
  XCircle,
  Loader2,
  ListRestart,
  Lightbulb,
  Trash2,
  Receipt,
  FileText,
  Gauge,
  HeartHandshake,
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

type DashboardStats = {
  totalLeads: number
  qualifiedLeads: number
  activeClients: number
  monthlyRecurringRevenue: number
  pendingFollowups: number
  conversionRate: number
  totalMessages: number
  hermesRunsToday: number
}

type InvoiceItem = {
  id: string
  invoiceNumber: string
  amountUsd: number
  currency: string
  status: string
  dueDate: string
  issuedAt: string
  paidAt: string | null
  notes: string | null
  client: { name: string; company: string | null }
}

type InvoiceMetrics = {
  totalOutstanding: number
  overdueCount: number
  paidThisMonth: number
  totalInvoices: number
}

type ClientHealthEntry = {
  id: string
  name: string
  company: string
  status: string
  tier: string
  score: number
  retainerValue: number
  factors: { revenue: number; engagement: number; compliance: number; status: number; tenure: number }
}

type ClientHealthData = {
  scoredClients: ClientHealthEntry[]
  healthyCount: number
  mediumRiskCount: number
  highRiskCount: number
  totalScored: number
  averageScore: number
}

type RevenuePoint = {
  month: string
  revenue: number
  newClients: number
}

type PipelineBreakdown = {
  new: number
  qualified: number
  disqualified: number
  converted: number
}

type ActivityItem = {
  id: string
  type: string
  description: string
  entityType: string
  createdAt: string
}

type HermesRun = {
  id: string
  taskType: string
  status: string
  output: string | null
  leadsProcessed: number | null
  messagesQueued: number | null
  createdAt: string
  completedAt: string | null
}

type AgentStatusProps = {
  key: string
  label: string
  icon: any
  count: number
  lastActive: string
  isRunning: boolean
  color: string
}

export default function RevStackDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [pipeline, setPipeline] = useState<PipelineBreakdown | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [runs, setRuns] = useState<HermesRun[]>([])
  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [invoiceMetrics, setInvoiceMetrics] = useState<InvoiceMetrics | null>(null)
  const [clientHealth, setClientHealth] = useState<ClientHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLiveFeed, setShowLiveFeed] = useState(true)

  // Live Central Brain SSE stream — filters for action execution and error events
  const {
    events: brainEvents,
    status: sseStatus,
    clear: clearBrainEvents,
    latest: latestBrainEvent,
  } = useCentralBrainSSE({
    eventTypes: "action_executing,action_completed,error,orchestration_started,orchestration_completed,insight_discovered,agent_status_changed",
    maxBuffer: 100,
  })

  const fetchAll = useCallback(async () => {
    try {
      // All data flows through the HermesCentralBrain — single endpoint routes
      // through the RevStack Analytics Agent via the MessageBus
      const res = await fetch("/api/central-brain/revstack")
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status}`)
      }
      const data = await res.json()

      setStats(data.stats ?? null)
      setRevenue(data.revenue ?? [])
      setPipeline(data.pipeline ?? null)
      setActivity(data.activity ?? [])
      setRuns(data.runs ?? [])
      setInvoices(data.invoices ?? [])
      setInvoiceMetrics(data.invoiceMetrics ?? null)
      setClientHealth(data.clientHealth ?? null)
    } catch (e) {
      console.error("Failed to fetch RevStack analytics via Central Brain", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

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

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Data Yet</h2>
        <p className="text-muted-foreground mb-6">Run the RevStack seed to populate your dashboard.</p>
        <Button onClick={fetchAll}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
    )
  }

  const pipelineData = pipeline ? [
    { name: "New", value: pipeline.new, fill: "hsl(var(--chart-4))" },
    { name: "Qualified", value: pipeline.qualified, fill: "hsl(var(--chart-2))" },
    { name: "Disqualified", value: pipeline.disqualified, fill: "hsl(var(--chart-5))" },
    { name: "Converted", value: pipeline.converted, fill: "hsl(var(--chart-3))" },
  ] : []

  const runningRuns = runs.filter((r) => r.status === "running" || r.status === "pending")
  const completedRuns = runs.filter((r) => r.status === "completed")
  const failedRuns = runs.filter((r) => r.status === "failed")

  const agents: AgentStatusProps[] = [
    { key: "qualify_leads", label: "Lead Qualifier", icon: Users, count: 0, lastActive: "", isRunning: false, color: "text-blue-500" },
    { key: "send_followups", label: "Follow-up Sender", icon: MessageSquare, count: 0, lastActive: "", isRunning: false, color: "text-amber-500" },
    { key: "onboard_clients", label: "Onboarding Agent", icon: Target, count: 0, lastActive: "", isRunning: false, color: "text-emerald-500" },
    { key: "generate_report", label: "Report Agent", icon: Brain, count: 0, lastActive: "", isRunning: false, color: "text-purple-500" },
  ]

  // Derive agent statuses from runs
  for (const run of runs) {
    const agent = agents.find((a) => a.key === run.taskType)
    if (agent) {
      agent.count++
      if (!agent.lastActive || run.createdAt > agent.lastActive) {
        agent.lastActive = run.createdAt
      }
      if (run.status === "running" || run.status === "pending") {
        agent.isRunning = true
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            RevStack Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered revenue automation — {stats.activeClients} active client{stats.activeClients !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(
            "text-sm px-3 py-1",
            runningRuns.length > 0
              ? "text-primary border-primary/30"
              : "text-muted-foreground"
          )}>
            <Activity className={cn(
              "h-3.5 w-3.5 mr-1",
              runningRuns.length > 0 && "animate-pulse text-primary"
            )} />
            {runningRuns.length > 0 ? `${runningRuns.length} running` : "Idle"}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Live Agent Status ───────────────────────────────── */}
      <Card className="bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-transparent border-purple-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-5 w-5 text-purple-500" />
            Autonomous Agent Status
          </CardTitle>
          <CardDescription>Background agents run autonomously via the scheduler</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {agents.map((agent) => (
              <div
                key={agent.key}
                className={cn(
                  "p-4 rounded-lg border bg-card/50 space-y-2 transition-all duration-300",
                  agent.isRunning && "border-purple-500/50 shadow-sm shadow-purple-500/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <agent.icon className={cn("h-4 w-4", agent.color)} />
                    <span className="text-sm font-medium">{agent.label}</span>
                  </div>
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    agent.isRunning
                      ? "bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50"
                      : agent.count > 0
                        ? "bg-muted-foreground/50"
                        : "bg-muted-foreground/20"
                  )} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{agent.count} run{agent.count !== 1 ? "s" : ""}</span>
                  {agent.lastActive && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(agent.lastActive)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Running operations summary */}
          {runningRuns.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-purple-500 animate-pulse" />
                <span className="font-medium text-purple-500">
                  {runningRuns.length} operation{runningRuns.length !== 1 ? "s" : ""} in progress
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {runningRuns.slice(0, 3).map((run) => (
                  <div key={run.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="font-mono">{run.taskType.replace(/_/g, " ")}</span>
                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30">
                      {run.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent failures */}
          {failedRuns.length > 0 && (
            <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-500">
                  {failedRuns.length} failed run{failedRuns.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</span>
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(stats.monthlyRecurringRevenue)}</div>
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">MRR</span>
              <span className="text-muted-foreground ml-2">retainer-based</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Leads Pipeline</span>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl font-bold">{stats.totalLeads}</div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-blue-500 font-medium">{stats.qualifiedLeads} qualified</span>
              <span className="text-muted-foreground ml-2">· {stats.conversionRate}% conversion</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Active Clients</span>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Target className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <div className="text-3xl font-bold">{stats.activeClients}</div>
            <div className="flex items-center mt-2 text-sm">
              <MessageSquare className="h-3.5 w-3.5 text-amber-500 mr-1" />
              <span className="text-amber-500 font-medium">{stats.pendingFollowups} pending</span>
              <span className="text-muted-foreground ml-2">follow-ups</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Hermes AI Activity</span>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Bot className="h-4 w-4 text-purple-500" />
              </div>
            </div>
            <div className="text-3xl font-bold">{stats.hermesRunsToday}</div>
            <div className="flex items-center mt-2 text-sm">
              <Zap className="h-3.5 w-3.5 text-purple-500 mr-1" />
              <span className="text-purple-500 font-medium">{stats.totalMessages} messages</span>
              <span className="text-muted-foreground ml-2">sent today</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Revenue Timeline
            </CardTitle>
            <CardDescription>Projected retainer revenue over 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue}>
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
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>New clients this period:</span>
              <div className="flex gap-3">
                {revenue.filter((r) => r.newClients > 0).slice(-3).map((r) => (
                  <span key={r.month} className="font-medium text-foreground">
                    {r.month}: +{r.newClients}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Pipeline Funnel
            </CardTitle>
            <CardDescription>Lead stages from new to converted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {pipelineData.map((item) => (
                <div key={item.name} className="text-center">
                  <div className="text-lg font-bold">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List Widget */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-5 w-5 text-primary" />
                Recent Invoices
              </CardTitle>
              <CardDescription>Latest invoices from active retainers</CardDescription>
            </div>
            {invoiceMetrics && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  <DollarSign className="h-3 w-3 mr-0.5 text-emerald-500" />
                  {formatCurrency(invoiceMetrics.totalOutstanding)} outstanding
                </Badge>
                {invoiceMetrics.overdueCount > 0 && (
                  <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-500">
                    {invoiceMetrics.overdueCount} overdue
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No invoices yet — run RevStack Operations to generate invoices from active retainers</p>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => {
                  const statusColor: Record<string, string> = {
                    draft: "bg-muted text-muted-foreground border-muted-foreground/20",
                    sent: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                    paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    overdue: "bg-red-500/10 text-red-600 border-red-500/20",
                    cancelled: "bg-muted text-muted-foreground/50 border-muted-foreground/10",
                  }
                  const statusIcon: Record<string, React.ReactNode> = {
                    draft: <Clock className="h-3.5 w-3.5" />,
                    sent: <FileText className="h-3.5 w-3.5" />,
                    paid: <CheckCircle2 className="h-3.5 w-3.5" />,
                    overdue: <AlertTriangle className="h-3.5 w-3.5" />,
                    cancelled: <XCircle className="h-3.5 w-3.5" />,
                  }
                  const daysUntilDue = Math.ceil((new Date(inv.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

                  return (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/20 hover:bg-muted/30 transition-all group"
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg shrink-0",
                        inv.status === "paid" ? "bg-emerald-500/10" :
                        inv.status === "overdue" ? "bg-red-500/10" :
                        inv.status === "sent" ? "bg-blue-500/10" : "bg-muted"
                      )}>
                        {statusIcon[inv.status] || <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium">{inv.invoiceNumber}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1", statusColor[inv.status] || "")}>
                            {statusIcon[inv.status]}
                            <span className="capitalize">{inv.status}</span>
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {inv.client.name}{inv.client.company ? ` · ${inv.client.company}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{formatCurrency(inv.amountUsd)}</p>
                        <p className={cn(
                          "text-[10px]",
                          daysUntilDue < 0 && inv.status !== "paid" ? "text-red-500" : "text-muted-foreground"
                        )}>
                          {inv.status === "paid" && inv.paidAt
                            ? `Paid ${new Date(inv.paidAt).toLocaleDateString()}`
                            : daysUntilDue < 0
                              ? `${Math.abs(daysUntilDue)}d overdue`
                              : daysUntilDue === 0
                                ? "Due today"
                                : `Due in ${daysUntilDue}d`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Health Score Widget */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="h-5 w-5 text-primary" />
                Client Health Scores
              </CardTitle>
              <CardDescription>
                {clientHealth
                  ? `${clientHealth.totalScored} active clients · Avg ${clientHealth.averageScore}/100`
                  : "Scored on revenue, engagement, compliance, tenure"}
              </CardDescription>
            </div>
            {clientHealth && (
              <div className="flex items-center gap-1.5">
                {clientHealth.highRiskCount > 0 && (
                  <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-500">
                    {clientHealth.highRiskCount} at risk
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                  {clientHealth.healthyCount} healthy
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!clientHealth || clientHealth.scoredClients.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No clients scored yet — clients need active status and data to generate health scores</p>
            ) : (
              <div className="space-y-2">
                {clientHealth.scoredClients.map((c) => {
                  const tierColor = c.tier === "healthy" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                    : c.tier === "medium" ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                    : "text-red-500 bg-red-500/10 border-red-500/20"

                  const barColor = c.score >= 70 ? "bg-emerald-500"
                    : c.score >= 45 ? "bg-amber-500"
                    : "bg-red-500"

                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:border-primary/20 hover:bg-muted/30 transition-all group"
                    >
                      {/* Score circle */}
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        c.score >= 70 ? "bg-emerald-500/10 text-emerald-600" :
                        c.score >= 45 ? "bg-amber-500/10 text-amber-600" :
                        "bg-red-500/10 text-red-600"
                      )}>
                        {c.score}
                      </div>

                      {/* Client info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate">{c.name}</span>
                          {c.tier === "healthy" && <HeartHandshake className="h-3 w-3 text-emerald-500 shrink-0" />}
                          {c.tier === "high-risk" && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {c.company || c.status}
                          {c.retainerValue > 0 && ` · ${formatCurrency(c.retainerValue)}/mo`}
                        </p>
                      </div>

                      {/* Score bar */}
                      <div className="w-16 hidden sm:block">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${c.score}%` }} />
                        </div>
                      </div>

                      {/* Tier badge */}
                      <Badge className={cn("text-[9px] capitalize", tierColor)}>
                        {c.tier}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Factor legend */}
            {clientHealth && clientHealth.scoredClients.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Revenue
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" /> Engagement
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" /> Compliance
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500" /> Status
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-cyan-500" /> Tenure
                  </span>
                </div>
              </div>
            )}
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
            <CardDescription>Latest actions from RevStack automation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No recent activity</p>
              ) : (
                activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 group">
                    <div className={cn(
                      "p-1.5 rounded-full mt-0.5 shrink-0",
                      a.entityType === "lead" && "bg-blue-500/10 text-blue-500",
                      a.entityType === "client" && "bg-emerald-500/10 text-emerald-500",
                      a.entityType === "retainer" && "bg-primary/10 text-primary",
                      a.entityType === "followup" && "bg-amber-500/10 text-amber-500",
                      a.entityType === "message" && "bg-purple-500/10 text-purple-500",
                      a.entityType === "hermes_run" && "bg-cyan-500/10 text-cyan-500",
                      !["lead", "client", "retainer", "followup", "message", "hermes_run"].includes(a.entityType || "") && "bg-gray-500/10 text-gray-500",
                    )}>
                      {a.entityType === "lead" && <Users className="h-3.5 w-3.5" />}
                      {a.entityType === "client" && <Target className="h-3.5 w-3.5" />}
                      {a.entityType === "retainer" && <DollarSign className="h-3.5 w-3.5" />}
                      {a.entityType === "followup" && <MessageSquare className="h-3.5 w-3.5" />}
                      {a.entityType === "message" && <Zap className="h-3.5 w-3.5" />}
                      {a.entityType === "hermes_run" && <Bot className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{a.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDate(a.createdAt)}
                      </p>
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
              <Zap className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Revenue automation tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Batch Qualify Leads", desc: `${stats.totalLeads - stats.qualifiedLeads} leads need scoring`, icon: Zap, color: "text-blue-500", href: "/leads" },
              { label: "Send Pending Follow-ups", desc: `${stats.pendingFollowups} messages ready to send`, icon: MessageSquare, color: "text-amber-500", href: "/followups" },
              { label: "Review Retainers", desc: "Manage recurring revenue agreements", icon: DollarSign, color: "text-emerald-500", href: "/retainers" },
              { label: "View Agent Status", desc: `${stats.hermesRunsToday} runs today — auto-sweep status`, icon: Cpu, color: "text-purple-500", href: "/hermes" },
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
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Live Central Brain Event Feed — SSE ────────────── */}
      <Card className={cn(
        "transition-all duration-300",
        latestBrainEvent?.type === "error" && "border-red-500/30",
        latestBrainEvent?.type === "action_executing" && "border-purple-500/20",
      )}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className={cn(
                "h-5 w-5",
                sseStatus === "connected" ? "text-emerald-500" : "text-muted-foreground"
              )} />
              Central Brain Live Feed
            </CardTitle>
            <CardDescription>
              Real-time agent events from the HermesCentralBrain MessageBus
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Connection status badge */}
            <Badge variant="outline" className={cn(
              "text-[10px] px-2 py-0.5",
              sseStatus === "connected" && "border-emerald-500/30 text-emerald-500",
              sseStatus === "connecting" && "border-amber-500/30 text-amber-500",
              sseStatus === "error" && "border-red-500/30 text-red-500",
              sseStatus === "disconnected" && "text-muted-foreground",
            )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mr-1",
                sseStatus === "connected" && "bg-emerald-500",
                sseStatus === "connecting" && "bg-amber-500 animate-pulse",
                sseStatus === "error" && "bg-red-500",
                sseStatus === "disconnected" && "bg-muted-foreground",
              )} />
              {sseStatus}
            </Badge>
            {/* Toggle / Clear */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLiveFeed(!showLiveFeed)}
              className="h-7 px-2"
            >
              {showLiveFeed ? "Hide" : "Show"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearBrainEvents}
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>

        {showLiveFeed && (
          <CardContent>
            {brainEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Radio className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Waiting for agent events...</p>
                <p className="text-xs mt-1">
                  {sseStatus === "connecting"
                    ? "Connecting to Central Brain SSE stream"
                    : sseStatus === "error"
                      ? "Connection lost — reconnecting..."
                      : "Run a Hermes sweep or God Mode operation to see live events"}
                </p>
              </div>
            ) : (
              <>
                {/* Event count + connection indicator */}
                <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {brainEvents.length} event{brainEvents.length !== 1 ? "s" : ""}
                  </Badge>
                  {latestBrainEvent && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      last {new Date(latestBrainEvent.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {/* Scrollable event list */}
                <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                  {brainEvents.slice(0, 50).map((evt, i) => (
                    <div
                      key={`${evt.timestamp}-${i}`}
                      className={cn(
                        "flex items-start gap-3 p-2.5 rounded-lg text-xs transition-all",
                        evt.type === "error" && "bg-red-500/5 border border-red-500/10",
                        evt.type === "action_executing" && "bg-purple-500/5",
                        evt.type === "action_completed" && evt.details?.success === false && "bg-amber-500/5",
                        evt.type === "action_completed" && evt.details?.success === true && "bg-emerald-500/5",
                        evt.type === "orchestration_started" && "bg-blue-500/5",
                        evt.type === "insight_discovered" && "bg-cyan-500/5",
                        evt.type === "orchestration_completed" && "bg-green-500/5",
                        !["error", "action_executing", "action_completed", "orchestration_started", "insight_discovered", "orchestration_completed"].includes(evt.type) && "bg-muted/20",
                      )}
                    >
                      {/* Event icon */}
                      <div className={cn(
                        "p-1 rounded-full mt-0.5 shrink-0",
                        evt.type === "error" && "bg-red-500/10 text-red-500",
                        evt.type === "action_executing" && "bg-purple-500/10 text-purple-500",
                        evt.type === "action_completed" && evt.details?.success === true && "bg-emerald-500/10 text-emerald-500",
                        evt.type === "action_completed" && evt.details?.success === false && "bg-amber-500/10 text-amber-500",
                        evt.type === "orchestration_started" && "bg-blue-500/10 text-blue-500",
                        evt.type === "orchestration_completed" && "bg-green-500/10 text-green-500",
                        evt.type === "insight_discovered" && "bg-cyan-500/10 text-cyan-500",
                        evt.type === "agent_status_changed" && "bg-gray-500/10 text-gray-500",
                      )}>
                        {evt.type === "error" && <XCircle className="h-3.5 w-3.5" />}
                        {evt.type === "action_executing" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {evt.type === "action_completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {evt.type === "orchestration_started" && <ListRestart className="h-3.5 w-3.5" />}
                        {evt.type === "orchestration_completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {evt.type === "insight_discovered" && <Lightbulb className="h-3.5 w-3.5" />}
                        {evt.type === "agent_status_changed" && <Activity className="h-3.5 w-3.5" />}
                        {!["error", "action_executing", "action_completed", "orchestration_started", "orchestration_completed", "insight_discovered", "agent_status_changed"].includes(evt.type) && <Radio className="h-3.5 w-3.5" />}
                      </div>

                      {/* Event content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={cn(
                            "text-[9px] px-1.5 py-0 font-mono uppercase tracking-wider",
                            evt.type === "error" && "border-red-500/30 text-red-500",
                            evt.type === "action_executing" && "border-purple-500/30 text-purple-500",
                            evt.type === "action_completed" && "border-emerald-500/30 text-emerald-500",
                            evt.type === "orchestration_started" && "border-blue-500/30 text-blue-500",
                            evt.type === "insight_discovered" && "border-cyan-500/30 text-cyan-500",
                          )}>
                            {evt.type.replace(/_/g, " ")}
                          </Badge>
                          {!!evt.details?.agentType && (
                            <span className="text-[10px] font-medium text-foreground/70">
                              {String(evt.details.agentType)}
                            </span>
                          )}
                        </div>
                        {!!evt.details?.action && (
                          <p className="text-xs text-foreground/80 mt-0.5 truncate">
                            {String(evt.details.action)}
                          </p>
                        )}
                        {evt.type === "error" && !!evt.details?.error && (
                          <p className="text-xs text-red-500 mt-0.5 truncate">
                            {String(evt.details.error)}
                          </p>
                        )}
                        {!!evt.details?.durationMs && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {Number(evt.details.durationMs) >= 1000
                              ? `${(Number(evt.details.durationMs) / 1000).toFixed(1)}s`
                              : `${evt.details.durationMs}ms`}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overflow indicator */}
                {brainEvents.length > 50 && (
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    Showing 50 of {brainEvents.length} events
                  </p>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
