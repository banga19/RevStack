"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  Users,
  UserCheck,
  AlertTriangle,
  CalendarDays,
  Activity,
  Clock,
  LogIn,
  UserPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RetentionSummary {
  totalUsers: number
  newUsers7d: number
  newUsers30d: number
  usersWithLogin: number
  loginRate: number
  activeUsers7d: number
  activeUsers30d: number
  activationRate30d: number
  atRiskUsers: number
  churnRate: number
}

interface ChartDataPoint {
  date: string
  logins: number
  signups: number
}

interface RetentionCohort {
  week: string
  signedUp: number
  retained: number
  retentionRate: number
}

interface RecentLogin {
  id: string
  name: string
  email: string
  lastLoginAt: string | null
  signedUpAt: string
  daysSinceLogin: number | null
}

interface RetentionData {
  summary: RetentionSummary
  chartData: ChartDataPoint[]
  retentionCohorts: RetentionCohort[]
  recentLogins: RecentLogin[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  subValue,
  trend,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  trend?: "up" | "down" | "neutral"
  color?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn("p-2 rounded-lg shrink-0", color || "bg-primary/10")}>{icon}</div>
          {trend && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                trend === "up" && "text-emerald-600 border-emerald-500/30",
                trend === "down" && "text-red-600 border-red-500/30",
                trend === "neutral" && "text-muted-foreground"
              )}
            >
              {trend === "up" && "↑"}
              {trend === "down" && "↓"}
              {trend === "neutral" && "→"}
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          {subValue && <div className="text-[10px] text-muted-foreground mt-1">{subValue}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Mini Bar Chart
// ---------------------------------------------------------------------------

function MiniBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-[2px] h-20">
      {data.map((d, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-t-sm transition-all hover:opacity-80 min-w-[3px]", color)}
          style={{ height: `${(d.value / maxVal) * 100}%` }}
          title={`${d.label}: ${d.value}`}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RetentionDashboard() {
  const [data, setData] = useState<RetentionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/retention")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load")
        return r.json()
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

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
        <p className="text-muted-foreground text-sm">Could not load retention data</p>
      </div>
    )
  }

  const { summary, chartData, retentionCohorts, recentLogins } = data
  const recentChartData = chartData.slice(-14) // Last 14 days

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total Users"
          value={summary.totalUsers}
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          icon={<UserPlus className="h-4 w-4" />}
          label="New (7d)"
          value={summary.newUsers7d}
          subValue={`${summary.newUsers30d} in 30d`}
          trend={summary.newUsers7d > 0 ? "up" : "neutral"}
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          icon={<LogIn className="h-4 w-4" />}
          label="Login Rate"
          value={`${summary.loginRate}%`}
          subValue={`${summary.usersWithLogin} users`}
          trend={summary.loginRate > 50 ? "up" : "down"}
          color="bg-purple-500/10 text-purple-500"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Active (7d)"
          value={summary.activeUsers7d}
          subValue={`${summary.activeUsers30d} in 30d`}
          trend={summary.activeUsers7d > 0 ? "up" : "neutral"}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="At Risk / Churned"
          value={summary.atRiskUsers}
          subValue={`${summary.churnRate}% churn rate`}
          trend={summary.churnRate > 30 ? "down" : "neutral"}
          color="bg-red-500/10 text-red-500"
        />
      </div>

      {/* Activation + Churn */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">30-Day Activation Rate</span>
              <span className="ml-auto text-2xl font-bold">{summary.activationRate30d}%</span>
            </div>
            <Progress value={summary.activationRate30d} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {summary.activationRate30d >= 60
                ? "Strong activation — most new users are returning."
                : summary.activationRate30d >= 30
                  ? "Moderate activation — consider improving onboarding engagement."
                  : "Low activation — review the signup-to-login funnel."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Churn Risk</span>
              <span className="ml-auto text-2xl font-bold">{summary.churnRate}%</span>
            </div>
            <Progress
              value={summary.churnRate}
              className={cn("h-2", summary.churnRate > 30 ? "[&>div]:bg-red-500" : summary.churnRate > 15 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")}
            />
            <p className="text-xs text-muted-foreground">
              {summary.churnRate >= 30
                ? "High churn risk — consider re-engagement campaigns."
                : summary.churnRate >= 15
                  ? "Moderate churn — send targeted win-back messaging."
                  : "Low churn — users are staying engaged."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Logins & Signups (last 14 days) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <LogIn className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Daily Logins (14d)</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {recentChartData.reduce((s, d) => s + d.logins, 0)} total
              </span>
            </div>
            <MiniBarChart
              data={recentChartData.map((d) => ({ label: formatDate(d.date), value: d.logins }))}
              color="bg-primary/70"
            />
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>{recentChartData.length > 0 ? formatDate(recentChartData[0].date) : ""}</span>
              <span>{recentChartData.length > 0 ? formatDate(recentChartData[recentChartData.length - 1].date) : ""}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Daily Sign-ups (14d)</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {recentChartData.reduce((s, d) => s + d.signups, 0)} total
              </span>
            </div>
            <MiniBarChart
              data={recentChartData.map((d) => ({ label: formatDate(d.date), value: d.signups }))}
              color="bg-emerald-500/70"
            />
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>{recentChartData.length > 0 ? formatDate(recentChartData[0].date) : ""}</span>
              <span>{recentChartData.length > 0 ? formatDate(recentChartData[recentChartData.length - 1].date) : ""}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retention Cohorts */}
      {retentionCohorts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Weekly Retention Cohorts</span>
              <span className="ml-auto text-xs text-muted-foreground">
                Users who signed up that week and logged in during the last 7 days
              </span>
            </div>
            <div className="space-y-1.5">
              {retentionCohorts.map((c) => (
                <div key={c.week} className="flex items-center gap-3 text-xs">
                  <span className="w-24 shrink-0 text-muted-foreground">Week of {formatDate(c.week)}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <Progress value={c.retentionRate} className="h-2.5 flex-1" />
                    <span className="w-16 text-right font-medium">{c.retentionRate}%</span>
                  </div>
                  <span className="text-muted-foreground w-20 text-right">
                    {c.retained}/{c.signedUp}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Logins */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Recent Logins</span>
          </div>
          {recentLogins.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No login activity yet</p>
          ) : (
            <div className="space-y-1">
              {recentLogins.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors text-xs">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-[10px] shrink-0">
                    {u.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.name || u.email}</p>
                    <p className="text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className="text-[9px]">
                      {u.daysSinceLogin !== null
                        ? u.daysSinceLogin === 0
                          ? "Today"
                          : u.daysSinceLogin === 1
                            ? "Yesterday"
                            : `${u.daysSinceLogin}d ago`
                        : "Never"}
                    </Badge>
                    <span className="text-muted-foreground">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
