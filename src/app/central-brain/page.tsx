"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Brain,
  Activity,
  MessageSquare,
  Webhook,
  Radio,
  Bot,
  Cpu,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ListTodo,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Server,
  Users,
  Globe,
  Send,
  UserCheck,
  BarChart3,
  FileText,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ── Types ──────────────────────────────────────────────────────────────────

interface AgentRegistration {
  agentType: string
  displayName: string
  description: string
  capabilities: Array<{ name: string; description: string }>
  registered: boolean
  registeredAt: number
  lastActiveAt: number
  status: "active" | "idle" | "error" | "unavailable"
}

interface AgentStatus {
  agentType: string
  status: string
  lastActiveAt: number
  totalMessagesProcessed: number
  totalErrors: number
  capabilities: Array<{ name: string; description: string }>
}

interface LogEntry {
  id: string
  timestamp: string
  entryType: "message_sent" | "message_received" | "action_executed" | "action_failed" | "insight_generated" | "event" | "error"
  source: string
  summary: string
  details?: any
  durationMs?: number
  correlationId?: string
}

interface BridgeEvent {
  id: string
  timestamp: string
  type: string
  summary: string
  details?: Record<string, unknown>
}

interface SystemStats {
  totalMessagesSent: number
  totalMessagesDelivered: number
  totalActionsExecuted: number
  totalActionsFailed: number
  totalErrors: number
  startedAt: number
  uptimeMs: number
  registeredAgents: number
  activeSubscriptions: number
  queuedMessages: number
  logEntryCount: number
}

