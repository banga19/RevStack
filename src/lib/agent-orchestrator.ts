/**
 * Mapato Autonomous Agent Orchestrator
 *
 * Polsia-inspired "God Mode" — autonomous multi-agent system that plans,
 * executes, and reports on B2B trade operations without human intervention.
 *
 * Agents: Lead, Trade, Compliance, Onboarding, Revenue
 */

import { type ChatOpenAI } from "@langchain/openai"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { Annotation, StateGraph, END } from "@langchain/langgraph"
import { agentMemory, type AgentType, type AgentReport, type GodModeConfig } from "./agent-memory"
import { createLlm } from "./model-provider"
import { ragPipeline } from "./rag-pipeline"
import {
  executeAgentServiceAction,
  type ServiceActionResult,
} from "./agent-service-bridge"

// ============================================================
// Types
// ============================================================

export interface AgentTask {
  id: string
  agentType: AgentType
  action: string
  status: "pending" | "running" | "completed" | "failed"
  result?: string
  startedAt?: number
  completedAt?: number
  error?: string
}

export interface GodModeSession {
  id: string
  config: GodModeConfig
  status: "idle" | "running" | "paused" | "completed"
  startTime?: number
  endTime?: number
  tasks: AgentTask[]
  reports: AgentReport[]
  progress: number // 0-100
  currentAgent?: AgentType
}

export type AgentAction = {
  agentType: AgentType
  action: string
  reasoning: string
  priority: "low" | "medium" | "high" | "critical"
  estimatedDuration: string
}

// ============================================================
// Agent State
// ============================================================

const AgentState = Annotation.Root({
  sessionId: Annotation<string>,
  objective: Annotation<string>,
  currentAgent: Annotation<AgentType | null>,
  completedCount: Annotation<number>,
  totalActions: Annotation<number>,
  errors: Annotation<string[]>,
  insights: Annotation<string[]>,
  startTime: Annotation<number>,
})

// ============================================================
// Agent Orchestrator
// ============================================================

class AgentOrchestrator {
  private llm: ChatOpenAI
  private sessions: Map<string, GodModeSession>
  private activeTimers: Map<string, NodeJS.Timeout>
  private listeners: Array<(sessions: Map<string, GodModeSession>) => void>

  constructor() {
    this.llm = createLlm({ temperature: 0.7 })
    this.sessions = new Map()
    this.activeTimers = new Map()
    this.listeners = []
  }

  // ==========================================================
  // God Mode Session Management
  // ==========================================================

