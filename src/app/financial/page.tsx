"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn, formatCurrency } from "@/lib/utils"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  BarChart3,
  PieChart,
  Target,
  CalendarCheck,
  ArrowUpRight,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts"

type RevenueEntry = {
  id: string
  date: string
  clientName: string | null
  amount: number
  type: string
  category: string | null
  note: string | null
}

type FinancialSnapshot = {
  id: string
  month: number
  year: number
  revenue: number
  costs: number
  profit: number
  clients: number
  pipelineValue: number
}

type Client = {
  id: string
  tier: string | null
  monthlyRetainer: number | null
  status: string
}

const MONTHLY_COSTS = 560 // Total tool costs

export default function FinancialPage() {
  const [data, setData] = useState<{ revenue: RevenueEntry[]; snapshots: FinancialSnapshot[]; clients: Client[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/revenue")
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="shimmer h-8 w-48 rounded mb-2" />
        <div className="shimmer h-4 w-64 rounded mb-8" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="shimmer h-32 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Financial Data</h2>
        <p className="text-muted-foreground">Run the database seed to populate financial data.</p>
      </div>
    )
  }

  const { revenue: revenueEntries, snapshots, clients } = data

  // Calculate metrics
  const totalRevenue = revenueEntries.reduce((sum, e) => sum + e.amount, 0)
  const totalCosts = snapshots.length * MONTHLY_COSTS
  const totalProfit = totalRevenue - totalCosts
  const activeClients = clients.filter((c) => c.status === "active" || c.status === "onboarding").length
  const monthlyMRR = clients
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + (c.monthlyRetainer || 0), 0)
  const churnRate = 0.05 // assumed 5% monthly

  // Projections
  const projectionMonths = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"]
  const projections = projectionMonths.map((m, i) => {
    const snap = snapshots[i]
    const projectedMRR = snap?.revenue || monthlyMRR * (i + 1) * 0.85
    const projectedCosts = MONTHLY_COSTS + (i >= 3 ? 100 : 0) + (i >= 6 ? 100 : 0)
    return {
      month: m,
      revenue: snap?.revenue || Math.round(projectedMRR),
      costs: snap?.costs || projectedCosts,
      profit: snap?.profit || Math.round(projectedMRR - projectedCosts),
      clients: snap?.clients || Math.max(0, activeClients + Math.floor(i * 0.5)),
    }
  })

  // Revenue by type
  const revenueByType: Record<string, number> = {}
  for (const r of revenueEntries) {
    revenueByType[r.type] = (revenueByType[r.type] || 0) + r.amount
  }

  const revenueByTypeData = Object.entries(revenueByType).map(([type, value]) => ({
    type: type.replace("-", " "),
    value,
  }))

  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Model</h1>
          <p className="text-muted-foreground mt-1">Track revenue, costs, and projections to $22,500/mo</p>
        </div>
        <Badge variant="success" className="text-sm px-3 py-1">
          <Target className="h-3.5 w-3.5 mr-1" />
          {((totalRevenue / 22500) * 100).toFixed(0)}% of target
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Current MRR</span>
              <div className="p-2 rounded-lg bg-emerald-500/10"><DollarSign className="h-4 w-4 text-emerald-500" /></div>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(monthlyMRR)}</div>
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
              <span className="text-emerald-500 font-medium">{activeClients} active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
              <div className="p-2 rounded-lg bg-blue-500/10"><TrendingUp className="h-4 w-4 text-blue-500" /></div>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="flex items-center mt-2 text-sm">
              <PiggyBank className="h-4 w-4 text-muted-foreground mr-1" />
              <span className="text-muted-foreground">{profitMargin}% margin</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Total Profit</span>
              <div className="p-2 rounded-lg bg-primary/10"><PiggyBank className="h-4 w-4 text-primary" /></div>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(totalProfit)}</div>
            <Progress value={totalRevenue > 0 ? 97 : 0} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Target Distance</span>
              <div className="p-2 rounded-lg bg-amber-500/10"><Target className="h-4 w-4 text-amber-500" /></div>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(22500 - monthlyMRR)}</div>
            <Progress value={(monthlyMRR / 22500) * 100} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-1">Monthly gap to $22,500 target</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Growth</CardTitle>
            <CardDescription>Monthly revenue and costs trajectory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <RechartsTooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value: number) => [formatCurrency(value), undefined]}
                  />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1) / 0.2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="costs" name="Costs" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5) / 0.1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-4 justify-center">
              <div className="flex items-center gap-1 text-sm"><div className="w-3 h-3 rounded-full bg-primary" /> Revenue</div>
              <div className="flex items-center gap-1 text-sm"><div className="w-3 h-3 rounded-full bg-destructive" /> Costs</div>
            </div>
          </CardContent>
        </Card>

        {/* Profit & Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Profit & Client Growth</CardTitle>
            <CardDescription>Profit trajectory aligned with client acquisition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="left" stroke="hsl(var(--chart-1))" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" fontSize={12} />
                  <RechartsTooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value: number) => [formatCurrency(value), undefined]}
                  />
                  <Bar yAxisId="left" dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="clients" name="Clients" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 4 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Projection Table */}
      <Card>
        <CardHeader>
          <CardTitle>12-Month Projection</CardTitle>
          <CardDescription>Conservative growth estimate to $22,500/mo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Month</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Costs</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Profit</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Clients</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Margin</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p, i) => {
                  const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(0) : "0"
                  return (
                    <tr key={i} className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors", i === projections.length - 1 && "font-semibold bg-primary/5")}>
                      <td className="py-3 px-2">{p.month}</td>
                      <td className="text-right py-3 px-2">{formatCurrency(p.revenue)}</td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{formatCurrency(p.costs)}</td>
                      <td className={cn("text-right py-3 px-2", p.profit > 0 ? "text-emerald-500" : "text-red-500")}>{formatCurrency(p.profit)}</td>
                      <td className="text-right py-3 px-2">{p.clients}</td>
                      <td className="text-right py-3 px-2">{margin}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Costs Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Tool Costs</CardTitle>
          <CardDescription>Your recurring SaaS stack</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Make.com", cost: 9, tier: "Pro plan" },
              { name: "Zoho CRM", cost: 14, tier: "Standard" },
              { name: "Wati.io", cost: 49, tier: "Growth" },
              { name: "Instantly.ai", cost: 30, tier: "Warmup" },
              { name: "Voiceflow", cost: 50, tier: "Pro" },
              { name: "QMe", cost: 30, tier: "Business" },
              { name: "Looker Studio", cost: 0, tier: "Free" },
              { name: "Airtable", cost: 24, tier: "Team" },
              { name: "Canva Pro", cost: 13, tier: "Pro" },
              { name: "Domain & Hosting", cost: 10, tier: "Annual" },
              { name: "LinkedIn Premium", cost: 30, tier: "Career" },
              { name: "SEO Tools", cost: 49, tier: "Semrush" },
              { name: "Google Workspace", cost: 12, tier: "Business" },
              { name: "Vercel (Hosting)", cost: 20, tier: "Pro" },
              { name: "Tailwind UI", cost: 0, tier: "One-time" },
              { name: "Misc/Contingency", cost: 140, tier: "Buffer" },
            ].map((tool) => (
              <div key={tool.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{tool.name}</p>
                  <p className="text-xs text-muted-foreground">{tool.tier}</p>
                </div>
                <span className="text-sm font-semibold">{tool.cost === 0 ? "Free" : `$${tool.cost}`}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between">
            <span className="font-medium">Total Monthly Tool Costs</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(MONTHLY_COSTS)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
