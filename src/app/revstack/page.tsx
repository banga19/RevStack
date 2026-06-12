"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils"
import { useCentralBrainSSE } from "@/lib/use-central-brain-sse"
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Zap,
  MessageSquare,
  Activity,
  Brain,
  BarChart3,
  RefreshCw,
  Clock,
  AlertTriangle,
  Radio,
  CheckCircle2,
  XCircle,
  Loader2,
  ListRestart,
  Lightbulb,
  Trash2,
  Receipt,
  Gauge,
  HeartHandshake,
  LineChart,
  Sparkles,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ComposedChart,
} from "recharts"

// ── Types ───────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalLeads: number
  qualifiedLeads: number
  activeClients: number
  monthlyRecurringRevenue: number
  pendingFollowups: number
  conversionRate: number
  totalMessages: number
  hermesRunsToday: number
}

interface ForecastMonth {
  month: string
  label: string
  actual: number
  projected: number
  newClients: number
  invoices: number
}

interface ForecastData {
  monthly: ForecastMonth[]
  currentMrr: number
  projectedMrr: number
  totalInvoiced: number
  paidInvoiced: number
  outstanding: number
}

interface PipelineData {
  totalLeads: number
  byStage: { new: number; qualified: number; disqualified: number; converted: number }
  conversionRate: number
  avgConversionDays: number | null
  totalFollowups: number
  responseRate: number
  totalMessages: number
  activeClients: number
}

interface ClientHealthEntry {
  id: string
  name: string
  company: string
  score: number
  tier: string
  scoreFactors: { revenue: number; engagement: number; compliance: number; status: number; tenure: number }
  retainerValue: number
  lastInvoiceDate: string | null
}

interface ClientHealthData {
  scored: ClientHealthEntry[]
  healthyCount: number
  mediumCount: number
  riskCount: number
  totalScored: number
  averageScore: number
}

interface RevStackAnalytics {
  stats: DashboardStats
  forecast: ForecastData
  pipeline: PipelineData
  clientHealth: ClientHealthData
}

// ── Constants ───────────────────────────────────────────────────────────────

const HEALTH_COLORS = { healthy: "#10b981", medium: "#f59e0b", "at-risk": "#ef4444" }
const STAGE_COLORS = { new: "#3b82f6", qualified: "#8b5cf6", disqualified: "#6b7280", converted: "#10b981" }
const AUTO_REFRESH_INTERVAL = 30_000 // 30 seconds

// ── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-popover-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-semibold text-popover-foreground">
            {typeof entry.value === "number" && (entry.name?.toLowerCase().includes("revenue") || entry.name?.toLowerCase().includes("mrr") || entry.name?.toLowerCase().includes("actual") || entry.name?.toLowerCase().includes("projected"))
              ? formatCurrency(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, icon: Icon, color, trend }: {
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
  color: string
  trend?: { direction: "up" | "down"; label: string }
}) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 group">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          <div className={cn("p-2 rounded-lg transition-colors", `${color}/10`)}>
            <Icon className={cn("h-4 w-4", color)} />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="flex items-center mt-1.5 gap-2">
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          {trend && (
            <span className={cn(
              "text-[10px] font-medium flex items-center gap-0.5",
              trend.direction === "up" ? "text-emerald-500" : "text-red-500"
            )}>
              {trend.direction === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.label}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function RevStackDashboardPage() {
  const [analytics, setAnalytics] = useState<RevStackAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLiveFeed, setShowLiveFeed] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Live Central Brain SSE stream
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
      const [dashboardRes, forecastRes] = await Promise.all([
        fetch("/api/central-brain/revstack"),
        fetch("/api/revstack/analytics/forecast"),
      ])
      if (!dashboardRes.ok) throw new Error(`Dashboard: ${dashboardRes.status}`)
      if (!forecastRes.ok) throw new Error(`Forecast: ${forecastRes.status}`)

      const dashboardData = await dashboardRes.json()
      const forecastData = await forecastRes.json()

      setAnalytics({
        stats: dashboardData.stats ?? {},
        forecast: forecastData.forecast ?? { monthly: [], currentMrr: 0, projectedMrr: 0, totalInvoiced: 0, paidInvoiced: 0, outstanding: 0 },
        pipeline: forecastData.pipeline ?? { totalLeads: 0, byStage: { new: 0, qualified: 0, disqualified: 0, converted: 0 }, conversionRate: 0, avgConversionDays: null, totalFollowups: 0, responseRate: 0, totalMessages: 0, activeClients: 0 },
        clientHealth: forecastData.clientHealth ?? { scored: [], healthyCount: 0, mediumCount: 0, riskCount: 0, totalScored: 0, averageScore: 0 },
      })
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      console.error("Failed to fetch RevStack analytics:", e)
      setError("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => { fetchAll() }, [fetchAll])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAll, AUTO_REFRESH_INTERVAL)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, fetchAll])

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="shimmer h-3 w-20 rounded mb-3" /><div className="shimmer h-7 w-28 rounded mb-2" /><div className="shimmer h-3 w-16 rounded" /></CardContent></Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="shimmer h-4 w-32 rounded mb-4" /><div className="shimmer h-64 w-full rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  const { stats, forecast, pipeline, clientHealth } = analytics || {
    stats: {} as DashboardStats,
    forecast: { monthly: [], currentMrr: 0, projectedMrr: 0, totalInvoiced: 0, paidInvoiced: 0, outstanding: 0 } as ForecastData,
    pipeline: { totalLeads: 0, byStage: { new: 0, qualified: 0, disqualified: 0, converted: 0 }, conversionRate: 0, avgConversionDays: null, totalFollowups: 0, responseRate: 0, totalMessages: 0, activeClients: 0 } as PipelineData,
    clientHealth: { scored: [], healthyCount: 0, mediumCount: 0, riskCount: 0, totalScored: 0, averageScore: 0 } as ClientHealthData,
  }

  // Prepare chart data
  const stageData = Object.entries(pipeline.byStage).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: val,
    fill: STAGE_COLORS[key as keyof typeof STAGE_COLORS] || "#6b7280",
  }))

  const healthPieData = [
    { name: "Healthy", value: clientHealth.healthyCount, color: HEALTH_COLORS.healthy },
    { name: "Medium", value: clientHealth.mediumCount, color: HEALTH_COLORS.medium },
    { name: "At Risk", value: clientHealth.riskCount, color: HEALTH_COLORS["at-risk"] },
  ].filter((d) => d.value > 0)

  const isEmpty = !stats.totalLeads && !stats.activeClients && !stats.monthlyRecurringRevenue

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">RevStack Dashboard</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                AI-powered revenue automation
                {lastUpdated && (
                  <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Badge variant="outline" className={cn(
            "text-xs px-3 py-1 gap-1.5",
            sseStatus === "connected" ? "border-emerald-500/30 text-emerald-500" : "text-muted-foreground"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              sseStatus === "connected" ? "bg-emerald-500" : sseStatus === "connecting" ? "bg-amber-500 animate-pulse" : "bg-muted-foreground"
            )} />
            {sseStatus === "connected" ? "Live" : sseStatus === "connecting" ? "Connecting" : "Offline"}
          </Badge>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", autoRefresh && "animate-spin")} />
            Auto
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchAll}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Empty State ─────────────────────────────────────── */}
      {isEmpty && !loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Data Yet</h2>
          <p className="text-muted-foreground mb-6 text-sm">Add leads, clients, and retainers to populate your dashboard</p>
          <div className="flex gap-3">
            <Button onClick={() => window.location.href = "/leads"}>Add Leads</Button>
            <Button variant="outline" onClick={fetchAll}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI Cards Row ───────────────────────────────── */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="MRR"
              value={formatCurrency(forecast.currentMrr)}
              subtitle={`${forecast.projectedMrr > forecast.currentMrr ? "+" : ""}${formatCurrency(forecast.projectedMrr - forecast.currentMrr)} projected`}
              icon={DollarSign}
              color="text-emerald-500"
              trend={forecast.projectedMrr > forecast.currentMrr ? { direction: "up", label: "Growing" } : undefined}
            />
            <KpiCard
              title="Leads"
              value={String(pipeline.totalLeads)}
              subtitle={`${pipeline.byStage.qualified} qualified · ${pipeline.conversionRate}% conversion`}
              icon={Target}
              color="text-blue-500"
            />
            <KpiCard
              title="Clients"
              value={String(pipeline.activeClients)}
              subtitle={`${clientHealth.healthyCount} healthy · ${clientHealth.riskCount} at risk`}
              icon={Users}
              color="text-purple-500"
            />
            <KpiCard
              title="Pipeline Velocity"
              value={pipeline.avgConversionDays !== null ? `${pipeline.avgConversionDays}d` : "—"}
              subtitle={`${pipeline.responseRate}% response rate`}
              icon={TrendingUp}
              color="text-amber-500"
            />
          </div>

          {/* ── Charts Grid — Revenue Forecast + Pipeline ──── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Forecast Chart */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <LineChart className="h-4 w-4 text-primary" />
                      Revenue Forecast
                    </CardTitle>
                    <CardDescription>6-month actuals + 3-month projection</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    <Sparkles className="h-3 w-3 mr-0.5 text-primary" /> {formatCurrency(forecast.projectedMrr)} projected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecast.monthly} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" opacity={0.6} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} stroke="hsl(var(--muted-foreground))" opacity={0.6} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="actual" name="Actual Revenue" stroke="#6366f1" fill="url(#actualGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="projected" name="Projected" stroke="#f59e0b" fill="url(#projectedGrad)" strokeWidth={2} strokeDasharray="6 3" />
                      <Bar dataKey="newClients" name="New Clients" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={12} opacity={0.7} yAxisId="right" />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" opacity={0.3} allowDecimals={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-indigo-500 rounded" /> Actual</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-amber-500 rounded border-dashed" style={{ borderTop: "2px dashed #f59e0b", height: 0 }} /> Projected</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-500/70" /> New clients</span>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Funnel + Velocity */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-primary" />
                      Pipeline Funnel
                    </CardTitle>
                    <CardDescription>Lead stages from new to converted</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {pipeline.conversionRate}% conversion
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stageData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" opacity={0.6} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" opacity={0.6} width={80} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]} barSize={24}>
                        {stageData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Velocity metrics row */}
                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border/50">
                  {stageData.map((item) => (
                    <div key={item.name} className="text-center">
                      <div className="text-lg font-bold" style={{ color: item.fill }}>{item.value}</div>
                      <div className="text-[10px] text-muted-foreground">{item.name}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Avg {pipeline.avgConversionDays || "—"} days to convert
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {pipeline.responseRate}% response rate
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {pipeline.totalFollowups} follow-ups
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Revenue Summary + Client Health ───────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Revenue Summary
                </CardTitle>
                <CardDescription>Invoiced, collected, and outstanding</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10"><DollarSign className="h-4 w-4 text-emerald-500" /></div>
                      <span className="text-sm">Monthly Recurring Revenue</span>
                    </div>
                    <span className="text-lg font-bold text-emerald-500">{formatCurrency(forecast.currentMrr)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10"><Receipt className="h-4 w-4 text-blue-500" /></div>
                      <span className="text-sm">Total Invoiced</span>
                    </div>
                    <span className="text-lg font-bold">{formatCurrency(forecast.totalInvoiced)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
                      <span className="text-sm">Collected</span>
                    </div>
                    <span className="text-lg font-bold text-emerald-500">{formatCurrency(forecast.paidInvoiced)}</span>
                  </div>
                  {forecast.outstanding > 0 && (
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
                        <span className="text-sm">Outstanding</span>
                      </div>
                      <span className="text-lg font-bold text-red-500">{formatCurrency(forecast.outstanding)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Client Health Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Gauge className="h-4 w-4 text-primary" />
                      Client Health Distribution
                    </CardTitle>
                    <CardDescription>
                      {clientHealth.totalScored} clients · Avg {clientHealth.averageScore}/100
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {clientHealth.riskCount > 0 && (
                      <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-500">{clientHealth.riskCount} at risk</Badge>
                    )}
                    <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-500">{clientHealth.healthyCount} healthy</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {/* Donut chart */}
                  <div className="h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={healthPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={72}
                          paddingAngle={3}
                        >
                          {healthPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend + summary */}
                  <div className="flex-1 space-y-3">
                    {healthPieData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                          <span className="text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-medium">{entry.value}</span>
                      </div>
                    ))}
                    {healthPieData.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No clients scored yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Client Health Detail Rows ────────────────────── */}
          {clientHealth.scored.length > 0 && (
            <>
              {/* Top At-Risk Clients */}
              {clientHealth.riskCount > 0 && (
                <Card className="border-red-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      At-Risk Clients
                    </CardTitle>
                    <CardDescription>These clients need attention — low health scores across revenue, engagement, or compliance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {clientHealth.scored.filter((c) => c.tier === "at-risk").map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors mb-1 last:mb-0">
                        <div className="w-9 h-9 rounded-full bg-red-500/10 text-red-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {c.score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{c.name}</span>
                            {c.company && <span className="text-xs text-muted-foreground truncate">· {c.company}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {Object.entries(c.scoreFactors).map(([key, val]) => (
                              <span key={key} className="text-[9px] text-muted-foreground">
                                {key.charAt(0).toUpperCase() + key.slice(1)}: <span className={val < 10 ? "text-red-400" : "text-foreground"}>{val}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="w-20">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-red-500" style={{ width: `${c.score}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* All Scored Clients (compact) */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <HeartHandshake className="h-4 w-4 text-primary" />
                      All Client Health Scores
                    </CardTitle>
                    <CardDescription>Scored on revenue, engagement, compliance, status, and tenure</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {clientHealth.scored.map((c) => {
                      const tierColor = c.tier === "healthy"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : c.tier === "medium"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-red-500/10 text-red-600 border-red-500/20"
                      const barColor = c.score >= 70 ? "bg-emerald-500" : c.score >= 45 ? "bg-amber-500" : "bg-red-500"

                      return (
                        <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/20 transition-colors">
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0", tierColor)}>
                            {c.score}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{c.name}</span>
                              {c.company && <span className="text-xs text-muted-foreground truncate">· {c.company}</span>}
                              {c.tier === "healthy" && <HeartHandshake className="h-3 w-3 text-emerald-500 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              <span>R: {c.scoreFactors.revenue}</span>
                              <span>E: {c.scoreFactors.engagement}</span>
                              <span>C: {c.scoreFactors.compliance}</span>
                              <span>S: {c.scoreFactors.status}</span>
                              <span>T: {c.scoreFactors.tenure}</span>
                              {c.retainerValue > 0 && <span>· {formatCurrency(c.retainerValue)}/mo</span>}
                            </div>
                          </div>
                          <div className="w-16 hidden sm:block">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${c.score}%` }} />
                            </div>
                          </div>
                          <Badge variant="outline" className={cn("text-[9px] capitalize shrink-0", tierColor)}>
                            {c.tier}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Revenue</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Engagement</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Compliance</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500" /> Status</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-500" /> Tenure</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Quick Actions + Activity ───────────────────── */}

          {/* ── Live Central Brain Event Feed ───────────────── */}
          <Card className={cn(
            "transition-all duration-300",
            latestBrainEvent?.type === "error" && "border-red-500/30",
            latestBrainEvent?.type === "action_executing" && "border-purple-500/20",
          )}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Radio className={cn(
                    "h-4 w-4",
                    sseStatus === "connected" ? "text-emerald-500" : "text-muted-foreground"
                  )} />
                  Central Brain Live Feed
                </CardTitle>
                <CardDescription>Real-time agent events from the HermesCentralBrain</CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
                <Button variant="ghost" size="sm" onClick={() => setShowLiveFeed(!showLiveFeed)} className="h-7 px-2 text-xs">
                  {showLiveFeed ? "Hide" : "Show"}
                </Button>
                <Button variant="ghost" size="sm" onClick={clearBrainEvents} className="h-7 px-2 text-muted-foreground hover:text-foreground">
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
                      {sseStatus === "connecting" ? "Connecting to Central Brain SSE stream"
                        : sseStatus === "error" ? "Connection lost — reconnecting..."
                        : "Run a Hermes sweep or God Mode operation to see live events"}
                    </p>
                  </div>
                ) : (
                  <>
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

                    <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                      {brainEvents.slice(0, 50).map((evt, i) => (
                        <div
                          key={`${evt.timestamp}-${i}`}
                          className={cn(
                            "flex items-start gap-3 p-2 rounded-lg text-xs transition-all",
                            evt.type === "error" && "bg-red-500/5 border border-red-500/10",
                            evt.type === "action_executing" && "bg-purple-500/5",
                            evt.type === "action_completed" && evt.details?.success === false && "bg-amber-500/5",
                            evt.type === "action_completed" && evt.details?.success === true && "bg-emerald-500/5",
                            evt.type === "orchestration_started" && "bg-blue-500/5",
                            evt.type === "insight_discovered" && "bg-cyan-500/5",
                            evt.type === "orchestration_completed" && "bg-green-500/5",
                          )}
                        >
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
                            {evt.type === "error" && <XCircle className="h-3 w-3" />}
                            {evt.type === "action_executing" && <Loader2 className="h-3 w-3 animate-spin" />}
                            {evt.type === "action_completed" && <CheckCircle2 className="h-3 w-3" />}
                            {evt.type === "orchestration_started" && <ListRestart className="h-3 w-3" />}
                            {evt.type === "orchestration_completed" && <CheckCircle2 className="h-3 w-3" />}
                            {evt.type === "insight_discovered" && <Lightbulb className="h-3 w-3" />}
                            {evt.type === "agent_status_changed" && <Activity className="h-3 w-3" />}
                            {!["error", "action_executing", "action_completed", "orchestration_started", "orchestration_completed", "insight_discovered", "agent_status_changed"].includes(evt.type) && <Radio className="h-3 w-3" />}
                          </div>
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
                              {evt.details?.agentType && (
                                <span className="text-[10px] font-medium text-foreground/70">{String(evt.details.agentType)}</span>
                              )}
                            </div>
                            {evt.details?.action && (
                              <p className="text-xs text-foreground/80 mt-0.5 truncate">{String(evt.details.action)}</p>
                            )}
                            {evt.type === "error" && evt.details?.error && (
                              <p className="text-xs text-red-500 mt-0.5 truncate">{String(evt.details.error)}</p>
                            )}
                            {evt.details?.durationMs && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {Number(evt.details.durationMs) >= 1000
                                  ? `${(Number(evt.details.durationMs) / 1000).toFixed(1)}s`
                                  : `${evt.details.durationMs}ms`}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(evt.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {brainEvents.length > 50 && (
                      <p className="text-[10px] text-muted-foreground text-center mt-2">Showing 50 of {brainEvents.length} events</p>
                    )}
                  </>
                )}
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
