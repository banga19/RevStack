"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAbac } from "@/lib/use-abac"
import { cn } from "@/lib/utils"
import {
  Shield,
  ShieldAlert,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  Brain,
  Play,
  Zap,
  ListTodo,
  BarChart3,
  Activity,
  Database,
  HardDrive,
  Send,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Users,
  Globe,
  Mail,
  MessageSquare,
  FileText,
  Timer,
  AlertCircle,
} from "lucide-react"

// ============================================================
// Types
// ============================================================

interface QueueStatus {
  name: string
  counts: { waiting: number; active: number; completed: number; failed: number; delayed: number }
  total: number
  workerRunning: boolean
  redisConnected: boolean
  error?: string
}

interface HermesRunRecord {
  id: string
  taskType: string
  status: string
  leadsProcessed: number | null
  messagesQueued: number | null
  errorMessage: string | null
  userId: string | null
  createdAt: string
  completedAt: string | null
  inputPreview: string | null
  outputPreview: string | null
}

interface Aggregates {
  byTaskType: { taskType: string; count: number; lastRun: string | null }[]
  byStatus: { status: string; count: number }[]
  totalRuns: number
}

interface QueueStatusResponse {
  queue: QueueStatus
  recentJobs: any[]
  runs: HermesRunRecord[]
  aggregates: Aggregates
}

// ============================================================
// Helpers
// ============================================================

const TASK_TYPE_LABELS: Record<string, string> = {
  qualify_leads: "Qualify Leads",
  send_followups: "Send Follow-ups",
  onboard_clients: "Onboard Clients",
  generate_report: "Generate Report",
  custom: "Custom",
}

const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  qualify_leads: <Users className="h-4 w-4 text-blue-500" />,
  send_followups: <Send className="h-4 w-4 text-amber-500" />,
  onboard_clients: <Globe className="h-4 w-4 text-emerald-500" />,
  generate_report: <FileText className="h-4 w-4 text-purple-500" />,
  custom: <Sparkles className="h-4 w-4 text-primary" />,
}

