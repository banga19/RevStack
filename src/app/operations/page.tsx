"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Brain,
  Zap,
  Play,
  Square,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
  BarChart3,
  Globe,
  Shield,
  Users,
  DollarSign,
  Sparkles,
  ArrowUpRight,
  Target,
} from "lucide-react"

// ============================================================
// Types (mirrored from API responses)
// ============================================================

type AgentType = "lead" | "trade" | "compliance" | "onboarding" | "revenue"

interface APISession {
  id: string
  config: {
    duration: number
    objective: string
    agents: AgentType[]
    checkInterval: number
  }
  status: "idle" | "running" | "paused" | "completed"
  startTime?: number
  endTime?: number
  tasks: Array<{
    id: string
    agentType: AgentType
    action: string
    status: "pending" | "running" | "completed" | "failed"
    result?: string
    error?: string
    completedAt?: number
  }>
  reports: Array<{
    id: string
    agentType: AgentType
    summary: string
    actions: Array<{ action: string; result: string; impact: string }>
    metrics: Record<string, number>
    insights: string[]
    nextActions: string[]
  }>
  progress: number
  currentAgent?: AgentType
  completedCount: number
  totalActions: number
  errors: number
}

interface APIReport {
  id: string
  agentType: AgentType
  timestamp: number
  title: string
  summary: string
  actions: Array<{ action: string; result: string; impact: string }>
  metrics: Record<string, number>
  insights: string[]
  nextActions: string[]
}

const AGENT_CONFIGS: Record<AgentType, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  lead: { label: "Lead Agent", icon: <Users className="h-4 w-4" />, color: "text-blue-500 bg-blue-500/10", description: "Qualifies leads, manages follow-ups, routes to pipeline" },
  trade: { label: "Trade Agent", icon: <Globe className="h-4 w-4" />, color: "text-emerald-500 bg-emerald-500/10", description: "Manages corridors, pricing, trade matching" },
  compliance: { label: "Compliance Agent", icon: <Shield className="h-4 w-4" />, color: "text-amber-500 bg-amber-500/10", description: "Tracks certifications, expiry alerts, documentation" },
  onboarding: { label: "Onboarding Agent", icon: <Users className="h-4 w-4" />, color: "text-purple-500 bg-purple-500/10", description: "Client onboarding workflows, document collection" },
  revenue: { label: "Revenue Agent", icon: <DollarSign className="h-4 w-4" />, color: "text-emerald-500 bg-emerald-500/10", description: "Revenue tracking, success fee calculation, forecasting" },
}

const DURATION_OPTIONS = [
  { value: "3600000", label: "1 hour" },
  { value: "7200000", label: "2 hours" },
  { value: "14400000", label: "4 hours" },
  { value: "28800000", label: "8 hours" },
  { value: "43200000", label: "12 hours" },
  { value: "86400000", label: "24 hours" },
  { value: "604800000", label: "7 days" },
]

const GOD_MODE_OBJECTIVES = [
  "Qualify all new leads and send follow-up sequences",
  "Process all pending compliance renewals and alerts",
  "Run end-of-month revenue reconciliation and invoicing",
  "Complete client onboarding for all new signups",
  "Scan trade corridors for new matching opportunities",
  "Full system sweep — all agents, all pending tasks",
]

