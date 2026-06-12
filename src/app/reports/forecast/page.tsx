"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, formatCurrency } from "@/lib/utils"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Brain,
  LineChart,
  Activity,
  Users,
  Sparkles,
  Info,
} from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from "recharts"

type ForecastMonth = {
  month: string
  label: string
  revenue?: number
  projected?: number
  scenarioLow?: number
  scenarioHigh?: number
  cumulative?: number
  pipelineContribution?: number
  churnDeduction?: number
  newClients?: number
  activeClients?: number
}

type ForecastSummary = {
  currentMrr: number
  predictedMrr12: number
  predictedArr: number
  totalForecastRevenue: number
  forecastMonths: number
  growthRate: number
  recentGrowthRate: number
  monthlyChurnRate: number
  volatility: number
  confidence: number
  breakoutMonth: number | null
  pipelineContributionMonthly: number
}

export default function ForecastPage() {
  const [summary, setSummary] = useState<ForecastSummary | null>(null)
  const [history, setHistory] = useState<ForecastMonth[]>([])
  const [forecast, setForecast] = useState<ForecastMonth[]>([])
  const [metadata, setMetadata] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState(12)
  const [activeTab, setActiveTab] = useState("overview")

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/revstack/analytics/predictive-forecast?months=${months}&includePipeline=true`)
      if (res.ok) {
        const d = await res.json()
        setSummary(d.summary)
        setHistory(d.history || [])
        setForecast(d.forecast || [])
        setMetadata(d.metadata)
      }
    } catch (e) {
      console.error("Failed to load forecast", e)
    } finally {
      setLoading(false)
    }
  }, [months])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-56 rounded mb-2" />
        <div className="shimmer h-4 w-72 rounded mb-8" />
        <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="shimmer h-24 rounded" />)}</div>
      </div>
    )
  }

  const combinedData = [
    ...(history || []).map((m) => ({ ...m, type: "actual" })),
    ...(forecast || []).map((m) => ({ ...m, type: "forecast" })),
  ]

  const confidenceColor = summary && summary.confidence >= 70 ? "text-emerald-500" : summary && summary.confidence >= 50 ? "text-amber-500" : "text-red-500"
  const growthDirection = summary && summary.recentGrowthRate > 0 ? "up" : "down"
  const growthColor = growthDirection === "up" ? "text-emerald-500" : "text-red-500"

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-primary" />
            Predictive Revenue Forecast
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-driven revenue projections with churn-adjusted scenarios and pipeline-derived growth modeling
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="12">12 months</SelectItem>
              <SelectItem value="24">24 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8" onClick={loadData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {summary && metadata && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Plan benchmarks</span>
          {Object.entries(metadata.planTargets || {}).map(([day, target]) => {
            const dayIndex = Number(day)
            const projectedAtMilestone = dayIndex === 365
              ? summary.predictedMrr12
              : forecast[Math.min(Math.max(dayIndex - 1, 0), forecast.length - 1)]?.projected
            const diff = projectedAtMilestone && projectedAtMilestone > 0 ? projectedAtMilestone - (target as number) : 0
            const isAhead = diff >= 0
            const chipClass = isAhead
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
              : "border-amber-500/30 bg-amber-500/5 text-amber-600"
            return (
              <div key={day} className="flex items-center gap-2 rounded-full border px-3 py-1">
                <span className="text-muted-foreground">Day {day}</span>
                <span className="font-mono">{formatCurrency(target as number)}</span>
                <span className="text-muted-foreground">vs</span>
                <span className="font-mono">{formatCurrency(projectedAtMilestone || 0)}</span>
                <Badge variant="outline" className={cn("border-none text-[10px] px-1 py-0", chipClass)}>
                  {isAhead ? `+${formatCurrency(diff)} ahead` : `${formatCurrency(Math.abs(diff))} short`}
                </Badge>
              </div>
            )
          })}
        </div>
      )}

      {summary && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <Card>
              <CardContent className="p-4">
                <div className="text-[10px] text-muted-foreground mb-1">Current MRR</div>
                <div className="text-xl font-bold">{formatCurrency(summary.currentMrr)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[10px] text-muted-foreground mb-1">Predicted MRR (12mo)</div>
                <div className={cn("text-xl font-bold", growthColor)}>{formatCurrency(summary.predictedMrr12)}</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20">
              <CardContent className="p-4">
                <div className="text-[10px] text-muted-foreground mb-1">Predicted ARR</div>
                <div className="text-xl font-bold text-emerald-500">{formatCurrency(summary.predictedArr)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[10px] text-muted-foreground mb-1">Total Forecast Revenue</div>
                <div className="text-xl font-bold">{formatCurrency(summary.totalForecastRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[10px] text-muted-foreground mb-1">Growth Rate (mo)</div>
                <div className={cn("text-xl font-bold flex items-center gap-1", growthColor)}>
                  {growthDirection === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {Math.abs(summary.recentGrowthRate).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[10px] text-muted-foreground mb-1">Churn Rate (mo)</div>
                <div className="text-xl font-bold text-red-500">{summary.monthlyChurnRate}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-[10px] text-muted-foreground mb-1">Confidence</div>
                <div className={cn("text-xl font-bold", confidenceColor)}>{summary.confidence}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChart className="h-5 w-5 text-primary" />
                  Revenue Projection — {summary.forecastMonths}-Month Forecast
                </CardTitle>
                <Badge variant="outline" className={cn("text-[10px]", confidenceColor)}>
                  {summary.confidence}% confidence
                </Badge>
              </div>
              <CardDescription>
                Solid line = actual revenue · Dashed area = projected range · Dotted line = scenario midpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={combinedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      interval={2}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                    <RechartsTooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(value: number) => [formatCurrency(value), undefined]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="scenarioHigh"
                      fill="hsl(var(--primary) / 0.1)"
                      stroke="hsl(var(--primary) / 0.3)"
                      strokeDasharray="3 3"
                      name="High Scenario"
                    />
                    <Area
                      type="monotone"
                      dataKey="scenarioLow"
                      fill="hsl(var(--primary) / 0.05)"
                      stroke="hsl(var(--primary) / 0.2)"
                      strokeDasharray="3 3"
                      name="Low Scenario"
                    />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--chart-2))"
                      radius={[2, 2, 0, 0]}
                      name="Actual Revenue"
                      barSize={20}
                    />
                    <Line
                      type="monotone"
                      dataKey="projected"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 5"
                      name="Projected"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Forecast Details */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cumulative Projection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary" />
                  Cumulative Projection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={forecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={9} interval={2} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => [formatCurrency(value), undefined]} />
                      <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Cumulative Revenue" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Contribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  Pipeline Contribution vs Churn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={9} interval={2} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v: number) => formatCurrency(v)} />
                      <RechartsTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => [formatCurrency(value), undefined]} />
                      <Bar dataKey="pipelineContribution" fill="hsl(var(--chart-3))" name="Pipeline Contribution" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="churnDeduction" fill="hsl(var(--chart-5))" name="Churn Deduction" radius={[2, 2, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Breakdown Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-primary" />
                Monthly Forecast Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-xs">Month</th>
                      <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Projected</th>
                      <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Low Scenario</th>
                      <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">High Scenario</th>
                      <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Pipeline</th>
                      <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Churn Adj.</th>
                      <th className="py-2.5 px-4 text-right font-medium text-muted-foreground text-xs">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.map((m, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-xs">{m.label}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs">{formatCurrency(m.projected || 0)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-amber-500">{formatCurrency(m.scenarioLow || 0)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-emerald-500">{formatCurrency(m.scenarioHigh || 0)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-blue-500">{formatCurrency(m.pipelineContribution || 0)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-red-500">-{formatCurrency(m.churnDeduction || 0)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs font-bold">{formatCurrency(m.cumulative || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Strategy Card */}
          <Card className="bg-gradient-to-br from-blue-500/5 to-emerald-500/5 border-blue-500/10">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                  <Brain className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">AI-Driven Forecast Insights</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong>Growth rate:</strong> {summary.recentGrowthRate}% monthly (recent) / {summary.growthRate}% (long-term).
                      {summary.recentGrowthRate > summary.growthRate
                        ? " Recent acceleration suggests positive momentum."
                        : " Recent slowing suggests market maturation."}
                    </p>
                    <p>
                      <strong>Churn risk:</strong> {summary.monthlyChurnRate}% monthly churn rate.
                      {summary.monthlyChurnRate > 5
                        ? " Elevated churn — consider retention programs."
                        : " Healthy churn rate within normal range."}
                    </p>
                    {metadata && (
                      <p>
                        <strong>Pipeline:</strong> {metadata.hotLeadsInPipeline} hot leads in pipeline contributing ~
                        {formatCurrency(summary.pipelineContributionMonthly)}/mo to projected growth.
                        {metadata.activeRetainers} active retainers generating current MRR.
                      </p>
                    )}
                    {summary.breakoutMonth && (
                      <p>
                        <strong>Breakout projection:</strong> Revenue expected to reach 1.5× current MRR by month {summary.breakoutMonth}.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !summary && (
        <div className="text-center py-20">
          <BarChart3 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Insufficient Data</h2>
          <p className="text-muted-foreground">Add revenue data and active retainers to generate a forecast.</p>
        </div>
      )}
    </div>
  )
}
