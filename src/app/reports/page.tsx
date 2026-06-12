"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, formatCurrency, formatDate, formatPercent } from "@/lib/utils"
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  MessageSquare,
  Activity,
  Clock,
  Loader2,
  RefreshCw,
  Mail,
  CalendarDays,
  ChevronRight,
  AlertTriangle,
  PieChart,
  LineChart,
  FileText,
  Send,
  CheckCircle2,
  Sparkles,
  Crown,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LineChart as RechartsLineChart,
  Line,
} from "recharts"
import Link from "next/link"

// ── Types ───────────────────────────────────────────────────────────────────

interface ReportData {
  period: {
    start: string
    end: string
    label: string
  }
  leads: {
    total: number
    byStatus: Record<string, number>
    byDay: Array<{ date: string; count: number }>
    averageScore: number
    qualifiedCount: number
    conversionRate: number
  }
  conversions: {
    totalLeads: number
    totalClients: number
    overallRate: number
    leadsToQualified: number
    qualifiedToClient: number
    averageDaysToConvert: number | null
    byStatus: Record<string, number>
  }
  pipeline: {
    averageDaysToConvert: number | null
    totalOutreachSent: number
    totalFollowups: number
    responseRate: number | null
  }
  revenue: {
    totalMonthlyRecurring: number
    totalInvoiced: number
    totalCollected: number
    outstanding: number
    byClient: Array<{ clientName: string; monthlyRetainer: number; totalInvoiced: number }>
    byTier: Record<string, { count: number; revenue: number }>
    revenueByMonth: Array<{ month: string; revenue: number; collected: number }>
  }
  summary: string
  generatedAt: string
}

interface ReportHistoryItem {
  id: string
  title: string
  summary: string
  metrics: Record<string, any>
  periodStart: string
  periodEnd: string
  createdAt: string
}

// ── Chart Colors ────────────────────────────────────────────────────────────

const STATUS_COLORS_MAP: Record<string, string> = {
  new: "#3b82f6",
  qualified: "#10b981",
  disqualified: "#ef4444",
  converted: "#8b5cf6",
}

const TIER_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
const MONTH_COLORS = ["#059669", "#34d399"]

