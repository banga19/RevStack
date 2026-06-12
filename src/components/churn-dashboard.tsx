"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Users,
  TrendingUp,
  Shield,
  Search,
  ChevronDown,
  ChevronRight,
  UserCheck,
  LogIn,
  Clock,
  Sparkles,
  Target,
  BarChart3,
  Activity,
  Zap,
} from "lucide-react"

type RiskLevel = "low" | "medium" | "high" | "critical"

type ScoredUser = {
  id: string
  name: string
  email: string
  role: string
  subscriptionStatus: string
  subscriptionTier: string | null
  createdAt: string
  lastLoginAt: string | null
  daysSinceRegistration: number
  onboardingCompleted: boolean
  riskScore: number
  riskLevel: RiskLevel
  riskReasons: string[]
  recommendation: string | null
}

type ChurnData = {
  summary: {
    totalUsers: number
    lowRisk: number
    mediumRisk: number
    highRisk: number
    criticalRisk: number
    averageRiskScore: number
    atRiskTotal: number
  }
  users: ScoredUser[]
}

const riskColors: Record<RiskLevel, string> = {
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  critical: "bg-red-500/10 text-red-600 border-red-500/30",
}

const riskBarColors: Record<RiskLevel, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
}

function RiskBadge({ level, score }: { level: RiskLevel; score: number }) {
  return (
    <Badge className={cn("text-[10px]", riskColors[level])}>
      {level === "critical" && <AlertTriangle className="h-3 w-3 mr-1 animate-pulse" />}
      {score}/100 · {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  )
}

export function ChurnDashboard() {
  const [data, setData] = useState<ChurnData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all")
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/churn")
      if (!res.ok) throw new Error("Failed to load")
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError("Could not load churn prediction data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredUsers = data?.users.filter((u) => {
    if (riskFilter !== "all" && u.riskLevel !== riskFilter) return false
    if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  }) ?? []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">{error || "Could not load churn data"}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  const { summary } = data

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card><CardContent className="p-4"><div className="p-2 rounded-lg bg-blue-500/10 w-fit"><Users className="h-4 w-4 text-blue-500" /></div><div className="mt-2"><div className="text-2xl font-bold">{summary.totalUsers}</div><div className="text-xs text-muted-foreground">Total Users</div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="p-2 rounded-lg bg-emerald-500/10 w-fit"><UserCheck className="h-4 w-4 text-emerald-500" /></div><div className="mt-2"><div className="text-2xl font-bold">{summary.lowRisk}</div><div className="text-xs text-muted-foreground">Low Risk</div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="p-2 rounded-lg bg-amber-500/10 w-fit"><Activity className="h-4 w-4 text-amber-500" /></div><div className="mt-2"><div className="text-2xl font-bold">{summary.mediumRisk}</div><div className="text-xs text-muted-foreground">Medium Risk</div></div></CardContent></Card>
        <Card className="border-orange-500/20"><CardContent className="p-4"><div className="p-2 rounded-lg bg-orange-500/10 w-fit"><TrendingUp className="h-4 w-4 text-orange-500" /></div><div className="mt-2"><div className="text-2xl font-bold text-orange-500">{summary.highRisk}</div><div className="text-xs text-muted-foreground">High Risk</div></div></CardContent></Card>
        <Card className="border-red-500/20"><CardContent className="p-4"><div className="p-2 rounded-lg bg-red-500/10 w-fit"><AlertTriangle className="h-4 w-4 text-red-500" /></div><div className="mt-2"><div className="text-2xl font-bold text-red-500">{summary.criticalRisk}</div><div className="text-xs text-muted-foreground">Critical Risk</div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="p-2 rounded-lg bg-violet-500/10 w-fit"><BarChart3 className="h-4 w-4 text-violet-500" /></div><div className="mt-2"><div className="text-2xl font-bold">{summary.averageRiskScore}</div><div className="text-xs text-muted-foreground">Avg Risk Score</div></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Risk Distribution</span>
            <span className="ml-auto text-xs text-muted-foreground">{summary.atRiskTotal} users at risk</span>
          </div>
          <div className="flex h-4 rounded-full overflow-hidden">
            <div className="bg-emerald-500 transition-all" style={{ width: `${(summary.lowRisk / summary.totalUsers) * 100}%` }} />
            <div className="bg-amber-500 transition-all" style={{ width: `${(summary.mediumRisk / summary.totalUsers) * 100}%` }} />
            <div className="bg-orange-500 transition-all" style={{ width: `${(summary.highRisk / summary.totalUsers) * 100}%` }} />
            <div className="bg-red-500 transition-all" style={{ width: `${(summary.criticalRisk / summary.totalUsers) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>● {summary.lowRisk} Low</span>
            <span>● {summary.mediumRisk} Medium</span>
            <span>● {summary.highRisk} High</span>
            <span>● {summary.criticalRisk} Critical</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> User Risk Assessment</CardTitle>
            <CardDescription>Sorted by risk score (highest first){filteredUsers.length < data.users.length && ` · ${filteredUsers.length} shown`}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 w-[160px] pl-7 text-xs" />
            </div>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as RiskLevel | "all")} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <Button variant="outline" size="sm" className="h-8" onClick={loadData}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>{searchQuery ? "No users match your search" : "No users found"}</p></div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <div key={user.id}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors items-center">
                    <div className="col-span-3 flex items-center gap-3">
                      <button onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)} className="shrink-0">
                        {expandedUserId === user.id ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      </button>
                      <div className={cn("flex items-center justify-center w-9 h-9 rounded-full font-bold text-xs shrink-0", riskColors[user.riskLevel])}>
                        {user.riskScore}
                      </div>
                      <div className="min-w-0"><p className="text-sm font-medium truncate">{user.name}</p><p className="text-xs text-muted-foreground truncate">{user.email}</p></div>
                    </div>
                    <div className="col-span-2"><RiskBadge level={user.riskLevel} score={user.riskScore} /></div>
                    <div className="col-span-2"><Progress value={user.riskScore} className={cn("h-2", riskBarColors[user.riskLevel])} /></div>
                    <div className="col-span-2">
                      <div className="flex flex-wrap gap-1">
                        {user.riskReasons.slice(0, 2).map((reason, i) => (<span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{reason}</span>))}
                        {user.riskReasons.length > 2 && <span className="text-[9px] text-muted-foreground">+{user.riskReasons.length - 2}</span>}
                      </div>
                    </div>
                    <div className="col-span-2">
                      {user.lastLoginAt ? <span className="text-xs text-muted-foreground"><LogIn className="h-3 w-3 inline mr-1" />{Math.floor((Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))}d ago</span>
                        : <span className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-1" />Never</span>}
                    </div>
                    <div className="col-span-1">{user.onboardingCompleted ? <Badge variant="default" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">✓</Badge> : <Badge variant="outline" className="text-[9px]">—</Badge>}</div>
                  </div>
                  {expandedUserId === user.id && (
                    <div className="mx-4 mb-2 p-4 rounded-lg border bg-card/50 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div><span className="text-muted-foreground">Risk Score: </span><span className="font-bold">{user.riskScore}/100</span></div>
                        <div><span className="text-muted-foreground">Status: </span><span className="capitalize">{user.subscriptionStatus}</span></div>
                        <div><span className="text-muted-foreground">Tier: </span><span>{user.subscriptionTier || "—"}</span></div>
                        <div><span className="text-muted-foreground">Role: </span><span>{user.role}</span></div>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-2 flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-amber-500" /> Risk Factors ({user.riskReasons.length})</p>
                        <div className="space-y-1">{user.riskReasons.map((reason, i) => (<div key={i} className="flex items-center gap-2 text-xs text-muted-foreground"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{reason}</div>))}</div>
                      </div>
                      {user.recommendation && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                          <Sparkles className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <div><p className="text-xs font-medium text-blue-600">Recommended Action</p><p className="text-xs text-muted-foreground">{user.recommendation}</p></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data.users.filter((u) => u.recommendation).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Action Recommendations Summary</CardTitle>
            <CardDescription>Automated retention and upsell suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(new Set(data.users.filter((u) => u.recommendation).map((u) => u.recommendation))).slice(0, 8).map((rec, i) => {
                const count = data.users.filter((u) => u.recommendation === rec).length
                const avgRisk = Math.round(data.users.filter((u) => u.recommendation === rec).reduce((s, u) => s + u.riskScore, 0) / count)
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="p-1.5 rounded bg-primary/10"><Zap className="h-3.5 w-3.5 text-primary" /></div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-medium">{rec}</p><p className="text-[10px] text-muted-foreground">{count} users · Avg risk {avgRisk}/100</p></div>
                    <Badge variant="outline" className={cn("text-[9px]", avgRisk >= 45 ? "border-red-500 text-red-600" : "border-amber-500 text-amber-600")}>{avgRisk >= 45 ? "Priority" : "Standard"}</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
