"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAbac } from "@/lib/use-abac"
import { cn } from "@/lib/utils"
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Users,
  TrendingUp,
  DollarSign,
  Mail,
  Shield,
  ShieldAlert,
  BarChart3,
  CalendarDays,
  Smartphone,
  Search,
  ChevronDown,
  ChevronRight,
  XCircle,
  Activity,
  Timer,
  Zap,
} from "lucide-react"

// ============================================================
// Types
// ============================================================

interface TrialUser {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  tier: string | null
  plan: string | null
  trialStartsAt: string | null
  trialEndsAt: string | null
  createdAt: string
  lastLoginAt: string | null
  onboardingCompleted: boolean
  followUpCount: number
  paymentCount: number
  hasActiveSubscription: boolean
}

interface TrialStats {
  activeTrials: number
  expiredTrials: number
  convertedToPaid: number
  conversionRate: number
  avgDaysOnTrial: number
  trialsExpiringToday: number
  trialsExpiringThisWeek: number
  onboardingRate: number
}

interface TrialData {
  stats: TrialStats
  active: TrialUser[]
  expired: TrialUser[]
  converted: TrialUser[]
}

// ============================================================
// Helpers
// ============================================================

function daysRemaining(endDate: string | null): number {
  if (!endDate) return 0
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
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

// ============================================================
// Component
// ============================================================

export default function TrialDashboardPage() {
  const { isAdmin, isLoading: abacLoading } = useAbac()
  const router = useRouter()

  const [data, setData] = useState<TrialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  // Actions
  const [runningAction, setRunningAction] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Load trial data from API
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/trials")
      if (res.status === 401) { router.push("/dashboard"); return }
      if (res.status === 403) { router.push("/admin"); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError("Failed to load trial data")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [router])

  // Actions
  const handleAction = async (action: string, userId: string) => {
    setRunningAction(`${action}-${userId}`)
    setActionFeedback(null)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, [action]: true }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Action failed")
      setActionFeedback({ type: "success", message: action === "grantPermanentAccess" ? "Permanent access granted" : "Trial extended by 7 days" })
      setTimeout(() => loadData(), 500)
    } catch (e: any) {
      setActionFeedback({ type: "error", message: e.message || "Action failed" })
    } finally {
      setRunningAction(null)
    }
  }

  // Send follow-up email
  const handleSendFollowUp = async (userId: string, stage: string) => {
    setRunningAction(`followup-${userId}-${stage}`)
    setActionFeedback(null)
    try {
      const res = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger-followup", userId, stageId: stage }),
      })
      if (!res.ok) throw new Error("Follow-up failed")
      setActionFeedback({ type: "success", message: `Follow-up (${stage}) sent` })
      setTimeout(() => loadData(), 500)
    } catch (e: any) {
      setActionFeedback({ type: "error", message: e.message || "Follow-up failed" })
    } finally {
      setRunningAction(null)
    }
  }

  // Initial load
  useEffect(() => {
    if (abacLoading) return
    if (!isAdmin) { router.push("/dashboard"); return }
    loadData()
  }, [abacLoading, isAdmin])

  // Filter users
  const filteredActive = (data?.active ?? []).filter((u) => {
    if (statusFilter === "expiring-today" && daysRemaining(u.trialEndsAt) > 1) return false
    if (statusFilter === "expiring-week" && daysRemaining(u.trialEndsAt) > 7) return false
    if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filteredExpired = (data?.expired ?? []).filter((u) => {
    if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // ── Guard ──────────────────────────────────────────────
  if (abacLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have admin privileges to view this page.</p>
        <Button className="mt-6" onClick={() => router.push("/admin")}>
          Go to Admin Panel
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Clock className="h-7 w-7 text-amber-500" />
            Trial Tracking Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor free trial users, track conversion, and send upgrade prompts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Action feedback */}
      {actionFeedback && (
        <div className={cn(
          "rounded-lg border p-4 text-sm flex items-center gap-3",
          actionFeedback.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
            : "bg-red-500/10 border-red-500/30 text-red-700"
        )}>
          {actionFeedback.type === "success"
            ? <CheckCircle2 className="h-5 w-5 shrink-0" />
            : <AlertTriangle className="h-5 w-5 shrink-0" />
          }
          <span className="flex-1">{actionFeedback.message}</span>
          <button onClick={() => setActionFeedback(null)} className="text-muted-foreground hover:text-foreground">&times;</button>
        </div>
      )}

      {/* ── Stats Cards ─────────────────────────────────── */}
      {data && (
        <>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <div className="text-xl font-bold">{data.stats.activeTrials}</div>
                  <div className="text-[10px] text-muted-foreground">Active Trials</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10"><XCircle className="h-5 w-5 text-red-500" /></div>
                <div>
                  <div className="text-xl font-bold">{data.stats.expiredTrials}</div>
                  <div className="text-[10px] text-muted-foreground">Expired</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
                <div>
                  <div className="text-xl font-bold">{data.stats.convertedToPaid}</div>
                  <div className="text-[10px] text-muted-foreground">Converted</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
                <div>
                  <div className="text-xl font-bold">{data.stats.conversionRate}%</div>
                  <div className="text-[10px] text-muted-foreground">Conversion Rate</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", data.stats.trialsExpiringToday > 0 ? "bg-red-500/10" : "bg-muted")}>
                  <AlertTriangle className={cn("h-5 w-5", data.stats.trialsExpiringToday > 0 ? "text-red-500" : "text-muted-foreground")} />
                </div>
                <div>
                  <div className="text-xl font-bold">{data.stats.trialsExpiringToday}</div>
                  <div className="text-[10px] text-muted-foreground">Expiring Today</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", data.stats.trialsExpiringThisWeek > 0 ? "bg-amber-500/10" : "bg-muted")}>
                  <Timer className={cn("h-5 w-5", data.stats.trialsExpiringThisWeek > 0 ? "text-amber-500" : "text-muted-foreground")} />
                </div>
                <div>
                  <div className="text-xl font-bold">{data.stats.trialsExpiringThisWeek}</div>
                  <div className="text-[10px] text-muted-foreground">Expiring This Week</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10"><BarChart3 className="h-5 w-5 text-purple-500" /></div>
                <div>
                  <div className="text-xl font-bold">{data.stats.onboardingRate}%</div>
                  <div className="text-[10px] text-muted-foreground">Onboarding Rate</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Conversion Funnel ────────────────────────── */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Trial Conversion Funnel
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Signed Up</span>
                    <span>{data.stats.activeTrials + data.stats.expiredTrials + data.stats.convertedToPaid}</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Completed Onboarding</span>
                    <span>{Math.round((data.stats.activeTrials + data.stats.convertedToPaid) * data.stats.onboardingRate / 100)}</span>
                  </div>
                  <Progress value={data.stats.onboardingRate} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Active on Trial</span>
                    <span>{data.stats.activeTrials}</span>
                  </div>
                  <Progress
                    value={data.stats.activeTrials > 0 ? (data.stats.activeTrials / (data.stats.activeTrials + data.stats.expiredTrials + data.stats.convertedToPaid)) * 100 : 0}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Converted to Paid</span>
                    <span>{data.stats.convertedToPaid}</span>
                  </div>
                  <Progress value={data.stats.conversionRate} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Active Trials ────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Active Trials ({data.active.length})
                </CardTitle>
                <CardDescription>
                  Users currently on the 3-day free trial
                  {filteredActive.length < data.active.length && ` · ${filteredActive.length} shown`}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-[160px] rounded-md border border-input bg-background pl-7 pr-3 text-xs"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Active</SelectItem>
                    <SelectItem value="expiring-today">Expiring Today</SelectItem>
                    <SelectItem value="expiring-week">Expiring This Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredActive.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No users match your search" : "No active trials"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Column headers */}
                  <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-2.5">User</div>
                    <div className="col-span-1.5">Days Left</div>
                    <div className="col-span-1.5">Trial Ends</div>
                    <div className="col-span-1">Onboarding</div>
                    <div className="col-span-1">Last Login</div>
                    <div className="col-span-1.5">Follow-ups</div>
                    <div className="col-span-3">Actions</div>
                  </div>

                  {filteredActive.map((user) => {
                    const days = daysRemaining(user.trialEndsAt)
                    const isUrgent = days <= 1
                    const isExpanded = expandedUserId === user.id

                    return (
                      <div key={user.id}>
                        <div
                          className={cn(
                            "grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-3 p-4 rounded-lg transition-colors items-center",
                            isUrgent ? "bg-red-500/5 border border-red-500/20 hover:bg-red-500/10" : "bg-muted/30 hover:bg-muted/50"
                          )}
                        >
                          <div className="col-span-2.5 flex items-center gap-3">
                            <button
                              onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                              className="shrink-0"
                            >
                              {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                            </button>
                            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-xs shrink-0">
                              {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate flex items-center gap-1.5">
                                {user.name}
                                {user.phone && <Smartphone className="h-3 w-3 text-muted-foreground" />}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>

                          <div className="col-span-1.5">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                days >= 2 ? "bg-emerald-500" : days === 1 ? "bg-amber-500 animate-pulse" : "bg-red-500 animate-pulse"
                              )} />
                              <span className={cn("text-sm font-medium", isUrgent && "text-red-500")}>
                                {days}d
                              </span>
                            </div>
                          </div>

                          <div className="col-span-1.5">
                            <span className="text-xs text-muted-foreground">
                              {user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleDateString() : "—"}
                            </span>
                          </div>

                          <div className="col-span-1">
                            <Badge variant={user.onboardingCompleted ? "default" : "outline"} className={cn(
                              "text-[10px]",
                              user.onboardingCompleted ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "text-muted-foreground"
                            )}>
                              {user.onboardingCompleted ? "Done" : "Pending"}
                            </Badge>
                          </div>

                          <div className="col-span-1">
                            <span className="text-xs text-muted-foreground">
                              {user.lastLoginAt ? timeAgo(user.lastLoginAt) : "Never"}
                            </span>
                          </div>

                          <div className="col-span-1.5">
                            <span className="text-xs text-muted-foreground">
                              {user.followUpCount} sent
                              {user.paymentCount > 0 && ` · ${user.paymentCount} payments`}
                            </span>
                          </div>

                          <div className="col-span-3">
                            <div className="flex gap-1.5 flex-wrap">
                              {/* Extend Trial */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2"
                                disabled={runningAction === `extendTrial-${user.id}`}
                                onClick={() => handleAction("extendTrial", user.id)}
                              >
                                {runningAction === `extendTrial-${user.id}`
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <><Clock className="h-3 w-3 mr-1" /> +7d</>
                                }
                              </Button>

                              {/* Grant Permanent Access */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                disabled={runningAction === `grantPermanentAccess-${user.id}`}
                                onClick={() => handleAction("grantPermanentAccess", user.id)}
                              >
                                {runningAction === `grantPermanentAccess-${user.id}`
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <><CheckCircle2 className="h-3 w-3 mr-1" /> Grant</>
                                }
                              </Button>

                              {/* Send Follow-up — D-2 */}
                              {days >= 2 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10px] px-2"
                                  disabled={runningAction === `followup-${user.id}-day-10`}
                                  onClick={() => handleSendFollowUp(user.id, "day-10")}
                                >
                                  {runningAction === `followup-${user.id}-day-10`
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <Mail className="h-3 w-3" />
                                  }
                                </Button>
                              )}

                              {/* Send Follow-up — D-1 */}
                              {days === 1 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10px] px-2 text-amber-600"
                                  disabled={runningAction === `followup-${user.id}-day-13`}
                                  onClick={() => handleSendFollowUp(user.id, "day-13")}
                                >
                                  {runningAction === `followup-${user.id}-day-13`
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <><Zap className="h-3 w-3 mr-1" /> Urgent</>
                                  }
                                </Button>
                              )}

                              {/* Send Follow-up — D-Day */}
                              {days === 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[10px] px-2 text-red-600"
                                  disabled={runningAction === `followup-${user.id}-day-14`}
                                  onClick={() => handleSendFollowUp(user.id, "day-14")}
                                >
                                  {runningAction === `followup-${user.id}-day-14`
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <><AlertTriangle className="h-3 w-3 mr-1" /> Last Day</>
                                  }
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mx-4 mb-2 p-3 rounded-lg border bg-card/30 space-y-2 text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <span className="text-muted-foreground">User ID: </span>
                                <span className="font-mono">{user.id.slice(0, 12)}...</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Tier: </span>
                                <span>{user.tier || "FREE_TRIAL"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Plan: </span>
                                <span>{user.plan || "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Phone: </span>
                                <span>{user.phone || "—"}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <span className="text-muted-foreground">Trial Start: </span>
                                <span>{user.trialStartsAt ? new Date(user.trialStartsAt).toLocaleString() : "—"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Trial End: </span>
                                <span className={cn(isUrgent && "text-red-500 font-medium")}>
                                  {user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleString() : "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Created: </span>
                                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Last Login: </span>
                                <span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Follow-up Count: </span>
                              <span>{user.followUpCount} sent</span>
                              <span className="text-muted-foreground ml-4">Payment Attempts: </span>
                              <span>{user.paymentCount}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Expired Trials ───────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Expired Trials ({data.expired.length})
              </CardTitle>
              <CardDescription>
                Users whose 3-day trial has ended. Send re-engagement offers or grant extensions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredExpired.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No expired trials</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-2.5">User</div>
                    <div className="col-span-1.5">Expired</div>
                    <div className="col-span-1.5">Days Since</div>
                    <div className="col-span-1">Onboarding</div>
                    <div className="col-span-1.5">Payments</div>
                    <div className="col-span-4">Actions</div>
                  </div>

                  {filteredExpired.map((user) => {
                    const daysSince = user.trialEndsAt
                      ? Math.ceil((Date.now() - new Date(user.trialEndsAt).getTime()) / (1000 * 60 * 60 * 24))
                      : 0

                    return (
                      <div key={user.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors items-center">
                        <div className="col-span-2.5 flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white font-bold text-xs shrink-0">
                            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>

                        <div className="col-span-1.5">
                          <span className="text-xs text-muted-foreground">
                            {user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleDateString() : "—"}
                          </span>
                        </div>

                        <div className="col-span-1.5">
                          <Badge variant="destructive" className="text-[10px]">
                            {daysSince}d ago
                          </Badge>
                        </div>

                        <div className="col-span-1">
                          <Badge variant={user.onboardingCompleted ? "default" : "outline"} className={cn(
                            "text-[10px]",
                            user.onboardingCompleted ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "text-muted-foreground"
                          )}>
                            {user.onboardingCompleted ? "Done" : "—"}
                          </Badge>
                        </div>

                        <div className="col-span-1.5">
                          <span className="text-xs text-muted-foreground">
                            {user.paymentCount > 0 ? `${user.paymentCount} attempt(s)` : "None"}
                          </span>
                        </div>

                        <div className="col-span-4">
                          <div className="flex gap-1.5 flex-wrap">
                            {/* Reactivate with grant */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 text-emerald-600 border-emerald-500/30"
                              disabled={runningAction === `grantPermanentAccess-${user.id}`}
                              onClick={() => handleAction("grantPermanentAccess", user.id)}
                            >
                              {runningAction === `grantPermanentAccess-${user.id}`
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <><CheckCircle2 className="h-3 w-3 mr-1" /> Reactivate</>
                              }
                            </Button>

                            {/* Extend trial */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2"
                              disabled={runningAction === `extendTrial-${user.id}`}
                              onClick={() => handleAction("extendTrial", user.id)}
                            >
                              {runningAction === `extendTrial-${user.id}`
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <><Clock className="h-3 w-3 mr-1" /> +7d</>
                              }
                            </Button>

                            {/* Send re-engagement */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] px-2"
                              disabled={runningAction === `followup-${user.id}-d+3`}
                              onClick={() => handleSendFollowUp(user.id, "d+3")}
                            >
                              {runningAction === `followup-${user.id}-d+3`
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Mail className="h-3 w-3 mr-1" />
                              }
                              Re-engage
                            </Button>

                            {/* Final offer */}
                            {daysSince >= 7 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px] px-2 text-amber-600"
                                disabled={runningAction === `followup-${user.id}-d+7`}
                                onClick={() => handleSendFollowUp(user.id, "d+7")}
                              >
                                {runningAction === `followup-${user.id}-d+7`
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Zap className="h-3 w-3 mr-1" />
                                }
                                Final Offer
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Converted Users ──────────────────────────── */}
          {data.converted.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Converted to Paid ({data.converted.length})
                </CardTitle>
                <CardDescription>
                  Users who upgraded from trial to a paid subscription
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-3">User</div>
                    <div className="col-span-2">Plan</div>
                    <div className="col-span-2">Converted</div>
                    <div className="col-span-2">Days on Trial</div>
                    <div className="col-span-3">Status</div>
                  </div>
                  {data.converted.map((user) => {
                    const daysOnTrial = user.trialStartsAt && user.trialEndsAt
                      ? Math.ceil((new Date(user.trialEndsAt).getTime() - new Date(user.trialStartsAt).getTime()) / (1000 * 60 * 60 * 24))
                      : "—"
                    return (
                      <div key={user.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors items-center border border-emerald-500/10">
                        <div className="col-span-3 flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-xs shrink-0">
                            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Badge variant="default" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            {user.tier} {user.plan ? `(${user.plan})` : ""}
                          </Badge>
                        </div>
                        <div className="col-span-2">
                          <span className="text-xs text-muted-foreground">
                            {user.trialEndsAt ? new Date(user.trialEndsAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-sm font-medium">{daysOnTrial}</span>
                          <span className="text-xs text-muted-foreground ml-1">days</span>
                        </div>
                        <div className="col-span-3">
                          <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Conversion Timeline ──────────────────────── */}
          {data.converted.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Conversion Timeline
                </CardTitle>
                <CardDescription>
                  Average time from trial start to paid conversion: <strong>{data.stats.avgDaysOnTrial} days</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.converted.slice(0, 10).map((user, i) => {
                    const daysOnTrial = user.trialStartsAt && user.trialEndsAt
                      ? Math.ceil((new Date(user.trialEndsAt).getTime() - new Date(user.trialStartsAt).getTime()) / (1000 * 60 * 60 * 24))
                      : 3
                    const widthPct = Math.min(100, (daysOnTrial / 30) * 100)
                    return (
                      <div key={user.id} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6 shrink-0 text-right">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs truncate max-w-[200px]">{user.name}</span>
                            <span className="text-[10px] text-muted-foreground">{daysOnTrial} days → {user.tier}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Loading / Error ─────────────────────────────── */}
      {loading && !data && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="shimmer h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {error && !data && (
        <div className="text-center py-20">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to Load Trial Data</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </div>
      )}
    </div>
  )
}