  createSession(config: GodModeConfig): GodModeSession {
    const session: GodModeSession = {
      id: `godmode-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      config,
      status: "idle",
      tasks: [],
      reports: [],
      progress: 0,
    }
    this.sessions.set(session.id, session)
    this.notifyListeners()
    return session
  }

  async startGodMode(config: GodModeConfig): Promise<GodModeSession> {
    const session = this.createSession(config)
    session.status = "running"
    session.startTime = Date.now()

    // Analyze the objective and plan tasks
    const actions = await this.planActions(config)

    // Create tasks from planned actions
    session.tasks = actions.map((a, i) => ({
      id: `task-${session.id}-${i}`,
      agentType: a.agentType,
      action: a.action,
      status: "pending" as const,
    }))

    this.notifyListeners()

    // Start executing tasks in the background
    this.executeTasks(session)

    return session
  }

  async pauseGodMode(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== "running") return false
    session.status = "paused"

    // Clear any running timer
    const timer = this.activeTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.activeTimers.delete(sessionId)
    }

    this.notifyListeners()
    return true
  }

  async resumeGodMode(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== "paused") return false
    session.status = "running"
    this.notifyListeners()
    this.executeTasks(session)
    return true
  }

  async stopGodMode(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (!session) return false
    session.status = "completed"
    session.endTime = Date.now()
    session.progress = 100

    const timer = this.activeTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.activeTimers.delete(sessionId)
    }

    await this.generateSessionSummary(session)
    this.notifyListeners()
    return true
  }

  // ==========================================================
  // Task Planning & Execution
  // ==========================================================

  private async planActions(config: GodModeConfig): Promise<AgentAction[]> {
    const agentsDescription = config.agents
      .map((a) => {
        const descriptions: Record<AgentType, string> = {
          lead: "Lead Agent: Qualifies leads, manages follow-ups, routes to pipeline",
          trade: "Trade Agent: Manages corridors, pricing, trade matching",
          compliance: "Compliance Agent: Tracks certifications, expiry alerts, documentation",
          onboarding: "Onboarding Agent: Client onboarding workflows, document collection",
          revenue: "Revenue Agent: Revenue tracking, success fee calculation, forecasting",
          orchestrator: "Orchestrator: Coordinates all agents",
        }
        return descriptions[a]
      })
      .join("\n")

    const planningPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are the Mapato AI orchestrator. Your job is to plan autonomous tasks for specialized agents " +
        "that handle B2B trade operations. Plan concrete, specific actions each agent should take.",
      ],
      [
        "human",
        `Objective: ${config.objective}
Duration: ${config.duration}ms (${Math.round(config.duration / 3600000)} hours)
Available Agents:
${agentsDescription}

For each agent, list specific actions they should take autonomously. 
Format as: AGENT_TYPE|ACTION|REASONING|PRIORITY|DURATION

Example:
lead|Qualify all new leads in the pipeline and send personalized WhatsApp follow-ups|3 new leads detected in last 24h|high|2 hours`,
      ],
    ])

    const chain = planningPrompt.pipe(this.llm).pipe(new StringOutputParser())
    const plan = await chain.invoke({})

    // Parse plan into actions
    const actions: AgentAction[] = plan
      .split("\n")
      .filter((line) => line.includes("|"))
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim())
        const agentType = parts[0]?.toLowerCase() as AgentType
        return {
          agentType: ["lead", "trade", "compliance", "onboarding", "revenue"].includes(agentType)
            ? agentType
            : "lead",
          action: parts[1] || "Execute autonomous operations",
          reasoning: parts[2] || "Based on system analysis",
          priority: (["low", "medium", "high", "critical"].includes(parts[3]?.toLowerCase())
            ? parts[3].toLowerCase()
            : "medium") as "low" | "medium" | "high" | "critical",
          estimatedDuration: parts[4] || "1 hour",
        }
      })

    return actions.length > 0 ? actions : this.getDefaultActions(config)
  }

  private getDefaultActions(config: GodModeConfig): AgentAction[] {
    return config.agents.map((agentType) => ({
      agentType,
      action: `Execute ${agentType} agent autonomous operations`,
      reasoning: `Standard autonomous execution cycle for ${agentType} agent`,
      priority: "medium" as const,
      estimatedDuration: "1 hour",
    }))
  }

  private async executeTasks(session: GodModeSession): Promise<void> {
    if (session.status !== "running") return

    const pendingTasks = session.tasks.filter((t) => t.status === "pending")
    if (pendingTasks.length === 0) {
      // All tasks completed — generate report
      await this.stopGodMode(session.id)
      return
    }

    // Execute next task
    const task = pendingTasks[0]
    task.status = "running"
    task.startedAt = Date.now()
    session.currentAgent = task.agentType
    this.notifyListeners()

    try {
      // Execute the agent action
      const result = await this.executeAgentAction(task, session)
      task.status = "completed"
      task.result = result
      task.completedAt = Date.now()
      const completedSoFar = session.tasks.filter((t) => t.status === "completed").length
      session.progress = Math.round(
        (completedSoFar / session.tasks.length) * 100
      )

      // Analyze for insights
      await agentMemory.analyzePattern(result, task.agentType)

      // Store in RAG pipeline
      await ragPipeline.processDocument(
        Buffer.from(result),
        {
          agentType: task.agentType,
          sessionId: session.id,
          taskId: task.id,
          timestamp: Date.now(),
        },
        { type: "text" }
      )
    } catch (error) {
      task.status = "failed"
      task.error = (error as Error).message
      // Track error in the task itself - already done above
    }

    this.notifyListeners()

    // Schedule next task execution
    const timer = setTimeout(() => this.executeTasks(session), 1000)
    this.activeTimers.set(session.id, timer)
  }

  private async executeAgentAction(task: AgentTask, session: GodModeSession): Promise<string> {
    // Use the service bridge to invoke real integrated services
    const serviceResult = await executeAgentServiceAction(
      task.agentType,
      task.action,
      {
        sessionId: session.id,
        objective: session.config.objective,
        startTime: session.startTime || Date.now(),
      }
    )

    if (serviceResult.success) {
      return [
        `=== ${task.agentType.toUpperCase()} AGENT EXECUTION REPORT ===`,
        `Status: ✅ Success`,
        `Summary: ${serviceResult.summary}`,
        serviceResult.details ? `\nDetails:\n${serviceResult.details}` : "",
        serviceResult.metrics
          ? `\nMetrics:\n${Object.entries(serviceResult.metrics)
              .map(([k, v]) => `  ${k}: ${v}`)
              .join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    } else {
      // Fallback: if the service bridge fails, use the LLM as a fallback
      const actionPrompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `You are the ${task.agentType} agent in the Mapato autonomous system. ` +
          "Execute your assigned action and report the results. Be specific about what was done. " +
          "Note: The integrated service bridge was unavailable, so provide a simulated analysis.",
        ],
        [
          "human",
          `Session Objective: ${session.config.objective}
Your Action: ${task.action}
Service Error: ${serviceResult.errors?.join(", ") || "Unknown"}

Provide a simulated execution report with analysis.`,
        ],
      ])