function statusBadge(status: string): { label: string; variant: "default" | "outline" | "destructive" | "secondary" | "success" | "warning" | "info"; className?: string } {
  switch (status) {
    case "completed":
      return { label: "Completed", variant: "success", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" }
    case "running":
      return { label: "Running", variant: "warning", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" }
    case "pending":
      return { label: "Pending", variant: "outline", className: "text-muted-foreground" }
    case "failed":
      return { label: "Failed", variant: "destructive" }
    default:
      return { label: status, variant: "secondary" }
  }
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

export default function HermesAdminPage() {
  const { isAdmin, isLoading: abacLoading } = useAbac()
  const router = useRouter()

  // ── Data state ─────────────────────────────────────────────
  const [data, setData] = useState<QueueStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Filters ────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)

  // ── Action state ───────────────────────────────────────────
  const [runningAction, setRunningAction] = useState<string | null>(null)
  const [leadIdInput, setLeadIdInput] = useState("")
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // ── Data fetching ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/hermes/queue/status?limit=50")
      if (res.status === 401) { router.push("/dashboard"); return }
      if (res.status === 403) { router.push("/admin"); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError("Failed to load Hermes queue status")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [router])

  // ── Actions ────────────────────────────────────────────────
  const runAction = async (action: string, body?: any) => {
    setRunningAction(action)
    setActionFeedback(null)
    try {
      const url =
        action === "sweep"
          ? "/api/hermes/run?sweep=true"
          : action === "retry" && body?.jobId
          ? `/api/hermes/run?retry=${body.jobId}`
          : "/api/hermes/run"

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body?.leadId ? JSON.stringify({ leadId: body.leadId }) : undefined,
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Action failed")

      setActionFeedback({ type: "success", message: result.message || `${action} triggered successfully` })
      if (body?.leadId) setLeadIdInput("")
      setTimeout(() => loadData(), 500)
    } catch (e: any) {
      setActionFeedback({ type: "error", message: e.message || "Action failed" })
    } finally {
      setRunningAction(null)
    }
  }

  // ── Initial load ───────────────────────────────────────────
  useEffect(() => {
    if (abacLoading) return
    if (!isAdmin) { router.push("/dashboard"); return }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abacLoading, isAdmin])

  // ── Derived data ───────────────────────────────────────────
  const filteredRuns = data?.runs.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (typeFilter !== "all" && r.taskType !== typeFilter) return false
    return true
  }) ?? []

  const successRate = data
    ? data.aggregates.byStatus.find((s) => s.status === "completed")?.count ?? 0
    : 0
  const totalWithStatus = data
    ? data.aggregates.byStatus.reduce((sum, s) => sum + s.count, 0)
    : 1

  // ── Guard ──────────────────────────────────────────────────
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
      {/* ================================================================ */}
      {/* Header */}
      {/* ================================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-amber-500" />
            Hermes Queue Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            BullMQ job queue for the autonomous sales pipeline — monitor, trigger, and retry jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => loadData()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Action feedback toast */}
      {actionFeedback && (
        <div
          className={cn(
            "rounded-lg border p-4 text-sm flex items-center gap-3 transition-all",
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

      {/* ================================================================ */}
      {/* Queue Status Cards */}
      {/* ================================================================ */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="h-5 w-5 text-blue-500" /></div>
            <div>
              <div className="text-xl font-bold">{data?.queue.counts.waiting ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground">Waiting</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Activity className="h-5 w-5 text-amber-500" /></div>
            <div>
              <div className="text-xl font-bold">{data?.queue.counts.active ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
            <div>
              <div className="text-xl font-bold">{data?.queue.counts.completed ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><XCircle className="h-5 w-5 text-red-500" /></div>
            <div>
              <div className="text-xl font-bold">{data?.queue.counts.failed ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground">Failed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><Timer className="h-5 w-5 text-purple-500" /></div>
            <div>
              <div className="text-xl font-bold">{data?.queue.counts.delayed ?? "—"}</div>
              <div className="text-[10px] text-muted-foreground">Delayed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              data?.queue.workerRunning ? "bg-emerald-500/10" : "bg-muted"
            )}>
              <Brain className={cn(
                "h-5 w-5",
                data?.queue.workerRunning ? "text-emerald-500" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <div className={cn(
                "text-sm font-bold",
                data?.queue.workerRunning ? "text-emerald-600" : "text-muted-foreground"
              )}>
                {data?.queue.workerRunning ? "Running" : "Off"}
              </div>
              <div className="text-[10px] text-muted-foreground">Worker</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary row */}
      {data && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-bold">{data.aggregates.totalRuns}</span>
                <span className="text-muted-foreground ml-1">total runs</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div className="text-sm">
                <span className="font-bold">{data.queue.counts.completed}</span>
                <span className="text-muted-foreground ml-1">completed jobs</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm flex items-center gap-2">
                <span className="font-bold">{Math.round((successRate / Math.max(totalWithStatus, 1)) * 100)}%</span>
                <span className="text-muted-foreground">success rate</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <span className={cn(
                  "font-bold",
                  data.queue.redisConnected ? "text-emerald-600" : "text-red-500"
                )}>
                  {data.queue.redisConnected ? "Connected" : "Disconnected"}
                </span>
                <span className="text-muted-foreground ml-1">Redis</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queue usage bar */}
      {data && data.queue.total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Queue utilization</span>
              <span>{data.queue.counts.waiting} waiting · {data.queue.counts.active} active</span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
              {data.queue.counts.completed > 0 && (
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(data.queue.counts.completed / data.queue.total) * 100}%` }}
                />
              )}
              {data.queue.counts.failed > 0 && (
                <div
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${(data.queue.counts.failed / data.queue.total) * 100}%` }}
                />
              )}
              {data.queue.counts.waiting > 0 && (
                <div
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${(data.queue.counts.waiting / data.queue.total) * 100}%` }}
                />
              )}
              {data.queue.counts.active > 0 && (
                <div
                  className="bg-amber-500 transition-all duration-500"
                  style={{ width: `${(data.queue.counts.active / data.queue.total) * 100}%` }}
                />
              )}
              {data.queue.counts.delayed > 0 && (
                <div
                  className="bg-purple-500 transition-all duration-500"
                  style={{ width: `${(data.queue.counts.delayed / data.queue.total) * 100}%` }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* Manual Controls */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Manual Controls
          </CardTitle>
          <CardDescription>
            Trigger Hermes operations directly — sweep all unprocessed leads, retry failed jobs, or process a single lead
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Sweep Leads */}
            <Button
              className="h-auto flex-col items-start gap-2 p-4"
              variant="outline"
              disabled={runningAction === "sweep"}
              onClick={() => runAction("sweep")}
            >
              <div className="flex items-center gap-2">
                {runningAction === "sweep" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <ListTodo className="h-4 w-4 text-blue-500" />
                )}
                <span className="text-xs font-medium uppercase tracking-wide">Sweep All Leads</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Enqueue all new &amp; qualified leads for processing
              </p>
            </Button>

            {/* Process Single Lead */}
            <div className="flex flex-col gap-2 p-4 rounded-lg border bg-card/20">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium uppercase tracking-wide">Process Single Lead</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Lead ID (cuid)..."
                  value={leadIdInput}
                  onChange={(e) => setLeadIdInput(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={!leadIdInput.trim() || runningAction === "single"}
                  onClick={() => runAction("single", { leadId: leadIdInput.trim() })}
                >
                  {runningAction === "single" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Retry Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="h-auto flex-col items-start gap-2 p-4"
                  variant="outline"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium uppercase tracking-wide">Retry Failed Job</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Re-enqueue a job by original job ID with more attempts
                  </p>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Retry Failed Job</DialogTitle>
                  <DialogDescription>
                    Enter the ID of a failed BullMQ job to re-enqueue it with 5 retry attempts.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Job ID</label>
                    <Input placeholder="BullMQ job ID..." id="retry-job-id" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.getElementById("retry-job-id") as HTMLInputElement
                        if (input?.value.trim()) runAction("retry", { jobId: input.value.trim() })
                      }}
                      disabled={runningAction === "retry"}
                    >
                      {runningAction === "retry" ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Retrying...</>
                      ) : (
                        <><RefreshCw className="h-4 w-4 mr-2" /> Retry</>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Job Type Breakdown */}
      {/* ================================================================ */}
      {data && data.aggregates.byTaskType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Job Type Breakdown
            </CardTitle>
            <CardDescription>Runs grouped by task type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {data.aggregates.byTaskType.map((t) => {
                const totalRuns = data.aggregates.byStatus.reduce((sum, s) => sum + s.count, 0) || 1
                const pct = Math.round((t.count / totalRuns) * 100)
                return (
                  <div key={t.taskType} className="p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center gap-2 mb-2">
                      {TASK_TYPE_ICONS[t.taskType] || <FileText className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm font-medium">{TASK_TYPE_LABELS[t.taskType] || t.taskType}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-lg font-bold">{t.count}</span>
                      <span className="text-xs text-muted-foreground">runs ({pct}%)</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    {t.lastRun && (
                      <p className="text-[10px] text-muted-foreground mt-1">Last: {timeAgo(t.lastRun)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* Run Records */}
      {/* ================================================================ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              Run Records
            </CardTitle>
            <CardDescription>
              {data?.aggregates.totalRuns ?? 0} total Hermes runs
              {filteredRuns.length < (data?.runs.length ?? 0) && ` · ${filteredRuns.length} shown`}
            </CardDescription>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>{data?.aggregates.byTaskType?.map((t) => (
                      <SelectItem key={t.taskType} value={t.taskType}>
                        {TASK_TYPE_LABELS[t.taskType] || t.taskType}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="shimmer h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="text-center py-10">
              <Brain className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {data?.runs.length === 0
                  ? "No Hermes runs yet — trigger a sweep to get started"
                  : "No runs match the current filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Column headers */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">ID</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-1.5">Status</div>
                <div className="col-span-1.5">Processed</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-2">Completed</div>
                <div className="col-span-2.5">Error / Input</div>
              </div>

              {filteredRuns.map((run) => {
                const badge = statusBadge(run.status)
                const isExpanded = expandedRunId === run.id
                return (
                  <div key={run.id}>
                    <button
                      onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                      className="w-full grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left items-center"
                    >
                      <div className="col-span-1 flex items-center gap-1">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground truncate" title={run.id}>
                          {run.id.slice(0, 6)}...
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5">
                        {TASK_TYPE_ICONS[run.taskType] || <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="text-sm">{TASK_TYPE_LABELS[run.taskType] || run.taskType}</span>
                      </div>
                      <div className="col-span-1.5">
                        <Badge variant={badge.variant} className={cn("text-[10px]", badge.className)}>
                          {run.status === "running" && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />}
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="col-span-1.5">
                        <span className="text-sm text-muted-foreground">{run.leadsProcessed ?? "—"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground" title={new Date(run.createdAt).toLocaleString()}>
                          {timeAgo(run.createdAt)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground">
                          {run.completedAt ? timeAgo(run.completedAt) : "—"}
                        </span>
                      </div>
                      <div className="col-span-2 min-w-0">
                        {run.status === "failed" && run.errorMessage ? (
                          <span className="text-[10px] text-red-500 truncate block" title={run.errorMessage}>
                            {run.errorMessage}
                          </span>
                        ) : run.inputPreview ? (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {run.inputPreview}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="mx-4 mb-2 p-3 rounded-lg border bg-card/30 space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Run ID: </span>
                            <span className="font-mono">{run.id}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">User ID: </span>
                            <span className="font-mono">{run.userId ? `${run.userId.slice(0, 8)}...` : "—"}</span>
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <span className="text-muted-foreground">Created: </span>
                          {new Date(run.createdAt).toLocaleString()}
                          {run.completedAt && (
                            <>
                              <span className="text-muted-foreground ml-4">Completed: </span>
                              {new Date(run.completedAt).toLocaleString()}
                            </>
                          )}
                        </div>
                        {run.inputPreview && (
                          <div>
                            <span className="text-muted-foreground">Input: </span>
                            <pre className="mt-1 p-2 rounded bg-muted/50 text-[10px] overflow-x-auto whitespace-pre-wrap">
                              {run.inputPreview}
                            </pre>
                          </div>
                        )}
                        {run.outputPreview && (
                          <div>
                            <span className="text-muted-foreground">Output: </span>
                            <pre className="mt-1 p-2 rounded bg-muted/50 text-[10px] overflow-x-auto whitespace-pre-wrap">
                              {run.outputPreview}
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

      {/* ================================================================ */}
      {/* Footer note */}
      {/* ================================================================ */}
      <p className="text-xs text-muted-foreground text-center">
        Hermes queue runs on BullMQ with Redis. The worker auto-starts in development; in production,
        set <code className="text-primary bg-primary/10 px-1 rounded">RUN_WORKER=true</code>.
      </p>
    </div>
  )
}
