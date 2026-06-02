"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { cn, formatCurrency } from "@/lib/utils"
import {
  DollarSign,
  TrendingUp,
  PiggyBank,
  BarChart3,
  Target,
  Plus,
  Trash2,
  Loader2,
  Receipt,
  Flag,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
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
  name: string
  tier: string | null
  monthlyRetainer: number | null
  status: string
}

const MONTHLY_COSTS = 560

const defaultRevenueForm = {
  clientName: "",
  amount: "",
  type: "retainer",
  category: "growth",
  date: new Date().toISOString().split("T")[0],
  note: "",
}

export default function FinancialPage() {
  const [data, setData] = useState<{ revenue: RevenueEntry[]; snapshots: FinancialSnapshot[]; clients: Client[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(defaultRevenueForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadData = () => {
    fetch("/api/revenue")
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const openAddForm = () => {
    setForm(defaultRevenueForm)
    setDialogOpen(true)
  }

  const saveEntry = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setDialogOpen(false)
        loadData()
      }
    } catch (e) {
      console.error("Save failed", e)
    } finally {
      setSaving(false)
    }
  }

  const deleteEntry = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/revenue/${id}`, { method: "DELETE" })
      if (res.ok) {
        loadData()
      }
    } catch (e) {
      console.error("Delete failed", e)
    } finally {
      setDeletingId(null)
    }
  }

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

  const totalRevenue = revenueEntries.reduce((sum, e) => sum + e.amount, 0)
  const totalCosts = snapshots.length * MONTHLY_COSTS
  const totalProfit = totalRevenue - totalCosts
  const activeClients = clients.filter((c) => c.status === "active" || c.status === "onboarding").length
  const monthlyMRR = clients
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + (c.monthlyRetainer || 0), 0)

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

  const revenueByType: Record<string, number> = {}
  for (const r of revenueEntries) {
    revenueByType[r.type] = (revenueByType[r.type] || 0) + r.amount
  }

  const revenueByTypeData = Object.entries(revenueByType).map(([type, value]) => ({
    type: type.replace("retainer", "Retainer").replace("setup-fee", "Setup Fee").replace("performance", "Performance").replace("referral", "Referral"),
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
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-sm px-3 py-1">
            <Target className="h-3.5 w-3.5 mr-1" />
            {((monthlyMRR / 22500) * 100).toFixed(0)}% of target
          </Badge>
          <Button size="sm" onClick={openAddForm}>
            <Plus className="h-4 w-4 mr-1" /> Add Revenue
          </Button>
        </div>
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
              <span className="text-emerald-500 font-medium">{activeClients} active clients</span>
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
              <span className="text-sm font-medium text-muted-foreground">Target Gap</span>
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

      {/* Revenue Entries Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue Entries</CardTitle>
            <CardDescription>{revenueEntries.length} transactions recorded</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={openAddForm}>
            <Plus className="h-4 w-4 mr-1" /> Add Entry
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {revenueEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-3 opacity-50" />
              <p>No revenue entries yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Note</th>
                    <th className="py-3 px-4 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {revenueEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="py-3 px-4 whitespace-nowrap">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-medium">{entry.clientName || "—"}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {entry.type.replace("setup-fee", "Setup Fee").replace("retainer", "Retainer")}
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">{formatCurrency(entry.amount)}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs hidden md:table-cell max-w-[200px] truncate">{entry.note || "—"}</td>
                      <td className="py-3 px-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => deleteEntry(entry.id)}
                          disabled={deletingId === entry.id}
                        >
                          {deletingId === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue by Type */}
      {revenueByTypeData.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
              <CardDescription>By revenue type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="type" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                    <RechartsTooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value: number) => [formatCurrency(value), undefined]}
                    />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

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
        </div>
      )}

      {/* Korea Corridor Revenue Projection */}
      <Card className="bg-gradient-to-br from-rose-500/5 to-amber-500/5 border-rose-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-rose-500" /> Korea Corridor Revenue Projection
          </CardTitle>
          <CardDescription>
            Target: 10 Korean corporate customers + 20-company Sokogate pilot. Source:
            <a href="/KOREA-CORPORATE-STRATEGY.md" target="_blank" className="text-primary hover:underline ml-1">
              KOREA-CORPORATE-STRATEGY.md
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            {[
              { label: "Target Customers", value: "10", sub: "Korean procurement teams", color: "text-rose-500" },
              { label: "Target MRR", value: "$22,500", sub: "From retainers alone", color: "text-amber-500" },
              { label: "With Success Fees", value: "$27,500", sub: "+2-5% per transaction", color: "text-emerald-500" },
              { label: "Year 1 Total", value: "$196,500", sub: "Cumulative corridor revenue", color: "text-violet-500" },
            ].map((kpi) => (
              <div key={kpi.label} className="p-3 rounded-lg bg-background/80 border">
                <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                <p className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Month</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Customers</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Pilot Active</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Retainers</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Success Fees</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Total Korea</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { month: "M1", customers: 0, pilots: 5, retainers: 0, fees: 0, total: 0, cumulative: 0 },
                  { month: "M2", customers: 0, pilots: 10, retainers: 0, fees: 0, total: 0, cumulative: 0 },
                  { month: "M3", customers: 1, pilots: 15, retainers: 2500, fees: 200, total: 2700, cumulative: 2700 },
                  { month: "M4", customers: 3, pilots: 18, retainers: 7500, fees: 800, total: 8300, cumulative: 11000 },
                  { month: "M5", customers: 5, pilots: 16, retainers: 12500, fees: 1500, total: 14000, cumulative: 25000 },
                  { month: "M6", customers: 7, pilots: 14, retainers: 16500, fees: 2500, total: 19000, cumulative: 44000 },
                  { month: "M7", customers: 8, pilots: 15, retainers: 18500, fees: 3000, total: 21500, cumulative: 65500 },
                  { month: "M8", customers: 9, pilots: 15, retainers: 20500, fees: 3500, total: 24000, cumulative: 89500 },
                  { month: "M9", customers: 9, pilots: 15, retainers: 20500, fees: 4000, total: 24500, cumulative: 114000 },
                  { month: "M10", customers: 10, pilots: 15, retainers: 22500, fees: 4500, total: 27000, cumulative: 141000 },
                  { month: "M11", customers: 10, pilots: 15, retainers: 22500, fees: 5000, total: 27500, cumulative: 168500 },
                  { month: "M12", customers: 10, pilots: 15, retainers: 22500, fees: 5000, total: 27500, cumulative: 196500 },
                ].map((row, i) => {
                  return (
                    <tr key={i} className={cn(
                      "border-b last:border-0 hover:bg-muted/30 transition-colors text-xs",
                      row.customers >= 10 && "font-semibold bg-rose-500/5"
                    )}>
                      <td className="py-2 px-2">{row.month}</td>
                      <td className="text-right py-2 px-2">{row.customers}</td>
                      <td className="text-right py-2 px-2 text-muted-foreground">{row.pilots}</td>
                      <td className="text-right py-2 px-2">${row.retainers.toLocaleString()}</td>
                      <td className="text-right py-2 px-2 text-muted-foreground">${row.fees.toLocaleString()}</td>
                      <td className={cn("text-right py-2 px-2 font-medium", row.total > 0 ? "text-emerald-500" : "")}>
                        ${row.total.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-2 text-muted-foreground">${row.cumulative.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <div>
              <p className="text-sm font-medium">Year 1 Korean Corridor Total</p>
              <p className="text-xs text-muted-foreground">Retainers + success fees from 10 corporate customers &amp; 20-company pilot program</p>
            </div>
            <span className="text-xl font-bold text-rose-500">$196,000</span>
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

      {/* Add Revenue Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Revenue Entry</DialogTitle>
            <DialogDescription>Record a new revenue transaction.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rev-date">Date</Label>
                <Input id="rev-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rev-amount">Amount ($)</Label>
                <Input id="rev-amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="2500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rev-client">Client Name</Label>
              <Input id="rev-client" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="e.g. Ultimo Trading or Sokogate" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rev-type">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retainer">Retainer</SelectItem>
                    <SelectItem value="setup-fee">Setup Fee</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rev-category">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rev-note">Note</Label>
              <Input id="rev-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Month 1 retainer" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveEntry} disabled={saving || !form.amount || !form.clientName}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