// ── Custom Tooltip ──────────────────────────────────────────────────────────

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
            {typeof entry.value === "number" && entry.name?.toLowerCase().includes("revenue")
              ? formatCurrency(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<"weekly" | "monthly" | "quarterly">("weekly")
  const [report, setReport] = useState<ReportData | null>(null)
  const [history, setHistory] = useState<ReportHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("current")
  const [emailRecipient, setEmailRecipient] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  const loadReport = useCallback(async (p: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: p }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.report) {
        setReport(json.report)
      } else {
        setReport(null)
        setError("No report data returned")
      }
    } catch (e) {
      setError("Failed to load report")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/reports?limit=20")
      if (!res.ok) return
      const json = await res.json()
      setHistory(json.reports || [])
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => {
    loadReport(period)
    loadHistory()
  }, [period, loadReport, loadHistory])

  const handleGenerate = async () => {
    setGenerating(true)
    setEmailSent(false)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setReport(json.report)
      await loadHistory()
    } catch (e) {
      setError("Failed to generate report")
    } finally {
      setGenerating(false)
    }
  }

  const handleEmailReport = async () => {
    if (!emailRecipient) return
    setEmailSent(false)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          emailTo: [emailRecipient],
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setEmailSent(true)
    } catch {
      setError("Failed to send email")
    }
  }

  // ── Loading State ──────────────────────────────────────────
  if (loading && !report) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="shimmer h-4 w-24 rounded mb-3" /><div className="shimmer h-8 w-32 rounded" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6"><div className="shimmer h-72 w-full rounded" /></CardContent></Card>
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-16 w-16 text-amber-500/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Reports</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => loadReport(period)}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="h-16 w-16 text-primary/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Report Data</h2>
        <p className="text-muted-foreground mb-6">Generate your first report to see data</p>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate Report
        </Button>
      </div>
    )
  }

  const { leads, conversions, pipeline, revenue } = report

  // Prepare chart data
  const leadStatusData = Object.entries(leads.byStatus).map(([name, value]) => ({ name, value }))
  const revenueByClientData = revenue.byClient.map((c) => ({ name: c.clientName, revenue: c.monthlyRetainer }))
  const revenueByMonthData = revenue.revenueByMonth.map((m) => ({
    month: m.month,
    Invoiced: m.revenue,
    Collected: m.collected,
  }))
  const tierData = Object.entries(revenue.byTier).map(([tier, data]) => ({ name: tier, value: data.revenue }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Automated client performance reports with data-driven insights
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant={period === "weekly" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("weekly")}
          >
            Weekly
          </Button>
          <Button
            variant={period === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </Button>
          <Button
            variant={period === "quarterly" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("quarterly")}
          >
            Quarterly
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Period Banner ────────────────────────────────────── */}
      <Card className="border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {report.period.label} Report
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(report.period.start)} – {formatDate(report.period.end)}
                · Generated {formatDate(report.generatedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                placeholder="Email report to..."
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                className="h-8 text-xs w-48"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEmailReport}
              disabled={!emailRecipient}
            >
              <Mail className="h-4 w-4 mr-1" />
              Send
            </Button>
            {emailSent && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-0.5" /> Sent
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Cards ────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Lead Volume</span>
              <Target className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-500">{leads.total}</div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{leads.qualifiedCount} qualified</span>
              <span className="text-muted-foreground/50">·</span>
              <span>Avg {leads.averageScore} score</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Conversion Rate</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-500">
              {formatPercent(conversions.overallRate)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{conversions.totalClients} clients</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{conversions.leadsToQualified} qualified</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Pipeline Velocity</span>
              <Activity className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-500">
              {pipeline.averageDaysToConvert !== null
                ? `${pipeline.averageDaysToConvert}d`
                : "—"}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{pipeline.totalOutreachSent} messages</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{pipeline.totalFollowups} follow-ups</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Monthly Revenue</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-500">
              {formatCurrency(revenue.totalMonthlyRecurring)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{formatCurrency(revenue.totalCollected)} collected</span>
              {revenue.outstanding > 0 && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-red-500">{formatCurrency(revenue.outstanding)} outstanding</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Grid ──────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead Volume Bar Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              Lead Volume
            </CardTitle>
            <CardDescription>Daily lead volume over the period</CardDescription>
          </CardHeader>
          <CardContent>
            {leads.byDay.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leads in this period</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leads.byDay} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => v.slice(5)}
                      stroke="hsl(var(--muted-foreground))"
                      opacity={0.6}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      opacity={0.6}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Leads"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Status Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PieChart className="h-4 w-4 text-primary" />
              Lead Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of lead statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {leadStatusData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No lead data</p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={leadStatusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {leadStatusData.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={STATUS_COLORS_MAP[entry.name] || TIER_COLORS[i % TIER_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {leadStatusData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: STATUS_COLORS_MAP[entry.name] || TIER_COLORS[i % TIER_COLORS.length] }}
                        />
                        <span className="capitalize text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Month */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <LineChart className="h-4 w-4 text-primary" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Invoiced vs collected revenue by month</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueByMonthData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No revenue data in this period</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueByMonthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      opacity={0.6}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `$${v}`}
                      stroke="hsl(var(--muted-foreground))"
                      opacity={0.6}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="Invoiced"
                      stroke="#6366f1"
                      fill="url(#invoicedGrad)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="Collected"
                      stroke="#10b981"
                      fill="url(#collectedGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Tier — Pie Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PieChart className="h-4 w-4 text-primary" />
              Revenue by Tier
            </CardTitle>
            <CardDescription>MRR distribution across client tiers</CardDescription>
          </CardHeader>
          <CardContent>
            {tierData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tier data available</p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={tierData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {tierData.map((_, i) => (
                          <Cell key={i} fill={TIER_COLORS[i % TIER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {tierData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: TIER_COLORS[i % TIER_COLORS.length] }}
                        />
                        <span className="capitalize text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Pipeline & Revenue Detail ──────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" />
              Pipeline Activity
            </CardTitle>
            <CardDescription>Outreach and follow-up metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Messages Sent</span>
                </div>
                <span className="text-lg font-semibold">{pipeline.totalOutreachSent}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Follow-ups Scheduled</span>
                </div>
                <span className="text-lg font-semibold">{pipeline.totalFollowups}</span>
              </div>
              {pipeline.responseRate !== null && (
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm">Response Rate</span>
                  </div>
                  <span className="text-lg font-semibold text-emerald-500">
                    {formatPercent(pipeline.responseRate)}
                  </span>
                </div>
              )}
              {pipeline.averageDaysToConvert !== null && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Avg Days to Convert</span>
                  </div>
                  <span className="text-lg font-semibold">{pipeline.averageDaysToConvert} days</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-primary" />
              Revenue Summary
            </CardTitle>
            <CardDescription>Revenue metrics for this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm">Monthly Recurring Revenue</span>
                </div>
                <span className="text-lg font-semibold text-emerald-500">
                  {formatCurrency(revenue.totalMonthlyRecurring)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Total Invoiced</span>
                </div>
                <span className="text-lg font-semibold">{formatCurrency(revenue.totalInvoiced)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm">Collected</span>
                </div>
                <span className="text-lg font-semibold text-emerald-500">
                  {formatCurrency(revenue.totalCollected)}
                </span>
              </div>
              {revenue.outstanding > 0 && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Outstanding</span>
                  </div>
                  <span className="text-lg font-semibold text-red-500">
                    {formatCurrency(revenue.outstanding)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Top Clients by Revenue ──────────────────────────── */}
      {revenue.byClient.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4 text-amber-500" />
              Top Clients by Revenue
            </CardTitle>
            <CardDescription>Clients with the highest monthly retainers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {revenue.byClient.slice(0, 8).map((client, i) => (
                <div
                  key={client.clientName}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    i === 0 ? "bg-amber-500/10 text-amber-600" :
                    i === 1 ? "bg-slate-400/10 text-slate-500" :
                    i === 2 ? "bg-amber-700/10 text-amber-800" :
                    "bg-muted text-muted-foreground"
                  )}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(client.totalInvoiced)} invoiced total
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-emerald-500">
                      {formatCurrency(client.monthlyRetainer)}<span className="text-xs text-muted-foreground font-normal">/mo</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Summary Card ────────────────────────────────────── */}
      <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            Report Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-muted-foreground">
            {report.summary}
          </pre>
        </CardContent>
      </Card>

      {/* ── Report History ──────────────────────────────────── */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                Report History
              </CardTitle>
              <CardDescription>Previously generated reports</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors border border-border/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.periodStart)} – {formatDate(item.periodEnd)}
                        <span className="mx-1">·</span>
                        {item.metrics?.totalLeads !== undefined && `${item.metrics.totalLeads} leads`}
                        {item.metrics?.mrr !== undefined && `· ${formatCurrency(item.metrics.mrr)} MRR`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {formatDate(item.createdAt)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
