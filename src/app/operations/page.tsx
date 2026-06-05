"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
  Rocket,
  MessageSquareText,
  Wand2,
  Send,
  BookOpen,
  ChevronRight,
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
    customObjective: "",
    agents: ["lead", "trade", "compliance", "onboarding", "revenue"] as AgentType[],
  })
  const [starting, setStarting] = useState(false)
  const [selectedReport, setSelectedReport] = useState<APIReport | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Hermes state
  const [hermesOperations, setHermesOperations] = useState<any[]>([])
  const [hermesSystemStatus, setHermesSystemStatus] = useState<any>(null)
  const [hermesLoading, setHermesLoading] = useState(false)
  const [hermesRunning, setHermesRunning] = useState(false)
  const [hermesDialogOpen, setHermesDialogOpen] = useState(false)
  const [hermesObjective, setHermesObjective] = useState("")
  const [selectedHermesOp, setSelectedHermesOp] = useState<any | null>(null)

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
      // Use custom objective if provided, otherwise use the preset
      const objective = godModeConfig.customObjective.trim()
        ? godModeConfig.customObjective
        : godModeConfig.objective

      const res = await fetch("/api/god-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: parseInt(godModeConfig.duration) || 3600000,
          objective,
          agents: godModeConfig.agents,
        }),
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

  // Load Hermes operations
  const loadHermes = useCallback(async () => {
    setHermesLoading(true)
    try {
      const res = await fetch("/api/hermes")
      if (res.ok) {
        const data = await res.json()
        setHermesOperations(data.operations || [])
        setHermesSystemStatus(data.systemStatus || null)
      }
    } catch (e) {
      console.error("Failed to load Hermes operations:", e)
    } finally {
      setHermesLoading(false)
    }
  }, [])

  // Run a Hermes operation
  const runHermesOperation = async (action: string, objective?: string) => {
    setHermesRunning(true)
    try {
      const res = await fetch("/api/hermes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          objective: objective || undefined,
        }),
      })
      if (res.ok) {
        setHermesDialogOpen(false)
        setHermesObjective("")
        await loadHermes()
      }
    } catch (e) {
      console.error(`Failed to run Hermes ${action}:`, e)
    } finally {
      setHermesRunning(false)
    }
  }

  // Poll Hermes operations if any are running
  const hasRunningHermes = hermesOperations.some((op) => op.status === "running" || op.status === "planning")
  useEffect(() => {
    if (hasRunningHermes) {
      const timer = setInterval(loadHermes, 5000)
      return () => clearInterval(timer)
    }
  }, [hasRunningHermes, loadHermes])

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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={starting}
                onClick={async () => {
                  setStarting(true)
                  try {
                    const res = await fetch("/api/god-mode", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        duration: 86400000,
                        objective: "Full system sweep — all agents, all pending tasks",
                        agents: ["lead", "trade", "compliance", "onboarding", "revenue"],
                      }),
                    })
                    if (res.ok) await loadSessions()
                  } catch (e) {
                    console.error("Quick deploy failed:", e)
                  } finally {
                    setStarting(false)
                  }
                }}
              >
                {starting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deploying...</>
                ) : (
                  <><Rocket className="h-4 w-4 mr-2" /> Quick Deploy All</>
                )}
              </Button>
              <Button onClick={() => setGodModeDialogOpen(true)}>
                <Zap className="h-4 w-4 mr-2" /> Custom Deploy
              </Button>
            </div>
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

      {/* ================================================================= */}
      {/* Hermes — Autonomous Operations Supervisor */}
      {/* ================================================================= */}
      <Card className="border-t-2 border-t-indigo-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/20">
                  <Send className="h-5 w-5 text-indigo-400" />
                </div>
                Hermes — Autonomous Operations Supervisor
                {hasRunningHermes && (
                  <Badge variant="outline" className="ml-2 text-indigo-500 border-indigo-500/30 animate-pulse">
                    <Activity className="h-3 w-3 mr-1" />
                    Running
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Context-aware multi-agent orchestrator using RAG + LangGraph. Hermes retrieves business
                context, plans a workflow across all integrated services, and stores insights for future runs.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={hermesRunning}
                onClick={() => runHermesOperation("lead-sweep")}
                className="border-indigo-500/30 hover:border-indigo-500/50"
              >
                {hermesRunning ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                )}
                Lead Sweep
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={hermesRunning}
                onClick={() => runHermesOperation("system-health")}
                className="border-indigo-500/30 hover:border-indigo-500/50"
              >
                {hermesRunning ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Activity className="h-3.5 w-3.5 mr-1.5" />
                )}
                System Health
              </Button>
              <Button
                size="sm"
                disabled={hermesRunning}
                onClick={() => setHermesDialogOpen(true)}
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Custom Operation
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadHermes}
                disabled={hermesLoading}
              >
                <Loader2 className={cn("h-3.5 w-3.5", hermesLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Status Bar */}
          {hermesSystemStatus && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-sm">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-indigo-400" />
                <span className="text-muted-foreground">{hermesSystemStatus.totalOperations} operations</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-muted-foreground">{hermesSystemStatus.insightsCount} insights</span>
              </div>
              {hermesSystemStatus.recentErrorCount > 0 && (
                <>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">{hermesSystemStatus.recentErrorCount} recent errors</span>
                  </div>
                </>
              )}
              {hermesSystemStatus.lastOperation && (
                <>
                  <div className="w-px h-4 bg-border" />
                  <span className="text-xs text-muted-foreground">
                    Last: {hermesSystemStatus.lastOperation.objective.substring(0, 50)}...
                  </span>
                </>
              )}
            </div>
          )}

          {/* Running Hermes Operation */}
          {hermesOperations.filter((op) => op.status === "running" || op.status === "planning").slice(0, 1).map((op) => (
            <div key={op.id} className="p-4 rounded-lg border border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.04] to-transparent">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                  <span className="text-sm font-medium">{op.status === "planning" ? "Planning" : "Executing"}</span>
                  <span className="text-xs text-muted-foreground">{op.objective.substring(0, 80)}{op.objective.length > 80 ? "..." : ""}</span>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">{op.status}</Badge>
              </div>
              {op.plannedActions?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {op.plannedActions.map((action: any, i: number) => {
                    const done = op.results?.some((r: any) => r.action?.agentType === action.agentType) || false
                    return (
                      <span
                        key={i}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border transition-all",
                          done
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse"
                        )}
                      >
                        {done ? <CheckCircle2 className="h-3 w-3 inline mr-0.5" /> : <Loader2 className="h-3 w-3 inline mr-0.5 animate-spin" />}
                        {action.agentType}
                      </span>
                    )
                  })}
                </div>
              )}
              <Progress value={op.results?.length > 0 ? (op.results.length / (op.plannedActions?.length || 1)) * 100 : 10} className="h-1" />
            </div>
          ))}

          {/* Completed Hermes Operations */}
          {hermesOperations.filter((op) => op.status === "completed" || op.status === "failed").slice(0, 5).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recent Operations
              </p>
              <div className="space-y-1.5">
                {hermesOperations.filter((op) => op.status === "completed" || op.status === "failed").slice(0, 5).map((op) => {
                  const successCount = op.results?.filter((r: any) => r.result?.success).length || 0
                  const totalCount = op.results?.length || 0
                  return (
                    <button
                      key={op.id}
                      onClick={() => setSelectedHermesOp(op)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-indigo-500/20 hover:bg-muted/30 transition-all group"
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg shrink-0",
                        op.status === "completed" ? "bg-emerald-500/10" : "bg-destructive/10"
                      )}>
                        {op.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{op.objective}</p>
                        <p className="text-xs text-muted-foreground">
                          {successCount}/{totalCount} actions · {new Date(op.startedAt).toLocaleString()}
                          {op.duration && ` · ${(op.duration / 1000).toFixed(0)}s`}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* No Hermes operations yet */}
          {!hermesLoading && hermesOperations.length === 0 && (
            <div className="text-center py-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/10 inline-flex mb-3">
                <Send className="h-8 w-8 text-indigo-400" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Hermes has not run any operations yet. Use the buttons above to run a lead sweep,
                system health check, or custom operation. Hermes uses RAG context from the knowledge
                base to plan the most effective agent workflow.
              </p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => runHermesOperation("lead-sweep")} disabled={hermesRunning}>
                  <Users className="h-3.5 w-3.5 mr-1.5" /> Run Lead Sweep
                </Button>
                <Button size="sm" variant="outline" onClick={() => runHermesOperation("system-health")} disabled={hermesRunning}>
                  <Activity className="h-3.5 w-3.5 mr-1.5" /> System Health
                </Button>
                <Button size="sm" variant="default" onClick={() => setHermesDialogOpen(true)}>
                  <Zap className="h-3.5 w-3.5 mr-1.5" /> Custom
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hermes Operation Detail Dialog */}
      <Dialog open={!!selectedHermesOp} onOpenChange={(o) => !o && setSelectedHermesOp(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedHermesOp && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    selectedHermesOp.status === "completed" ? "bg-emerald-500/10" : "bg-destructive/10"
                  )}>
                    {selectedHermesOp.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <DialogTitle>Hermes Operation Report</DialogTitle>
                    <DialogDescription>
                      {new Date(selectedHermesOp.startedAt).toLocaleString()}
                      {selectedHermesOp.completedAt && ` · ${Math.round((selectedHermesOp.completedAt - selectedHermesOp.startedAt) / 1000)}s duration`}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Objective */}
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Objective</p>
                  <p className="text-sm">{selectedHermesOp.objective}</p>
                </div>

                {/* Context */}
                {selectedHermesOp.context && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Retrieved Context</p>
                    <p className="text-xs text-muted-foreground bg-muted/20 p-2 rounded max-h-24 overflow-y-auto">
                      {selectedHermesOp.context}
                    </p>
                  </div>
                )}

                {/* Planned Actions */}
                {selectedHermesOp.plannedActions?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Planned Workflow ({selectedHermesOp.plannedActions.length} steps)</p>
                    <div className="space-y-1.5">
                      {selectedHermesOp.plannedActions.map((action: any, i: number) => {
                        const result = selectedHermesOp.results?.find((r: any) => r.action?.agentType === action.agentType)
                        const status = result?.result?.success ? "completed" : result ? "failed" : "pending"
                        return (
                          <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/10">
                            <span className={cn(
                              "flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 mt-0.5",
                              status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                              status === "failed" ? "bg-destructive/10 text-destructive" :
                              "bg-muted text-muted-foreground"
                            )}>{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] px-1 py-0.5 rounded font-medium uppercase">{action.agentType}</span>
                                <span className="text-sm">{action.action}</span>
                              </div>
                              {result?.result?.summary && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{result.result.summary}</p>
                              )}
                              {result?.result?.metrics && Object.keys(result.result.metrics).length > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {Object.entries(result.result.metrics).map(([k, v]) => `${k}: ${v}`).join(", ")}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className={cn(
                              "text-[9px] capitalize",
                              status === "completed" && "border-emerald-500/30 text-emerald-500",
                              status === "failed" && "border-destructive/30 text-destructive",
                            )}>{status}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {selectedHermesOp.errors?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-destructive mb-1">Errors ({selectedHermesOp.errors.length})</p>
                    <div className="space-y-1">
                      {selectedHermesOp.errors.map((err: string, i: number) => (
                        <p key={i} className="text-xs text-destructive bg-destructive/5 p-2 rounded">{err}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insights */}
                {selectedHermesOp.insights?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Insights Discovered</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedHermesOp.insights.map((insight: any, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {insight.title}
                        </span>
                      ))}
                    </div>
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

      {/* Hermes Custom Operation Dialog */}
      <Dialog open={hermesDialogOpen} onOpenChange={setHermesDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/20">
                <Send className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <DialogTitle>Hermes Custom Operation</DialogTitle>
                <DialogDescription>
                  Describe what you want Hermes to do. It will retrieve context from the knowledge base,
                  plan a multi-agent workflow, and execute autonomously.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                Describe Your Objective
              </Label>
              <Textarea
                placeholder="e.g., Qualify all new leads, send WATI follow-ups, sync to Zoho CRM, check compliance expiry dates, and run trade corridor matching"
                value={hermesObjective}
                onChange={(e) => setHermesObjective(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Hermes uses the RAG knowledge base and agent memory to understand context, then plans and executes
                the optimal sequence of agent actions across all integrated services (WATI, Zoho, QMe, Make.com, etc.).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                How It Works
              </div>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li><strong>Context Retrieval</strong> — Queries RAG knowledge base for relevant business context</li>
                <li><strong>Workflow Planning</strong> — Uses LLM to plan the optimal agent sequence and actions</li>
                <li><strong>Execution</strong> — Runs each agent action via real service integrations</li>
                <li><strong>Memory</strong> — Stores patterns and insights in cross-agent memory for future runs</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => runHermesOperation("run", hermesObjective)}
              disabled={hermesRunning || !hermesObjective.trim()}
            >
              {hermesRunning ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Run Hermes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  onClick={async () => {
                    // One-click deploy with all agents
                    setStarting(true)
                    try {
                      const res = await fetch("/api/god-mode", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          duration: "86400000",
                          objective,
                          agents: ["lead", "trade", "compliance", "onboarding", "revenue"],
                        }),
                      })
                      if (res.ok) {
                        await loadSessions()
                      }
                    } catch (e) {
                      console.error("Quick deploy failed:", e)
                    } finally {
                      setStarting(false)
                    }
                  }}
                  disabled={starting}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-muted shrink-0 group-hover:bg-primary/10 transition-colors">
                    {starting ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    ) : (
                      <Rocket className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="text-sm group-hover:text-foreground transition-colors">{objective}</span>
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
            <div className="flex gap-3 justify-center">
              <Button
                size="lg"
                disabled={starting}
                onClick={async () => {
                  setStarting(true)
                  try {
                    const res = await fetch("/api/god-mode", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        duration: 86400000,
                        objective: "Full system sweep — all agents, all pending tasks",
                        agents: ["lead", "trade", "compliance", "onboarding", "revenue"],
                      }),
                    })
                    if (res.ok) await loadSessions()
                  } catch (e) {
                    console.error("Quick deploy failed:", e)
                  } finally {
                    setStarting(false)
                  }
                }}
              >
                {starting ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Deploying...</>
                ) : (
                  <><Rocket className="h-5 w-5 mr-2" /> Quick Deploy All</>
                )}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setGodModeDialogOpen(true)}>
                <Zap className="h-5 w-5 mr-2" /> Custom Deploy
              </Button>
            </div>
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
            {/* Free-text objective */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-primary" />
                Describe Your Objective
              </Label>
              <Textarea
                placeholder="Describe what you want the agents to do... e.g., Qualify all new leads, send follow-ups to stuck onboarding clients, and scan for new Korea trade corridor matches"
                value={godModeConfig.customObjective || godModeConfig.objective}
                onChange={(e) => setGodModeConfig((prev) => ({ ...prev, customObjective: e.target.value }))}
                className="min-h-[80px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Describe your objective in plain English. All selected agents will work autonomously to achieve it.
              </p>
            </div>

            {/* Quick preset selector */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Or pick a preset objective</Label>
              <div className="flex flex-wrap gap-1.5">
                {GOD_MODE_OBJECTIVES.map((obj) => (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => setGodModeConfig((prev) => ({ ...prev, customObjective: "", objective: obj }))}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-all",
                      (godModeConfig.customObjective || "") === "" && godModeConfig.objective === obj
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/50 hover:border-primary/30 text-muted-foreground"
                    )}
                  >
                    {obj}
                  </button>
                ))}
              </div>
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