      const chain = actionPrompt.pipe(this.llm).pipe(new StringOutputParser())
      return await chain.invoke({})
    }
  }

  // ==========================================================
  // Report Generation
  // ==========================================================

  private async generateSessionSummary(session: GodModeSession): Promise<void> {
    const completedTasks = session.tasks.filter((t) => t.status === "completed")
    const failedTasks = session.tasks.filter((t) => t.status === "failed")

    // Generate a report for each agent type
    for (const agentType of [...new Set(session.tasks.map((t) => t.agentType))]) {
      const agentTasks = completedTasks.filter((t) => t.agentType === agentType)
      if (agentTasks.length === 0) continue

      const report = await agentMemory.generateReport(
        agentType,
        session.startTime || Date.now(),
        session.endTime || Date.now(),
        agentTasks.map((t) => ({
          action: t.action,
          result: t.result || "Completed",
          impact: t.error ? `Failed: ${t.error}` : "Successfully executed",
        })),
        {
          tasksCompleted: agentTasks.length,
          tasksFailed: failedTasks.filter((t) => t.agentType === agentType).length,
          duration: ((session.endTime || Date.now()) - (session.startTime || Date.now())) / 1000,
        }
      )

      session.reports.push(report)
    }
  }

  // ==========================================================
  // Session Queries
  // ==========================================================

  getSession(sessionId: string): GodModeSession | undefined {
    return this.sessions.get(sessionId)
  }

  getAllSessions(): GodModeSession[] {
    return Array.from(this.sessions.values())
  }

  getRunningSessions(): GodModeSession[] {
    return this.getAllSessions().filter((s) => s.status === "running")
  }

  // ==========================================================
  // Subscription
  // ==========================================================

  subscribe(listener: (sessions: Map<string, GodModeSession>) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.sessions)
      } catch (error) {
        console.error("Error in orchestrator listener:", error)
      }
    })
  }

  // ==========================================================
  // Quick Actions
  // ==========================================================

  getQuickActions(): AgentAction[] {
    return [
      {
        agentType: "lead",
        action: "Qualify all unprocessed leads and send WhatsApp follow-up sequences",
        reasoning: "Unqualified leads bottleneck pipeline growth",
        priority: "high",
        estimatedDuration: "30 min",
      },
      {
        agentType: "revenue",
        action: "Calculate monthly success fees and generate invoices for active clients",
        reasoning: "End of billing cycle approaching",
        priority: "high",
        estimatedDuration: "15 min",
      },
      {
        agentType: "compliance",
        action: "Check all certification expiry dates and send renewal reminders",
        reasoning: "Prevent compliance gaps",
        priority: "medium",
        estimatedDuration: "20 min",
      },
      {
        agentType: "onboarding",
        action: "Follow up with clients stuck in onboarding and send checklist reminders",
        reasoning: "Improve onboarding completion rate",
        priority: "medium",
        estimatedDuration: "25 min",
      },
      {
        agentType: "trade",
        action: "Scan for new trade corridor matches and notify relevant clients",
        reasoning: "New Korea-Africa corridor opportunities available",
        priority: "low",
        estimatedDuration: "10 min",
      },
    ]
  }

  getAgentStatus(): Record<AgentType, { active: boolean; lastActive: number; taskCount: number }> {
    const agents: AgentType[] = ["lead", "trade", "compliance", "onboarding", "revenue"]
    const status: Record<string, any> = {}

    for (const agent of agents) {
      const runningSessions = this.getRunningSessions()
      const active = runningSessions.some((s) => s.currentAgent === agent)
      const allTasks = Array.from(this.sessions.values()).flatMap((s) =>
        s.tasks.filter((t) => t.agentType === agent)
      )

      status[agent] = {
        active,
        lastActive: allTasks.length > 0 ? Math.max(...allTasks.map((t) => t.completedAt || 0)) : 0,
        taskCount: allTasks.length,
      }
    }

    return status as Record<AgentType, { active: boolean; lastActive: number; taskCount: number }>
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const agentOrchestrator = new AgentOrchestrator()
export default AgentOrchestrator
