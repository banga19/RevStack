"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, formatDate } from "@/lib/utils"
import { Brain, Activity, CheckCircle2, XCircle, Clock, Bot, Zap, Users, Target, AlertTriangle, RefreshCw } from "lucide-react"

type HermesRun = {
  id: string
  taskType: string
  status: string
  output: string | null
  leadsProcessed: number | null
  messagesQueued: number | null
  createdAt: string
  completedAt: string | null
}

type AgentStatus = {
  active: boolean
  lastActive: string
  taskCount: number
}

export default function HermesPage() {
  const [runs, setRuns] = useState<HermesRun[]>([])
  const [loading, setLoading] = useState(true)
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({})

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/hermes/runs")
      const data = await res.json()
      setRuns(data || [])

      // Derive agent statuses from runs
      const statuses: Record<string, AgentStatus> = {}
      const agentTypes = ["qualify_leads", "send_followups", "onboard_clients", "generate_report", "custom"]
      for (const agentType of agentTypes) {
        const agentRuns = (data || []).filter((r: HermesRun) => r.taskType === agentType)
        const lastRun = agentRuns[0]
        statuses[agentType] = {
          active: agentRuns.some((r: HermesRun) => r.status === "running"),
          lastActive: lastRun?.createdAt || "",
          taskCount: agentRuns.length,
        }
      }
      setAgentStatuses(statuses)
    } catch (e) {
      console.error("Failed to fetch runs", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 10000)
    return () => clearInterval(interval)
  }, [fetchRuns])

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="shimmer h-4 w-24 rounded mb-3" />
                <div className="shimmer h-8 w-20 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="shimmer h-64 w-full rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalRuns = runs.length
  const completedRuns = runs.filter((r) => r.status === "completed").length
  const failedRuns = runs.filter((r) => r.status === "failed").length
  const runningRuns = runs.filter((r) => r.status === "running" || r.status === "pending")
  const totalLeadsProcessed = runs.reduce((sum, r) => sum + (r.leadsProcessed || 0), 0)
  const totalMessagesQueued = runs.reduce((sum, r) => sum + (r.messagesQueued || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            Autonomous Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Background agents running autonomously — no manual intervention needed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(
            "text-sm px-3 py-1",
            runningRuns.length > 0
              ? "text-primary border-primary/30"
              : "text-muted-foreground"
          )}>
            <Activity className={cn(
              "h-3.5 w-3.5 mr-1",
              runningRuns.length > 0 && "animate-pulse text-primary"
            )} />
            {runningRuns.length > 0 ? `${runningRuns.length} running` : "Idle"}
          </Badge>
          <button
            onClick={fetchRuns}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Runs</p>
              <p className="text-2xl font-bold">{totalRuns}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completedRuns}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Leads Processed</p>
              <p className="text-2xl font-bold">{totalLeadsProcessed}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Msgs Queued</p>
              <p className="text-2xl font-bold">{totalMessagesQueued}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Agent Status
          </CardTitle>
          <CardDescription>Background agents run autonomously based on system conditions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "qualify_leads", label: "Lead Qualification", icon: Users, desc: "Scores new leads and routes qualified ones to pipeline" },
              { key: "send_followups", label: "Follow-up Sender", icon: Zap, desc: "Sends scheduled outreach messages automatically" },
              { key: "onboard_clients", label: "Client Onboarding", icon: Target, desc: "Reviews stuck onboarding clients and triggers workflows" },
              { key: "generate_report", label: "Report Generator", icon: Activity, desc: "Generates daily revenue and pipeline reports" },
              { key: "custom", label: "Custom Operations", icon: Brain, desc: "Runs custom autonomous tasks as needed" },
            ].map((agent) => {
              const status = agentStatuses[agent.key]
              return (
                <div key={agent.key} className="p-4 rounded-lg border bg-card/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <agent.icon className={cn(
                        "h-4 w-4",
                        status?.active ? "text-emerald-500" : "text-muted-foreground"
                      )} />
                      <span className="text-sm font-medium">{agent.label}</span>
                    </div>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      status?.active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
                    )} />
                  </div>
                  <p className="text-xs text-muted-foreground">{agent.desc}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{status?.taskCount || 0} runs</span>
                    {status?.lastActive && (
                      <span>Last: {formatDate(status.lastActive)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Info */}
      <Card className="bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-purple-500/10 shrink-0">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Autonomous Schedule</h3>
              <p className="text-sm text-muted-foreground">
                Agents run autonomously via GitHub Actions cron triggers. No manual intervention required.
              </p>
              <div className="grid gap-2 mt-3 sm:grid-cols-2">
                <div className="p-3 rounded-lg bg-background/50 border">
                  <p className="text-xs font-medium text-primary">Daily Full Sweep</p>
                  <p className="text-xs text-muted-foreground">6:00 AM UTC — All agents, revenue report</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border">
                  <p className="text-xs font-medium text-amber-500">6-Hour Health Check</p>
                  <p className="text-xs text-muted-foreground">Leads, compliance expiry, stuck onboarding</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Run History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Agent Run History
          </CardTitle>
          <CardDescription>Auto-refreshes every 10 seconds</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No agent runs yet. The autonomous scheduler will trigger operations as conditions are met.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {runs.map((run) => (
                <div key={run.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className={cn(
                    "h-5 w-5 mt-0.5 shrink-0",
                    run.status === "completed" && "text-emerald-500",
                    run.status === "failed" && "text-red-500",
                    run.status === "running" && "text-blue-500 animate-pulse",
                    run.status === "pending" && "text-muted-foreground",
                  )}>
                    {run.status === "completed" && <CheckCircle2 className="h-5 w-5" />}
                    {run.status === "failed" && <XCircle className="h-5 w-5" />}
                    {run.status === "running" && <Activity className="h-5 w-5" />}
                    {run.status === "pending" && <Clock className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {run.taskType.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        run.status === "completed" && "bg-emerald-500/10 text-emerald-600 border-emerald-800",
                        run.status === "failed" && "bg-red-500/10 text-red-600 border-red-800",
                        run.status === "running" && "bg-blue-500/10 text-blue-600 border-blue-800",
                      )}>
                        {run.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{formatDate(run.createdAt)}</span>
                    </div>
                    {run.output && <p className="text-xs text-muted-foreground">{run.output}</p>}
                    {(run.leadsProcessed !== null || run.messagesQueued !== null) && (
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        {run.leadsProcessed !== null && <span>{run.leadsProcessed} leads processed</span>}
                        {run.messagesQueued !== null && <span>{run.messagesQueued} messages queued</span>}
                      </div>
                    )}
                    {run.status === "failed" && run.output && (
                      <p className="text-xs text-red-400 mt-1">{run.output}</p>
                    )}
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
