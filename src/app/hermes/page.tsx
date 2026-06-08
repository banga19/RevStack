"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/components/notification-provider"
import {
  Brain,
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  BarChart3,
  Activity,
  TrendingUp,
  Users,
  Target,
  Timer,
  ListTodo,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Send,
  UserCheck,
  FileText,
  Download,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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

// ── Types ──────────────────────────────────────────────────────────────────

interface DailyPoint {
  date: string
  runs: number
  completed: number
  failed: number
  leads: number
}

interface TypeBreakdown {
  taskType: string
  count: number
  lastRun: string | null
  percentage: number
}

interface StatusDist {
  status: string
  count: number
}

interface InsightEntry {
  agentType: string
  title: string
  description: string
  timestamp: number
}

interface RunRecord {
  id: string
  taskType: string
  status: string
  leadsProcessed: number | null
  messagesQueued: number | null
  errorMessage: string | null
  userId: string | null
  createdAt: string
  completedAt: string | null
  input: string | null
  output: string | null
}

interface WeekPoint {
  label: string
  completed: number
  failed: number
  total: number
  successRate: number
}

interface MonthPoint {
  label: string
  completed: number
  failed: number
  total: number
  successRate: number
}

interface DurationPoint {
  label: string
  avgDurationMs: number
  avgDurationSeconds: number
  total: number
}

interface DurationComparison {
  current: { label: string; avgDurationSeconds: number; total: number } | null
  previous: { label: string; avgDurationSeconds: number; total: number } | null
  change: number
  trend: "faster" | "slower" | "stable"
}

interface DurationTrends {
  weeks: DurationPoint[]
  weekComparison: DurationComparison
  months: DurationPoint[]
  monthComparison: DurationComparison
}

interface TaskTypeTrendEntry {
  taskType: string
  current: { label: string; successRate: number; total: number }
  previous: { label: string; successRate: number; total: number }
  change: number
  trend: "up" | "down" | "flat"
}

interface ComparisonData {
  weeks: WeekPoint[]
  current: { label: string; successRate: number; total: number } | null
  previous: { label: string; successRate: number; total: number } | null
  change: number
  trend: "up" | "down" | "flat"
}

interface AnalyticsData {
  summary: {
    totalRuns: number
    completedCount: number
    failedCount: number
    successRate: number
    totalLeadsProcessed: number
    avgDurationMs: number
    avgDurationSeconds: number
    runsInPeriod: number
    completedInPeriod: number
  }
  dailyTrend: DailyPoint[]
  typeBreakdown: TypeBreakdown[]
  statusDistribution: StatusDist[]
  insights: InsightEntry[]
  recentRuns: RunRecord[]
  weekOverWeek: ComparisonData
  monthOverMonth: ComparisonData
  taskTypeTrends: TaskTypeTrendEntry[]
  durationTrends: DurationTrends
}

// ── Helpers ────────────────────────────────────────────────────────────────

const TASK_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  qualify_leads: {
    label: "Qualify Leads",
    icon: <Users className="h-4 w-4" />,
    color: "text-blue-500 bg-blue-500/10",
  },
  send_followups: {
    label: "Send Follow-ups",
    icon: <Send className="h-4 w-4" />,
    color: "text-amber-500 bg-amber-500/10",
  },
  onboard_clients: {
    label: "Onboard Clients",
    icon: <UserCheck className="h-4 w-4" />,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  generate_report: {
    label: "Generate Report",
    icon: <FileText className="h-4 w-4" />,
    color: "text-purple-500 bg-purple-500/10",
  },
  custom: {
    label: "Custom",
    icon: <Sparkles className="h-4 w-4" />,
    color: "text-primary bg-primary/10",
  },
}

function getTaskTypeConfig(taskType: string) {
  return TASK_TYPE_CONFIG[taskType] || {
    label: taskType,
    icon: <Brain className="h-4 w-4" />,
    color: "text-muted-foreground bg-muted",
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  running: { label: "Running", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  pending: { label: "Pending", color: "text-muted-foreground border-border" },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-600 border-red-500/30" },
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}

// ── CSV Export ─────────────────────────────────────────────────────────────

function escapeCsv(val: unknown): string {
  const str = val == null ? "" : String(val)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function generateAnalyticsCsv(data: AnalyticsData): string {
  const rows: string[] = []

  // Helper: add a section header
  function section(title: string) {
    rows.push(`\n${title}`)
  }

  // Helper: add a CSV row
  function row(...vals: unknown[]) {
    rows.push(vals.map(escapeCsv).join(","))
  }

  // ── Summary ────────────────────────────────────────────────
  section("Summary")
  row("Metric", "Value")
  row("Total Runs", data.summary.totalRuns)
  row("Completed", data.summary.completedCount)
  row("Failed", data.summary.failedCount)
  row("Success Rate (%)", data.summary.successRate)
  row("Total Leads Processed", data.summary.totalLeadsProcessed)
  row("Avg Duration (seconds)", data.summary.avgDurationSeconds)
  row("Avg Duration (formatted)", formatDuration(data.summary.avgDurationSeconds))
  row("Runs in Period", data.summary.runsInPeriod)
  row("Completed in Period", data.summary.completedInPeriod)

  // ── Daily Trend ────────────────────────────────────────────
  section("Daily Trend")
  row("Date", "Runs", "Completed", "Failed", "Leads Processed")
  for (const d of data.dailyTrend) {
    row(d.date, d.runs, d.completed, d.failed, d.leads)
  }

  // ── Status Distribution ────────────────────────────────────
  section("Status Distribution")
  row("Status", "Count")
  for (const s of data.statusDistribution) {
    row(s.status, s.count)
  }

  // ── Task Type Breakdown ────────────────────────────────────
  section("Task Type Breakdown")
  row("Task Type", "Count", "Percentage", "Last Run")
  for (const t of data.typeBreakdown) {
    row(t.taskType, t.count, `${t.percentage}%`, t.lastRun || "")
  }

  // ── Success Rate Trends (Weekly) ───────────────────────────
  section("Success Rate Trends (Weekly)")
  row("Week", "Completed", "Failed", "Total", "Success Rate (%)")
  for (const w of data.weekOverWeek.weeks) {
    row(w.label, w.completed, w.failed, w.total, w.successRate)
  }
  if (data.weekOverWeek.current && data.weekOverWeek.previous) {
    row("", "")
    row("Comparison", "Current", "Previous", "Change (pp)", "Trend")
    row(
      data.weekOverWeek.current.label,
      `${data.weekOverWeek.current.successRate}%`,
      `${data.weekOverWeek.previous.successRate}%`,
      data.weekOverWeek.change > 0 ? `+${data.weekOverWeek.change}` : data.weekOverWeek.change,
      data.weekOverWeek.trend
    )
  }

  // ── Success Rate Trends (Monthly) ──────────────────────────
  section("Success Rate Trends (Monthly)")
  row("Month", "Completed", "Failed", "Total", "Success Rate (%)")
  for (const m of data.monthOverMonth.weeks) {
    row(m.label, m.completed, m.failed, m.total, m.successRate)
  }
  if (data.monthOverMonth.current && data.monthOverMonth.previous) {
    row("", "")
    row("Comparison", "Current", "Previous", "Change (pp)", "Trend")
    row(
      data.monthOverMonth.current.label,
      `${data.monthOverMonth.current.successRate}%`,
      `${data.monthOverMonth.previous.successRate}%`,
      data.monthOverMonth.change > 0 ? `+${data.monthOverMonth.change}` : data.monthOverMonth.change,
      data.monthOverMonth.trend
    )
  }

  // ── Task Type WoW Trends ───────────────────────────────────
  section("Task Type Trends (Week-over-Week)")
  row("Task Type", "Current Week", "Current Rate (%)", "Current Runs", "Previous Week", "Previous Rate (%)", "Previous Runs", "Change (pp)", "Trend")
  for (const t of data.taskTypeTrends) {
    row(
      t.taskType,
      t.current.label,
      t.current.successRate,
      t.current.total,
      t.previous.label,
      t.previous.successRate,
      t.previous.total,
      t.change > 0 ? `+${t.change}` : t.change,
      t.trend
    )
  }

  // ── Duration Trends (Weekly) ───────────────────────────────
  section("Duration Trends (Weekly)")
  row("Week", "Avg Duration (s)", "Avg Duration (ms)", "Completed Runs")
  for (const w of data.durationTrends.weeks) {
    row(w.label, w.avgDurationSeconds, w.avgDurationMs, w.total)
  }
  if (data.durationTrends.weekComparison.current && data.durationTrends.weekComparison.previous) {
    const cmp = data.durationTrends.weekComparison
    row("", "")
    row("Comparison", "Current (s)", "Previous (s)", "Change (s)", "Trend")
    row(cmp.current!.label, cmp.current!.avgDurationSeconds, cmp.previous!.avgDurationSeconds, cmp.change, cmp.trend)
  }

  // ── Duration Trends (Monthly) ──────────────────────────────
  section("Duration Trends (Monthly)")
  row("Month", "Avg Duration (s)", "Avg Duration (ms)", "Completed Runs")
  for (const m of data.durationTrends.months) {
    row(m.label, m.avgDurationSeconds, m.avgDurationMs, m.total)
  }
  if (data.durationTrends.monthComparison.current && data.durationTrends.monthComparison.previous) {
    const cmp = data.durationTrends.monthComparison
    row("", "")
    row("Comparison", "Current (s)", "Previous (s)", "Change (s)", "Trend")
    row(cmp.current!.label, cmp.current!.avgDurationSeconds, cmp.previous!.avgDurationSeconds, cmp.change, cmp.trend)
  }

  return rows.join("\n")
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function HermesAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningAction, setRunningAction] = useState<string | null>(null)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [days, setDays] = useState(14)
  const [comparisonView, setComparisonView] = useState<"weekly" | "monthly">("weekly")
  const [durationView, setDurationView] = useState<"weekly" | "monthly">("weekly")
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // ── SSE real-time notifications ─────────────────────────
  const { latest: latestNotification, status: sseStatus } = useNotifications()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/hermes/analytics?days=${days}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError("Failed to load Hermes analytics")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh data when a new Hermes notification arrives
  // Debounced: rapid successive notifications only trigger one refresh
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (latestNotification?.type === "hermes") {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = setTimeout(() => {
        // Silently refresh data without showing loading shimmer
        fetch(`/api/hermes/analytics?days=${days}`)
          .then((res) => res.ok ? res.json() : null)
          .then((json) => {
            if (json) setData(json)
          })
          .catch(() => {
            // Silent — don't disrupt the user on background refresh failure
          })
      }, 300)
    }
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    }
  }, [latestNotification, days])

  // ── Trigger agent sweep ──────────────────────────────────
  const triggerSweep = async () => {
    setRunningAction("sweep")
    setActionFeedback(null)
    try {
      const res = await fetch("/api/hermes/run?sweep=true", { method: "POST" })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Sweep failed")
      setActionFeedback({ type: "success", message: result.message || "Agent sweep triggered!" })
      setTimeout(() => loadData(), 1500)
    } catch (e: any) {
      setActionFeedback({ type: "error", message: e.message || "Failed to trigger sweep" })
    } finally {
      setRunningAction(null)
    }
  }

  // ── Loading State ────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="shimmer h-8 w-72 rounded mb-2" />
        <div className="shimmer h-4 w-96 rounded mb-8" />
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => <div key={i} className="shimmer h-24 rounded" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => <div key={i} className="shimmer h-80 rounded" />)}
        </div>
      </div>
    )
  }

  // ── Empty State ──────────────────────────────────────────
  if (data && data.summary.totalRuns === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Brain className="h-7 w-7 text-primary" />
              AI Agent Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Track Hermes agent runs, success rates, and insights
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Brain className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Agent Runs Yet</h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Hermes hasn&apos;t processed any leads yet. Trigger a sweep to start qualifying leads,
              sending follow-ups, and generating insights.
            </p>
            <Button size="lg" onClick={triggerSweep} disabled={runningAction === "sweep"}>
              {runningAction === "sweep" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" /> Trigger First Agent Sweep</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-16 w-16 text-amber-500/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Analytics</h2>
        <p className="text-muted-foreground mb-6">{error || "Something went wrong"}</p>
        <Button onClick={() => loadData()}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
      </div>
    )
  }

  const { summary, dailyTrend, typeBreakdown, statusDistribution, insights, recentRuns } = data

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-7 w-7 text-primary" />
            AI Agent Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Hermes autonomous agent — {summary.totalRuns} total runs, {summary.successRate}% success rate
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* SSE connection indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] text-muted-foreground bg-muted/30">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                sseStatus === "connected" ? "bg-emerald-500" :
                sseStatus === "connecting" ? "bg-amber-500 animate-pulse" :
                "bg-red-500"
              )}
            />
            {sseStatus === "connected" ? "Live" : sseStatus === "connecting" ? "Connecting..." : "Offline"}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDays(days === 7 ? 14 : days === 14 ? 30 : days === 30 ? 90 : 7)}
          >
            <Clock className="h-4 w-4 mr-2" />
            {days === 7 ? "7d" : days === 14 ? "14d" : days === 30 ? "30d" : "90d"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const csv = generateAnalyticsCsv(data!)
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `hermes-analytics-${new Date().toISOString().slice(0, 10)}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={triggerSweep} disabled={runningAction === "sweep"}>
            {runningAction === "sweep" ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sweeping...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" /> Trigger Sweep</>
            )}
          </Button>
        </div>
      </div>

      {/* Action feedback */}
      {actionFeedback && (
        <div
          className={cn(
            "rounded-lg border p-3 text-sm flex items-center gap-3",
            actionFeedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
              : "bg-red-500/10 border-red-500/30 text-red-700"
          )}
        >
          {actionFeedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="flex-1">{actionFeedback.message}</span>
          <button onClick={() => setActionFeedback(null)} className="text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Total Runs</span>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatNumber(summary.totalRuns)}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Success Rate</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-500">{summary.successRate}%</div>
            <Progress value={summary.successRate} className="h-1 mt-2" />
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Leads Processed</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-500">{formatNumber(summary.totalLeadsProcessed)}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Avg Duration</span>
              <Timer className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-500">{formatDuration(summary.avgDurationSeconds)}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Completed ({days}d)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">{summary.completedInPeriod}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row ────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" />
              Daily Run Activity
            </CardTitle>
            <CardDescription>Runs completed per day over the last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(v) => v.slice(5)} // Show MM-DD
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [
                      value,
                      name === "completed" ? "Completed" : name === "failed" ? "Failed" : name,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="completed"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2) / 0.15)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    name="failed"
                    stroke="hsl(var(--chart-5))"
                    fill="hsl(var(--chart-5) / 0.1)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Task Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              Task Type Breakdown
            </CardTitle>
            <CardDescription>Runs grouped by task type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="taskType"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(v) => TASK_TYPE_CONFIG[v]?.label || v}
                    width={100}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [value, "Runs"]}
                  />
                  <Bar dataKey="count" name="Runs" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Mini key below chart */}
            <div className="flex flex-wrap gap-2 mt-3">
              {typeBreakdown.map((t) => {
                const cfg = getTaskTypeConfig(t.taskType)
                return (
                  <div key={t.taskType} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className={cn("w-2 h-2 rounded-full", cfg.color.split(" ")[1])} />
                    <span>{cfg.label}</span>
                    <span className="font-medium">{t.count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── WoW / MoM Comparison Chart ───────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              Success Rate Trends
            </CardTitle>
            <CardDescription>Week-over-week and month-over-month comparison</CardDescription>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/50">
            <button
              onClick={() => setComparisonView("weekly")}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                comparisonView === "weekly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Weekly
            </button>
            <button
              onClick={() => setComparisonView("monthly")}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                comparisonView === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const cmp = comparisonView === "weekly" ? weekOverWeek : monthOverMonth
            const points = comparisonView === "weekly" ? weekOverWeek.weeks : monthOverMonth.weeks
            const current = cmp.current
            const previous = cmp.previous

            if (points.length < 2 || !current || !previous) {
              return (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">Not enough data for {comparisonView} comparison</p>
                  <p className="text-xs mt-1">Need at least 2 {comparisonView === "weekly" ? "weeks" : "months"} of data</p>
                </div>
              )
            }

            return (
              <>
                {/* Summary comparison cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Current period */}
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {current.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">· {current.total} runs</span>
                    </div>
                    <div className="text-2xl font-bold">{current.successRate}%</div>
                    <Progress value={current.successRate} className="h-1 mt-1.5" />
                  </div>

                  {/* Previous period with change */}
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {previous.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">· {previous.total} runs</span>
                    </div>
                    <div className="text-2xl font-bold text-muted-foreground">{previous.successRate}%</div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-xs font-medium",
                          cmp.trend === "up" && "text-emerald-500",
                          cmp.trend === "down" && "text-red-500",
                          cmp.trend === "flat" && "text-muted-foreground"
                        )}
                      >
                        {cmp.trend === "up" && <ArrowUpRight className="h-3 w-3" />}
                        {cmp.trend === "down" && <ArrowDownRight className="h-3 w-3" />}
                        {cmp.trend === "flat" && <Minus className="h-3 w-3" />}
                        {cmp.change > 0 ? "+" : ""}{cmp.change}pp
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {cmp.trend === "up" ? "improved" : cmp.trend === "down" ? "declined" : "stable"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={points}
                      margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickFormatter={(v: string) => {
                          // Shorten: "2026-W22" → "W22", "Jun 2026" → "Jun"
                          if (v.includes("-W")) return v.split("-W")[1] ? `W${v.split("-W")[1]}` : v
                          if (v.includes(" ")) return v.split(" ")[0]
                          return v
                        }}
                        interval={0}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        domain={[0, 100]}
                        tickFormatter={(v: number) => `${v}%`}
                        width={35}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--popover-foreground))",
                          fontSize: "12px",
                        }}
                        formatter={(_value: number, _name: string, props: any) => {
                          const d = props.payload
                          return [`${d.successRate}% (${d.completed}/${d.total})`, "Success Rate"]
                        }}
                      />
                      <Bar
                        dataKey="successRate"
                        name="Success Rate"
                        radius={[3, 3, 0, 0]}
                        fill="hsl(var(--chart-2))"
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )
          })()}
        </CardContent>
      </Card>

      {/* ── Success Rate by Task Type ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-primary" />
            Success Rate by Task Type
          </CardTitle>
          <CardDescription>
            Current vs previous week — {data.taskTypeTrends.length} task type{data.taskTypeTrends.length !== 1 ? "s" : ""} with WoW trend
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.taskTypeTrends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <BarChart3 className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Not enough data for task type trends</p>
              <p className="text-xs mt-1">Need at least 2 weeks of data per task type</p>
            </div>
          ) : (
            <>
              {/* Chart — flatten nested API data into chart-safe fields */}
              {(() => {
                const chartData = data.taskTypeTrends.map((t) => ({
                  taskType: t.taskType,
                  currentRate: t.current.successRate,
                  previousRate: t.previous.successRate,
                  currentTotal: t.current.total,
                  previousTotal: t.previous.total,
                  currentLabel: t.current.label,
                  previousLabel: t.previous.label,
                  change: t.change,
                  trend: t.trend,
                }))

                return (
                  <div className="h-64 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 60, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickFormatter={(v: number) => `${v}%`}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={10}
                        />
                        <YAxis
                          type="category"
                          dataKey="taskType"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickFormatter={(v: string) => TASK_TYPE_CONFIG[v]?.label || v}
                          width={110}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            color: "hsl(var(--popover-foreground))",
                            fontSize: "12px",
                          }}
                          formatter={(value: number, name: string, props: any) => {
                            const d = props.payload
                            if (name === "currentRate") return [`${value}% (${d.currentTotal} runs)`, "This Week"]
                            return [`${value}% (${d.previousTotal} runs)`, "Last Week"]
                          }}
                          labelFormatter={(label: string) => TASK_TYPE_CONFIG[label]?.label || label}
                        />
                        <Bar
                          dataKey="previousRate"
                          name="previousRate"
                          fill="hsl(var(--muted-foreground) / 0.25)"
                          radius={[0, 3, 3, 0]}
                          maxBarSize={16}
                        />
                        <Bar
                          dataKey="currentRate"
                          name="currentRate"
                          fill="hsl(var(--chart-2))"
                          radius={[0, 3, 3, 0]}
                          maxBarSize={16}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}

              {/* Trend per type */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {data.taskTypeTrends.slice(0, 6).map((entry) => {
                  const cfg = getTaskTypeConfig(entry.taskType)
                  return (
                    <div
                      key={entry.taskType}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border",
                        entry.trend === "up" && "border-emerald-500/20 bg-emerald-500/5",
                        entry.trend === "down" && "border-red-500/20 bg-red-500/5"
                      )}
                    >
                      <div className={cn("p-1 rounded-md", cfg.color)}>{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{cfg.label}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-mono">{entry.current.successRate}%</span>
                          <span className="text-muted-foreground/50">vs</span>
                          <span className="font-mono">{entry.previous.successRate}%</span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-0.5 text-[10px] font-medium",
                              entry.trend === "up" && "text-emerald-500",
                              entry.trend === "down" && "text-red-500"
                            )}
                          >
                            {entry.trend === "up" && <ArrowUpRight className="h-2.5 w-2.5" />}
                            {entry.trend === "down" && <ArrowDownRight className="h-2.5 w-2.5" />}
                            {entry.trend === "flat" && <Minus className="h-2.5 w-2.5" />}
                            {entry.change > 0 ? "+" : ""}{entry.change}pp
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Duration Trends ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4 text-primary" />
              Average Duration Trends
            </CardTitle>
            <CardDescription>WoW and MoM comparison of average processing time per run</CardDescription>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/50">
            <button
              onClick={() => setDurationView("weekly")}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                durationView === "weekly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Weekly
            </button>
            <button
              onClick={() => setDurationView("monthly")}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                durationView === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const dt = data.durationTrends
            const isWeekly = durationView === "weekly"
            const points = isWeekly ? dt.weeks : dt.months
            const cmp = isWeekly ? dt.weekComparison : dt.monthComparison
            const current = cmp.current
            const previous = cmp.previous

            if (points.length < 2 || !current || !previous) {
              return (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Timer className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">Not enough data for duration {durationView} comparison</p>
                  <p className="text-xs mt-1">Need at least 2 {durationView === "weekly" ? "weeks" : "months"} of completed run data</p>
                </div>
              )
            }

            return (
              <>
                {/* Summary comparison cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {current.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">· {current.total} runs</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {formatDuration(current.avgDurationSeconds)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">average this period</div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {previous.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">· {previous.total} runs</span>
                    </div>
                    <div className="text-2xl font-bold text-muted-foreground">
                      {formatDuration(previous.avgDurationSeconds)}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-xs font-medium",
                          cmp.trend === "faster" && "text-emerald-500",
                          cmp.trend === "slower" && "text-red-500",
                          cmp.trend === "stable" && "text-muted-foreground"
                        )}
                      >
                        {cmp.trend === "faster" && <ArrowDownRight className="h-3 w-3" />}
                        {cmp.trend === "slower" && <ArrowUpRight className="h-3 w-3" />}
                        {cmp.trend === "stable" && <Minus className="h-3 w-3" />}
                        {formatDuration(Math.abs(cmp.change))}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {cmp.trend === "faster" ? "faster" : cmp.trend === "slower" ? "slower" : "stable"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={points}
                      margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickFormatter={(v: string) => {
                          if (v.includes("-W")) return v.split("-W")[1] ? `W${v.split("-W")[1]}` : v
                          if (v.includes(" ")) return v.split(" ")[0]
                          return v
                        }}
                        interval={0}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        tickFormatter={(v: number) => formatDuration(v)}
                        width={45}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--popover-foreground))",
                          fontSize: "12px",
                        }}
                        formatter={(_value: number, _name: string, props: any) => {
                          const d = props.payload
                          return [`${formatDuration(d.avgDurationSeconds)} (${d.total} runs)`, "Avg Duration"]
                        }}
                      />
                      <Bar
                        dataKey="avgDurationSeconds"
                        name="Avg Duration"
                        radius={[3, 3, 0, 0]}
                        fill="hsl(var(--chart-3))"
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )
          })()}
        </CardContent>
      </Card>

      {/* ── Status + Insights Row ──────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-primary" />
              Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["completed", "running", "pending", "failed"].map((status) => {
                const entry = statusDistribution.find((s) => s.status === status)
                const count = entry?.count || 0
                const percentage = summary.totalRuns > 0 ? (count / summary.totalRuns) * 100 : 0
                const cfg = STATUS_CONFIG[status]
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize">{cfg?.label || status}</span>
                      <span className="font-medium">{count} ({Math.round(percentage)}%)</span>
                    </div>
                    <Progress
                      value={percentage}
                      className={cn(
                        "h-2",
                        status === "completed" && "[&>div]:bg-emerald-500",
                        status === "running" && "[&>div]:bg-blue-500",
                        status === "failed" && "[&>div]:bg-red-500",
                        status === "pending" && "[&>div]:bg-muted-foreground"
                      )}
                    />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Agent Insights */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Agent Insights
            </CardTitle>
            <CardDescription>Key findings from Hermes agent runs</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No insights yet. Run agent sweeps to generate actionable insights.
              </p>
            ) : (
              <div className="space-y-1">
                {insights.slice(0, 8).map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className={cn(
                      "p-1.5 rounded-full shrink-0 mt-0.5",
                      insight.agentType === "lead" && "bg-blue-500/10",
                      insight.agentType === "compliance" && "bg-amber-500/10",
                      insight.agentType === "trade" && "bg-emerald-500/10",
                      insight.agentType === "onboarding" && "bg-purple-500/10",
                      insight.agentType === "revenue" && "bg-cyan-500/10",
                      insight.agentType === "orchestrator" && "bg-primary/10",
                    )}>
                      {insight.agentType === "lead" && <Users className="h-3.5 w-3.5 text-blue-500" />}
                      {insight.agentType === "compliance" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      {insight.agentType === "trade" && <Globe className="h-3.5 w-3.5 text-emerald-500" />}
                      {insight.agentType === "onboarding" && <UserCheck className="h-3.5 w-3.5 text-purple-500" />}
                      {insight.agentType === "revenue" && <BarChart3 className="h-3.5 w-3.5 text-cyan-500" />}
                      {(insight.agentType === "orchestrator" || !["lead", "compliance", "trade", "onboarding", "revenue"].includes(insight.agentType)) && (
                        <Brain className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo(new Date(insight.timestamp).toISOString())}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Run History ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              Recent Agent Runs
            </CardTitle>
            <CardDescription>
              Last {recentRuns.length} runs in the past {days} days
              {recentRuns.length < summary.runsInPeriod && ` · filtered to last 50`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No runs in this period</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Column headers */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-2">Type</div>
                <div className="col-span-1.5">Status</div>
                <div className="col-span-1.5">Leads</div>
                <div className="col-span-2">Started</div>
                <div className="col-span-2">Duration</div>
                <div className="col-span-3">Details</div>
              </div>

              {recentRuns.map((run) => {
                const cfg = getTaskTypeConfig(run.taskType)
                const statusCfg = STATUS_CONFIG[run.status] || { label: run.status, color: "" }
                const isExpanded = expandedRunId === run.id

                const duration = run.completedAt && run.createdAt
                  ? formatDuration(Math.round((new Date(run.completedAt).getTime() - new Date(run.createdAt).getTime()) / 1000))
                  : run.status === "running" ? "In progress..." : "—"

                return (
                  <div key={run.id}>
                    <button
                      onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                      className="w-full grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left items-center"
                    >
                      <div className="col-span-2 flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-md", cfg.color)}>{cfg.icon}</div>
                        <span className="text-sm">{cfg.label}</span>
                      </div>
                      <div className="col-span-1.5">
                        <Badge variant="outline" className={cn("text-[10px]", statusCfg.color)}>
                          {run.status === "running" && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />}
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <div className="col-span-1.5">
                        <span className="text-sm">{run.leadsProcessed ?? "—"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground">{timeAgo(run.createdAt)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground">{duration}</span>
                      </div>
                      <div className="col-span-3 flex items-center gap-1 min-w-0">
                        {run.status === "failed" && run.errorMessage ? (
                          <span className="text-[10px] text-red-500 truncate block" title={run.errorMessage}>
                            {run.errorMessage}
                          </span>
                        ) : run.input ? (
                          <span className="text-[10px] text-muted-foreground truncate block">{run.input}</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                        <ChevronRight className={cn(
                          "h-3 w-3 text-muted-foreground shrink-0 transition-transform",
                          isExpanded && "rotate-90"
                        )} />
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mx-4 mb-2 p-3 rounded-lg border bg-card/30 space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Run ID: </span>
                            <code className="text-[10px]">{run.id.slice(0, 12)}...</code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created: </span>
                            {new Date(run.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <Separator />
                        {run.input && (
                          <div>
                            <span className="text-muted-foreground">Input: </span>
                            <pre className="mt-1 p-2 rounded bg-muted/50 text-[10px] overflow-x-auto whitespace-pre-wrap">
                              {run.input}
                            </pre>
                          </div>
                        )}
                        {run.output && (
                          <div>
                            <span className="text-muted-foreground">Output: </span>
                            <pre className="mt-1 p-2 rounded bg-muted/50 text-[10px] overflow-x-auto whitespace-pre-wrap">
                              {run.output}
                            </pre>
                          </div>
                        )}
                        {run.errorMessage && (
                          <div>
                            <span className="text-red-500">Error: </span>
                            <pre className="mt-1 p-2 rounded bg-red-500/5 text-[10px] text-red-600 overflow-x-auto whitespace-pre-wrap">
                              {run.errorMessage}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Summary Row ────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/80" />
            <div>
              <div className="text-lg font-bold">{summary.completedCount}</div>
              <div className="text-[10px] text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500/80" />
            <div>
              <div className="text-lg font-bold">{summary.failedCount}</div>
              <div className="text-[10px] text-muted-foreground">Failed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500/80" />
            <div>
              <div className="text-lg font-bold">{formatNumber(summary.totalLeadsProcessed)}</div>
              <div className="text-[10px] text-muted-foreground">Total Leads</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Timer className="h-8 w-8 text-amber-500/80" />
            <div>
              <div className="text-lg font-bold">{formatDuration(summary.avgDurationSeconds)}</div>
              <div className="text-[10px] text-muted-foreground">Avg per run</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center">
        Data from the last {days} days · {summary.totalRuns} total runs · {summary.totalLeadsProcessed} leads processed
      </p>
    </div>
  )
}