interface CentralBrainData {
  stats: SystemStats
  agents: AgentStatus[]
  recentLogs: LogEntry[]
  bridgedEvents: BridgeEvent[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

const AGENT_ICONS: Record<string, React.ReactNode> = {
  lead: <Users className="h-4 w-4" />,
  trade: <Globe className="h-4 w-4" />,
  compliance: <AlertCircle className="h-4 w-4" />,
  onboarding: <UserCheck className="h-4 w-4" />,
  revenue: <BarChart3 className="h-4 w-4" />,
  orchestrator: <Brain className="h-4 w-4" />,
  system: <Server className="h-4 w-4" />,
}

const AGENT_COLORS: Record<string, string> = {
  lead: "text-blue-500 bg-blue-500/10",
  trade: "text-emerald-500 bg-emerald-500/10",
  compliance: "text-amber-500 bg-amber-500/10",
  onboarding: "text-purple-500 bg-purple-500/10",
  revenue: "text-cyan-500 bg-cyan-500/10",
  orchestrator: "text-primary bg-primary/10",
  system: "text-muted-foreground bg-muted",
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  idle: { label: "Idle", color: "bg-muted text-muted-foreground border-border" },
  error: { label: "Error", color: "bg-red-500/10 text-red-600 border-red-500/30" },
  unavailable: { label: "Unavailable", color: "bg-muted/50 text-muted-foreground/50 border-muted-foreground/20" },
}

const LOG_ENTRY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  message_sent: { label: "Message Sent", icon: <Send className="h-3.5 w-3.5" />, color: "text-blue-500 bg-blue-500/10" },
  message_received: { label: "Message Received", icon: <MessageSquare className="h-3.5 w-3.5" />, color: "text-purple-500 bg-purple-500/10" },
  action_executed: { label: "Action Executed", icon: <Zap className="h-3.5 w-3.5" />, color: "text-emerald-500 bg-emerald-500/10" },
  action_failed: { label: "Action Failed", icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-500 bg-red-500/10" },
  insight_generated: { label: "Insight", icon: <Sparkles className="h-3.5 w-3.5" />, color: "text-amber-500 bg-amber-500/10" },
  event: { label: "Event", icon: <Radio className="h-3.5 w-3.5" />, color: "text-primary bg-primary/10" },
  error: { label: "Error", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-red-500 bg-red-500/10" },
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  agent_registered: { label: "Agent Registered", icon: <Bot className="h-3.5 w-3.5" />, color: "text-emerald-500 bg-emerald-500/10" },
  agent_status_changed: { label: "Status Changed", icon: <Activity className="h-3.5 w-3.5" />, color: "text-blue-500 bg-blue-500/10" },
  message_sent: { label: "Message Sent", icon: <Send className="h-3.5 w-3.5" />, color: "text-blue-500 bg-blue-500/10" },
  message_delivered: { label: "Message Delivered", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-purple-500 bg-purple-500/10" },
  action_executing: { label: "Action Executing", icon: <Loader2 className="h-3.5 w-3.5" />, color: "text-amber-500 bg-amber-500/10" },
  action_completed: { label: "Action Completed", icon: <Zap className="h-3.5 w-3.5" />, color: "text-emerald-500 bg-emerald-500/10" },
  orchestration_started: { label: "Orchestration Started", icon: <Brain className="h-3.5 w-3.5" />, color: "text-primary bg-primary/10" },
  orchestration_completed: { label: "Orchestration Completed", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-500 bg-emerald-500/10" },
  insight_discovered: { label: "Insight Discovered", icon: <Sparkles className="h-3.5 w-3.5" />, color: "text-amber-500 bg-amber-500/10" },
  error: { label: "Error", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-red-500 bg-red-500/10" },
}

function timeAgo(timestamp: number | string): string {
  const ms = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const secs = ms / 1000
  if (secs < 60) return `${secs.toFixed(1)}s`
  const mins = Math.floor(secs / 60)
  const remainder = secs % 60
  return `${mins}m ${remainder.toFixed(0)}s`
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}

// ── Tab State ──────────────────────────────────────────────────────────────

type Tab = "overview" | "agents" | "log" | "events" | "stream"

// ── Main Component ─────────────────────────────────────────────────────────

export default function CentralBrainPage() {
  const [data, setData] = useState<CentralBrainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("overview")
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [streamEvents, setStreamEvents] = useState<BridgeEvent[]>([])
  const [streamConnected, setStreamConnected] = useState(false)
  const [logFilter, setLogFilter] = useState<string>("all")

  // ── Load data ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/central-brain")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError("Failed to load Central Brain data")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── SSE Stream (live events tab) ───────────────────────────
  useEffect(() => {
    if (tab !== "stream") return

    const es = new EventSource("/api/central-brain/stream?types=agent_registered,agent_status_changed,message_sent,action_executing,action_completed,orchestration_started,orchestration_completed,insight_discovered,error")
    setStreamConnected(false)

    es.onopen = () => setStreamConnected(true)

    es.onmessage = (event) => {
      try {
        const raw = typeof event.data === "string" ? event.data.trim() : ""
        if (!raw || raw.startsWith(":")) return
        const parsed = JSON.parse(raw) as BridgeEvent

        // Skip connected event display
        if (parsed.type === "connected") return

        setStreamEvents((prev) => {
          const next = [parsed, ...prev]
          return next.length > 200 ? next.slice(0, 200) : next
        })
      } catch {
        // Ignore malformed messages
      }
    }

    es.onerror = () => {
      setStreamConnected(false)
    }

    return () => {
      es.close()
      setStreamConnected(false)
    }
  }, [tab])

  // ── Filter log entries ─────────────────────────────────────
  const filteredLogs = data?.recentLogs?.filter((entry) => {
    if (logFilter === "all") return true
    return entry.entryType === logFilter
  }) || []

  // Reset expanded when filter changes
  useEffect(() => {
    setExpandedLogId(null)
  }, [logFilter])

  // ── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="shimmer h-8 w-80 rounded mb-2" />
        <div className="shimmer h-4 w-96 rounded mb-8" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="shimmer h-24 rounded" />)}
        </div>
        <div className="shimmer h-64 rounded" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-16 w-16 text-amber-500/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Unable to Load Central Brain</h2>
        <p className="text-muted-foreground mb-6">{error || "Something went wrong"}</p>
        <Button onClick={() => loadData()}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
      </div>
    )
  }

  const { stats, agents, recentLogs } = data

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-7 w-7 text-primary" />
            Central Brain
          </h1>
          <p className="text-muted-foreground mt-1">
            Agent communication hub — {stats.registeredAgents} agents, {formatNumber(stats.totalMessagesSent)} messages, {formatNumber(stats.totalActionsExecuted)} actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/50 w-fit">
        {[
          { id: "overview" as Tab, label: "Overview", icon: <Activity className="h-4 w-4" /> },
          { id: "agents" as Tab, label: "Agents", icon: <Bot className="h-4 w-4" /> },
          { id: "log" as Tab, label: "Comm Log", icon: <MessageSquare className="h-4 w-4" /> },
          { id: "events" as Tab, label: "Events", icon: <Radio className="h-4 w-4" /> },
          { id: "stream" as Tab, label: "Live Stream", icon: <Webhook className="h-4 w-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          TAB: OVERVIEW
          ════════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Messages Sent</span>
                  <Send className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-500">{formatNumber(stats.totalMessagesSent)}</div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Actions Executed</span>
                  <Zap className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-emerald-500">{formatNumber(stats.totalActionsExecuted)}</div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Actions Failed</span>
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-500">{formatNumber(stats.totalActionsFailed)}</div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Total Errors</span>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-amber-500">{formatNumber(stats.totalErrors)}</div>
              </CardContent>
            </Card>
          </div>

          {/* System Stats + Agent Grid Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* System Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Cpu className="h-4 w-4 text-primary" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uptime</span>
                    <span className="font-medium">{formatDuration(stats.uptimeMs)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Registered Agents</span>
                    <span className="font-medium">{stats.registeredAgents}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active Subscriptions</span>
                    <span className="font-medium">{stats.activeSubscriptions}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Queued Messages</span>
                    <span className="font-medium">{stats.queuedMessages}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Log Entries</span>
                    <span className="font-medium">{formatNumber(stats.logEntryCount)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Rate</span>
                    <span className="font-medium">
                      {stats.totalMessagesSent > 0
                        ? `${((stats.totalMessagesDelivered / stats.totalMessagesSent) * 100).toFixed(0)}%`
                        : "—"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Action Success Rate</span>
                    <span className="font-medium">
                      {stats.totalActionsExecuted + stats.totalActionsFailed > 0
                        ? `${((stats.totalActionsExecuted / (stats.totalActionsExecuted + stats.totalActionsFailed)) * 100).toFixed(0)}%`
                        : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Status Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Bot className="h-4 w-4 text-primary" />
                  Agent Status
                </CardTitle>
                <CardDescription>All registered agents and their current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {agents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No agents registered</p>
                  ) : (
                    agents.map((agent) => {
                      const icon = AGENT_ICONS[agent.agentType] || <Bot className="h-4 w-4" />
                      const color = AGENT_COLORS[agent.agentType] || "text-muted-foreground bg-muted"
                      const statusCfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.unavailable
                      return (
                        <div key={agent.agentType} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                          <div className={cn("p-1.5 rounded-md", color)}>{icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium capitalize">{agent.agentType}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {agent.capabilities.length} capabilities · {timeAgo(agent.lastActiveAt)}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn("text-[10px]", statusCfg.color)}>
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full mr-1.5 inline-block",
                              agent.status === "active" ? "bg-emerald-500" :
                              agent.status === "error" ? "bg-red-500" :
                              agent.status === "idle" ? "bg-muted-foreground" :
                              "bg-muted-foreground/50"
                            )} />
                            {statusCfg.label}
                          </Badge>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Row */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Send className="h-8 w-8 text-blue-500/80" />
                <div>
                  <div className="text-lg font-bold">{formatNumber(stats.totalMessagesDelivered)}</div>
                  <div className="text-[10px] text-muted-foreground">Messages Delivered</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Zap className="h-8 w-8 text-emerald-500/80" />
                <div>
                  <div className="text-lg font-bold">{formatNumber(stats.totalActionsExecuted)}</div>
                  <div className="text-[10px] text-muted-foreground">Actions Succeeded</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500/80" />
                <div>
                  <div className="text-lg font-bold">{formatNumber(stats.totalActionsFailed)}</div>
                  <div className="text-[10px] text-muted-foreground">Actions Failed</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Bot className="h-8 w-8 text-primary/80" />
                <div>
                  <div className="text-lg font-bold">{stats.registeredAgents}</div>
                  <div className="text-[10px] text-muted-foreground">Active Agents</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: AGENTS
          ════════════════════════════════════════════════════════ */}
      {tab === "agents" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Bot className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Agents Registered</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  Agents register with the Central Brain when they are initialised. Start a Hermes operation to see agents here.
                </p>
              </CardContent>
            </Card>
          ) : (
            agents.map((agent) => {
              const icon = AGENT_ICONS[agent.agentType] || <Bot className="h-4 w-4" />
              const color = AGENT_COLORS[agent.agentType] || "text-muted-foreground bg-muted"
              const statusCfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.unavailable

              return (
                <Card key={agent.agentType} className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", color)}>{icon}</div>
                        <div>
                          <CardTitle className="text-sm capitalize">{agent.agentType}</CardTitle>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", statusCfg.color)}>
                        {statusCfg.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Capabilities */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">Capabilities</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities.map((cap) => (
                          <Badge key={cap.name} variant="secondary" className="text-[10px]">
                            {cap.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Messages: </span>
                        <span className="font-medium">{formatNumber(agent.totalMessagesProcessed)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Errors: </span>
                        <span className="font-medium">{formatNumber(agent.totalErrors)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Last Active: </span>
                        <span className="font-medium">{timeAgo(agent.lastActiveAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: COMMUNICATION LOG
          ════════════════════════════════════════════════════════ */}
      {tab === "log" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Communication Log
                </CardTitle>
                <CardDescription>
                  {formatNumber(stats.logEntryCount)} total entries — trace every message, action, and event
                </CardDescription>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/50">
                {[
                  { id: "all", label: "All" },
                  { id: "message_sent" as const, label: "Sent" },
                  { id: "message_received" as const, label: "Received" },
                  { id: "action_executed" as const, label: "Actions" },
                  { id: "error" as const, label: "Errors" },
                  { id: "event" as const, label: "Events" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setLogFilter(f.id)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md transition-colors",
                      logFilter === f.id
                        ? "bg-background text-foreground shadow-sm font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No log entries match the current filter</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLogs.map((entry) => {
                  const cfg = LOG_ENTRY_CONFIG[entry.entryType] || {
                    label: entry.entryType,
                    icon: <Activity className="h-3.5 w-3.5" />,
                    color: "text-muted-foreground bg-muted",
                  }
                  const isExpanded = expandedLogId === entry.id

                  return (
                    <div key={entry.id}>
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className={cn("p-1.5 rounded-md shrink-0", cfg.color)}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">{entry.source}</span>
                            <span className="text-[10px] text-muted-foreground/50">·</span>
                            <span className="text-[10px] text-muted-foreground">{timeAgo(entry.timestamp)}</span>
                            {entry.durationMs && (
                              <>
                                <span className="text-[10px] text-muted-foreground/50">·</span>
                                <span className="text-[10px] text-muted-foreground">{entry.durationMs}ms</span>
                              </>
                            )}
                          </div>
                          <p className="text-sm truncate">{entry.summary}</p>
                        </div>
                        <ChevronRight className={cn(
                          "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                          isExpanded && "rotate-90"
                        )} />
                      </button>
                      {isExpanded && entry.details && (
                        <div className="mx-4 mb-2 p-3 rounded-lg border bg-card/30">
                          <pre className="text-[10px] overflow-x-auto whitespace-pre-wrap text-muted-foreground">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: BRIDGED EVENTS
          ════════════════════════════════════════════════════════ */}
      {tab === "events" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Radio className="h-4 w-4 text-primary" />
              Central Brain Events
            </CardTitle>
            <CardDescription>
              Events forwarded to the SSE notification system — {data.bridgedEvents?.length || 0} recent
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!data.bridgedEvents || data.bridgedEvents.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Radio className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No events yet. Start a Hermes operation to see events.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.bridgedEvents.slice(0, 100).map((event) => {
                  const cfg = EVENT_TYPE_CONFIG[event.type] || {
                    label: event.type,
                    icon: <Activity className="h-3.5 w-3.5" />,
                    color: "text-muted-foreground bg-muted",
                  }

                  return (
                    <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className={cn("p-1.5 rounded-md shrink-0", cfg.color)}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{cfg.label}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(event.timestamp)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{event.summary}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════
          TAB: LIVE STREAM
          ════════════════════════════════════════════════════════ */}
      {tab === "stream" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Webhook className="h-4 w-4 text-primary" />
                Live Agent Event Stream
              </CardTitle>
              <CardDescription>
                Real-time events from the Central Brain MessageBus and CommunicationLog
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] text-muted-foreground bg-muted/30">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  streamConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                )} />
                {streamConnected ? "Live" : "Disconnected"}
              </div>
              {streamEvents.length > 0 && (
                <button
                  onClick={() => setStreamEvents([])}
                  className="px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                >
                  Clear ({streamEvents.length})
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!streamConnected && streamEvents.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Webhook className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Connecting to event stream...</p>
                <p className="text-xs mt-1">Open this tab to start receiving live agent events</p>
              </div>
            ) : streamEvents.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Webhook className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Waiting for events...</p>
                <p className="text-xs mt-1">Events will appear here as agents communicate</p>
              </div>
            ) : (
              <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
                {streamEvents.map((event) => {
                  const cfg = EVENT_TYPE_CONFIG[event.type] || {
                    label: event.type,
                    icon: <Activity className="h-3.5 w-3.5" />,
                    color: "text-muted-foreground bg-muted",
                  }

                  return (
                    <div key={event.id} className="flex items-center gap-2 p-1.5 rounded text-xs hover:bg-muted/30 transition-colors">
                      <div className={cn("p-1 rounded shrink-0", cfg.color)}>
                        {cfg.icon}
                      </div>
                      <span className="text-muted-foreground font-mono text-[10px] shrink-0 w-16">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="font-medium text-[10px] shrink-0 w-24">{cfg.label}</span>
                      <span className="text-muted-foreground truncate">{event.summary}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}