export default function OperationsPage() {
  const [sessions, setSessions] = useState<APISession[]>([])
  const [reports, setReports] = useState<APIReport[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [godModeDialogOpen, setGodModeDialogOpen] = useState(false)
  const [godModeConfig, setGodModeConfig] = useState({
    duration: "3600000",
    objective: GOD_MODE_OBJECTIVES[0],
    agents: ["lead", "trade", "revenue"] as AgentType[],
  })
  const [starting, setStarting] = useState(false)
  const [selectedReport, setSelectedReport] = useState<APIReport | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Load sessions from API
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/god-mode")
      const data = await res.json()
      setSessions(data.sessions || [])
      setReports(data.reports || [])
    } catch (e) {
      console.error("Failed to load sessions:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Start/stop polling based on running sessions
  const hasRunningSessions = sessions.some((s) => s.status === "running")

  useEffect(() => {
    setMounted(true)
    loadSessions()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [loadSessions])

  useEffect(() => {
    if (hasRunningSessions && !pollRef.current) {
      pollRef.current = setInterval(loadSessions, 3000)
    } else if (!hasRunningSessions && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [hasRunningSessions, loadSessions])

  const startGodMode = async () => {
    setStarting(true)
    try {
      const res = await fetch("/api/god-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(godModeConfig),
      })
      if (res.ok) {
        setGodModeDialogOpen(false)
        await loadSessions()
      }
    } catch (e) {
      console.error("Failed to start God Mode:", e)
    } finally {
      setStarting(false)
    }
  }

  const controlGodMode = async (sessionId: string, action: "pause" | "resume" | "stop") => {
    try {
      const res = await fetch("/api/god-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action }),
      })
      if (res.ok) {
        await loadSessions()
      }
    } catch (e) {
      console.error(`Failed to ${action} God Mode:`, e)
    }
  }

  const toggleAgent = (agent: AgentType) => {
    setGodModeConfig((prev) => ({
      ...prev,
      agents: prev.agents.includes(agent)
        ? prev.agents.filter((a) => a !== agent)
        : [...prev.agents, agent],
    }))
  }

  if (!mounted) return null

  const runningSession = sessions.find((s) => s.status === "running")
  const pausedSession = sessions.find((s) => s.status === "paused")
  const activeSession = runningSession || pausedSession
  const activeCount = sessions.filter((s) => s.status === "running").length
  const completedTasksAll = sessions.reduce((sum, s) => sum + s.completedCount, 0)
  const totalTasksAll = sessions.reduce((sum, s) => sum + s.totalActions, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Operations Center</h1>
              <p className="text-muted-foreground mt-1">
                Autonomous AI agents handling your B2B trade operations 24/7
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {runningSession ? (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="animate-pulse">
                <Activity className="h-3.5 w-3.5 mr-1" />
                God Mode Active
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => controlGodMode(runningSession.id, "pause")}
              >
                <Pause className="h-4 w-4 mr-1" /> Pause
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => controlGodMode(runningSession.id, "stop")}
              >
                <Square className="h-4 w-4 mr-1" /> Stop
              </Button>
            </div>
          ) : pausedSession ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                <Pause className="h-3.5 w-3.5 mr-1" />
                Paused
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => controlGodMode(pausedSession.id, "resume")}
              >
                <Play className="h-4 w-4 mr-1" /> Resume
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => controlGodMode(pausedSession.id, "stop")}
              >
                <Square className="h-4 w-4 mr-1" /> Stop
              </Button>
            </div>
          ) : (
            <Button onClick={() => setGodModeDialogOpen(true)}>
              <Zap className="h-4 w-4 mr-2" /> Activate God Mode
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">God Mode Sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTasksAll}</p>
              <p className="text-xs text-muted-foreground">Tasks Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reports.length}</p>
              <p className="text-xs text-muted-foreground">Agent Reports</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            AI Agents
          </CardTitle>
          <CardDescription>
            Specialized autonomous agents handling different aspects of your trade operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(AGENT_CONFIGS) as [AgentType, typeof AGENT_CONFIGS[AgentType]][]).map(([type, config]) => {
              const isActive = runningSession?.currentAgent === type
              const agentTasks = sessions.flatMap((s) => s.tasks.filter((t) => t.agentType === type))
              const agentCompleted = agentTasks.filter((t) => t.status === "completed").length
              const agentFailed = agentTasks.filter((t) => t.status === "failed").length

              return (
                <div
                  key={type}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-300",
                    isActive
                      ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/10"
                      : "border-border/50 hover:border-primary/20"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-2 rounded-lg", config.color)}>
                        {config.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground">{type}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isActive ? "bg-emerald-500 animate-pulse" : "bg-muted"
                    )} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{config.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {agentTasks.length > 0
                        ? `${agentCompleted} done, ${agentFailed} failed`
                        : "No tasks yet"}
                    </span>
                    {isActive && (
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Running
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active/Paused Session */}
      {activeSession && (
        <Card className={cn(
          "transition-all duration-300",
          activeSession.status === "running"
            ? "border-primary/30 bg-gradient-to-br from-primary/[0.03] to-transparent"
            : "border-amber-500/30"
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                {activeSession.status === "running" ? (
                  <Activity className="h-5 w-5 text-primary animate-pulse" />
                ) : (
                  <Pause className="h-5 w-5 text-amber-500" />
                )}
                {activeSession.status === "running" ? "Active" : "Paused"} God Mode Session
              </CardTitle>
              <Badge className={cn(
                activeSession.status === "running"
                  ? "bg-primary text-primary-foreground animate-pulse"
                  : "bg-amber-500/20 text-amber-500"
              )}>
                {activeSession.progress}% Complete
              </Badge>
            </div>
            <CardDescription>{activeSession.config.objective}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={activeSession.progress} className="h-2" />
            <div className="grid gap-3">
              {activeSession.tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all",
                    task.status === "running" && "bg-primary/5 ring-1 ring-primary/20",
                    task.status === "completed" && "bg-muted/20",
                    task.status === "failed" && "bg-destructive/5",
                    task.status === "pending" && "opacity-50"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    task.status === "running" && AGENT_CONFIGS[task.agentType]?.color || "bg-muted",
                    task.status === "completed" && "bg-emerald-500/10",
                    task.status === "failed" && "bg-destructive/10"
                  )}>
                    {task.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {task.status === "completed" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {task.status === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
                    {task.status === "pending" && <Clock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded",
                        AGENT_CONFIGS[task.agentType]?.color
                      )}>
                        {task.agentType}
                      </span>
                      <p className="text-sm truncate">{task.action}</p>
                    </div>
                    {task.result && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{task.result}</p>
                    )}
                    {task.error && (
                      <p className="text-xs text-destructive mt-1">{task.error}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px] capitalize",
                    task.status === "running" && "border-primary/30 text-primary",
                    task.status === "completed" && "border-emerald-500/30 text-emerald-500",
                    task.status === "failed" && "border-destructive/30 text-destructive",
                  )}>
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Reports */}
      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Agent Reports
            </CardTitle>
            <CardDescription>Autonomous operation summaries from your AI agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reports.slice(0, 10).map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="w-full text-left p-4 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-muted/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      AGENT_CONFIGS[report.agentType]?.color
                    )}>
                      {AGENT_CONFIGS[report.agentType]?.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{report.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.actions.length} actions · {new Date(report.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{report.summary}</p>
                {report.nextActions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {report.nextActions.slice(0, 2).map((action, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Next: {action}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {!activeSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Quick God Mode Actions
            </CardTitle>
            <CardDescription>One-click autonomous operations without check-ins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {GOD_MODE_OBJECTIVES.map((objective, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setGodModeConfig((prev) => ({ ...prev, objective }))
                    setGodModeDialogOpen(true)
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all text-left"
                >
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">{objective}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && sessions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Brain className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to Operations Center</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Your autonomous AI agents are ready. Activate God Mode to let them handle lead
              qualification, trade operations, compliance tracking, and revenue management
              without any human intervention.
            </p>
            <Button size="lg" onClick={() => setGodModeDialogOpen(true)}>
              <Zap className="h-5 w-5 mr-2" /> Activate God Mode
            </Button>
          </CardContent>
        </Card>
      )}

      {/* God Mode Dialog */}
      <Dialog open={godModeDialogOpen} onOpenChange={setGodModeDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Activate God Mode</DialogTitle>
                <DialogDescription>
                  Set your autonomous AI agents loose. They plan, execute, and report — no check-ins needed.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Objective</Label>
              <Select
                value={godModeConfig.objective}
                onValueChange={(v) => setGodModeConfig((prev) => ({ ...prev, objective: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select objective" />
                </SelectTrigger>
                <SelectContent>
                  {GOD_MODE_OBJECTIVES.map((obj) => (
                    <SelectItem key={obj} value={obj}>{obj}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={godModeConfig.duration}
                onValueChange={(v) => setGodModeConfig((prev) => ({ ...prev, duration: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Agents work autonomously for this duration. Longer durations unlock lower hourly rates.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Agents to activate</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.entries(AGENT_CONFIGS) as [AgentType, typeof AGENT_CONFIGS[AgentType]][]).map(([type, config]) => (
                  <label
                    key={type}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      godModeConfig.agents.includes(type)
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg", config.color)}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{type}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={godModeConfig.agents.includes(type)}
                      onChange={() => toggleAgent(type)}
                      className="w-4 h-4 rounded border-muted-foreground/30"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                Estimated Pricing
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>God Mode Rate: <strong>$19/hr</strong> (or <strong>$6/hr</strong> for 7-day sessions)</p>
                <p>Success Fee: <strong>10-20%</strong> of revenue generated through platform</p>
                <p>Base subscription: <strong>$50/mo</strong> (Starter), <strong>$200/mo</strong> (Growth), <strong>$500/mo</strong> (Enterprise)</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={startGodMode} disabled={starting || godModeConfig.agents.length === 0}>
              {starting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating...</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" /> Activate God Mode</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(o) => !o && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", AGENT_CONFIGS[selectedReport.agentType]?.color)}>
                    {AGENT_CONFIGS[selectedReport.agentType]?.icon}
                  </div>
                  <div>
                    <DialogTitle>{selectedReport.title}</DialogTitle>
                    <DialogDescription>
                      {new Date(selectedReport.timestamp).toLocaleString()}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-sm leading-relaxed">{selectedReport.summary}</p>
                </div>

                {selectedReport.actions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Actions Taken</h4>
                    <div className="space-y-2">
                      {selectedReport.actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/10">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{action.action}</p>
                            <p className="text-xs text-muted-foreground">{action.result}</p>
                            <p className="text-xs text-muted-foreground">Impact: {action.impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(selectedReport.metrics).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Metrics</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(selectedReport.metrics).map(([key, value]) => (
                        <div key={key} className="p-3 rounded-lg bg-muted/20 text-center">
                          <p className="text-lg font-bold">{value}</p>
                          <p className="text-xs text-muted-foreground capitalize">{key}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.insights.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Insights Discovered</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedReport.insights.map((insight, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {insight}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.nextActions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Recommended Next Actions</h4>
                    <ol className="space-y-2">
                      {selectedReport.nextActions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
