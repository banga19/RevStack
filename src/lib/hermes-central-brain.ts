/**
 * Hermes Central Brain — Universal Agent Communication Hub
 *
 * Hermes is the Central Brain for all agent communication. It provides:
 *
 * 1. AgentRegistry — Registry of all agent types with capabilities, schemas, and status
 * 2. MessageBus — Pub/sub event system for inter-agent communication
 * 3. CommunicationLog — Time-series tracing of all messages, events, and actions
 * 4. OrchestrationAPI — High-level API for running multi-agent workflows
 *
 * Every agent communication is routed through the Central Brain, making it
 * the single source of truth for all agent interactions, events, and logs.
 *
 * Architecture:
 *   External API / Cron / HermesAgent
 *          │
 *          ▼
 *   ┌──────────────────────────────┐
 *   │     HermesCentralBrain       │
 *   │  ┌─────────┐ ┌────────────┐  │
 *   │  │MessageBus│ │AgentRegistry│  │
 *   │  └─────────┘ └────────────┘  │
 *   │  ┌─────────────────────────┐  │
 *   │  │   CommunicationLog      │  │
 *   │  └─────────────────────────┘  │
 *   │  ┌─────────────────────────┐  │
 *   │  │   OrchestrationAPI      │  │
 *   │  └─────────────────────────┘  │
 *   └──────┬──────────┬───────────┬─┘
 *          │          │           │
 *          ▼          ▼           ▼
 *   AgentMemory  AgentService  Integrations
 *   (shared       Bridge         (WATI, Zoho,
 *    learning)    (routing)       QMe, etc.)
 */

import { agentMemory, type AgentType, type AgentInsight, type AgentReport } from "./agent-memory"
import { executeAgentServiceAction, type ServiceActionResult } from "./agent-service-bridge"
import { trackFeatureUsed } from "./analytics"

// ============================================================
// Message Types
// ============================================================

/**
 * Priority levels for agent messages.
 */
export type MessagePriority = "critical" | "high" | "medium" | "low"

/**
 * Event that flows through the MessageBus between agents.
 */
export interface AgentMessage {
  id: string
  /** Source agent type (or "system" / "hermes" / "user") */
  source: string
  /** Target agent type (or "*" for broadcast) */
  target: string | "*"
  /** Message type — used for routing and filtering */
  type: string
  /** The payload */
  payload: any
  /** When the message was created */
  timestamp: number
  /** Priority for scheduling */
  priority: MessagePriority
  /** Correlation ID for tracing multi-step workflows */
  correlationId?: string
  /** Whether this message has been processed */
  delivered: boolean
}

/**
 * Handler function for message processing.
 */
export type MessageHandler = (
  message: AgentMessage
) => Promise<void> | void

/**
 * Subscription returned by subscribe(), used to unsubscribe.
 */
export interface MessageSubscription {
  /** Unique subscription ID */
  id: string
  /** The handler function */
  handler: MessageHandler
  /** Optional filter: only handle messages matching this type */
  filter?: string
  /** Optional filter: only handle messages matching this source */
  sourceFilter?: string
  /** Optional filter: only handle messages matching this target */
  targetFilter?: string | "*"
}

// ============================================================
// Agent Registry Types
// ============================================================

/**
 * Capability descriptor for an agent.
 */
export interface AgentCapability {
  /** Name of the capability (e.g., "qualify-leads", "send-whatsapp") */
  name: string
  /** Description of what this capability does */
  description: string
  /** Input schema description (what the agent expects) */
  inputSchema?: string
  /** Output schema description (what the agent returns) */
  outputSchema?: string
}

/**
 * Registration information for an agent.
 */
export interface AgentRegistration {
  /** Agent type (lead, trade, compliance, onboarding, revenue, orchestrator) */
  agentType: AgentType | "orchestrator" | "system"
  /** Human-readable display name */
  displayName: string
  /** Short description of what this agent does */
  description: string
  /** List of capabilities this agent exposes */
  capabilities: AgentCapability[]
  /** Whether this agent has been registered */
  registered: boolean
  /** When this agent was first registered */
  registeredAt: number
  /** When this agent was last active */
  lastActiveAt: number
  /** Current status */
  status: "active" | "idle" | "error" | "unavailable"
}

/**
 * Runtime status snapshot of an agent.
 */
export interface AgentStatus {
  agentType: AgentType | "orchestrator" | "system"
  status: "active" | "idle" | "error" | "unavailable"
  lastActiveAt: number
  totalMessagesProcessed: number
  totalErrors: number
  capabilities: AgentCapability[]
}

// ============================================================
// Communication Log Types
// ============================================================

/**
 * Single entry in the communication log.
 */
export interface LogEntry {
  /** Unique entry ID */
  id: string
  /** ISO timestamp */
  timestamp: string
  /** Type of entry (message, event, action, insight, error) */
  entryType: "message_sent" | "message_received" | "action_executed" | "action_failed" | "insight_generated" | "event" | "error"
  /** Source of the entry */
  source: string
  /** Human-readable summary */
  summary: string
  /** Detailed payload */
  details?: any
  /** Duration in ms (for actions) */
  durationMs?: number
  /** Correlation ID for tracing */
  correlationId?: string
}

// ============================================================
// Event Types (for listeners)
// ============================================================

/**
 * Events emitted by the Central Brain for real-time monitoring.
 */
export type CentralBrainEvent =
  | { type: "agent_registered"; agentType: string; registration: AgentRegistration }
  | { type: "agent_status_changed"; agentType: string; status: string }
  | { type: "message_sent"; message: AgentMessage }
  | { type: "message_delivered"; messageId: string }
  | { type: "action_executing"; agentType: string; action: string; correlationId?: string }
  | { type: "action_completed"; agentType: string; action: string; success: boolean; durationMs: number; correlationId?: string }
  | { type: "orchestration_started"; workflowId: string; objective: string }
  | { type: "orchestration_completed"; workflowId: string; status: string; durationMs: number }
  | { type: "insight_discovered"; insight: AgentInsight }
  | { type: "log_entry"; entry: LogEntry }
  | { type: "error"; source: string; error: string; correlationId?: string }

/**
 * Listener for Central Brain events.
 */
export type CentralBrainListener = (event: CentralBrainEvent) => void

// ============================================================
// Central Brain Class
// ============================================================

class HermesCentralBrain {
  // ── Agent Registry ────────────────────────────────────────
  private agents: Map<string, AgentRegistration> = new Map()

  // ── Message Bus ───────────────────────────────────────────
  private subscriptions: Map<string, MessageSubscription> = new Map()
  private messageQueue: AgentMessage[] = []
  private processingQueue: boolean = false

  // ── Communication Log ─────────────────────────────────────
  private logEntries: LogEntry[] = []
  private readonly MAX_LOG_ENTRIES = 10_000

  // ── Listeners ─────────────────────────────────────────────
  private listeners: Set<CentralBrainListener> = new Set()

  // ── Statistics ────────────────────────────────────────────
  private stats = {
    totalMessagesSent: 0,
    totalMessagesDelivered: 0,
    totalActionsExecuted: 0,
    totalActionsFailed: 0,
    totalErrors: 0,
    startedAt: Date.now(),
  }

  constructor() {
    // Register the orchestrator (self) and system agents by default
    this.registerAgent("orchestrator", {
      displayName: "Hermes Orchestrator",
      description: "Coordinates all agents and routes messages",
      capabilities: [
        { name: "orchestrate", description: "Run multi-agent workflows" },
        { name: "route-messages", description: "Route messages between agents" },
        { name: "monitor-system", description: "Monitor all agent health and status" },
      ],
      status: "active",
    })

    this.registerAgent("system", {
      displayName: "System",
      description: "Built-in system utilities",
      capabilities: [
        { name: "heartbeat", description: "System health check" },
        { name: "broadcast", description: "Broadcast to all agents" },
      ],
      status: "active",
    })
  }

  // ============================================================
  // Agent Registry
  // ============================================================

  /**
   * Register an agent with the Central Brain.
   * Agents should call this during initialization.
   */
  registerAgent(
    agentType: string,
    info: Omit<AgentRegistration, "agentType" | "registered" | "registeredAt" | "lastActiveAt">
  ): void {
    const existing = this.agents.get(agentType)

    this.agents.set(agentType, {
      agentType: agentType as AgentType,
      displayName: info.displayName,
      description: info.description,
      capabilities: info.capabilities,
      registered: true,
      registeredAt: existing?.registeredAt || Date.now(),
      lastActiveAt: Date.now(),
      status: info.status || "active",
    })

    this.addLogEntry({
      entryType: "event",
      source: "central-brain",
      summary: `Agent registered: ${agentType} (${info.displayName})`,
      details: { capabilities: info.capabilities.map((c) => c.name) },
    })

    this.emitEvent({
      type: "agent_registered",
      agentType,
      registration: this.agents.get(agentType)!,
    })
  }

  /**
   * Get registration info for a specific agent.
   */
  getAgent(agentType: string): AgentRegistration | undefined {
    return this.agents.get(agentType)
  }

  /**
   * Get all registered agents.
   */
  getAllAgents(): AgentRegistration[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get the status snapshot of all agents.
   */
  getAgentStatuses(): AgentStatus[] {
    return Array.from(this.agents.entries()).map(([agentType, reg]) => ({
      agentType: reg.agentType,
      status: reg.status,
      lastActiveAt: reg.lastActiveAt,
      totalMessagesProcessed: this.stats.totalMessagesSent,
      totalErrors: this.stats.totalErrors,
      capabilities: reg.capabilities,
    }))
  }

  /**
   * Update an agent's status.
   */
  updateAgentStatus(agentType: string, status: AgentRegistration["status"]): void {
    const agent = this.agents.get(agentType)
    if (agent) {
      agent.status = status
      agent.lastActiveAt = Date.now()
      this.agents.set(agentType, agent)

      this.emitEvent({
        type: "agent_status_changed",
        agentType,
        status,
      })
    }
  }

  /**
   * Set an agent as active (called when agent starts processing).
   */
  markAgentActive(agentType: string): void {
    this.updateAgentStatus(agentType, "active")
  }

  /**
   * Set an agent as idle (called when agent finishes processing).
   */
  markAgentIdle(agentType: string): void {
    this.updateAgentStatus(agentType, "idle")
  }

  /**
   * Set an agent as errored.
   */
  markAgentError(agentType: string): void {
    this.updateAgentStatus(agentType, "error")
  }

  // ============================================================
  // Message Bus
  // ============================================================

  /**
   * Send a message through the bus.
   * Messages are queued and processed asynchronously.
   *
   * @returns The message ID for tracing.
   */
  sendMessage(params: {
    source: string
    target: string | "*"
    type: string
    payload: any
    priority?: MessagePriority
    correlationId?: string
  }): string {
    const message: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      source: params.source,
      target: params.target,
      type: params.type,
      payload: params.payload,
      timestamp: Date.now(),
      priority: params.priority || "medium",
      correlationId: params.correlationId,
      delivered: false,
    }

    this.messageQueue.push(message)
    this.stats.totalMessagesSent++

    // Mark source agent as active
    if (this.agents.has(params.source)) {
      this.markAgentActive(params.source)
    }

    this.addLogEntry({
      entryType: "message_sent",
      source: params.source,
      summary: `Message sent: ${params.type} → ${params.target}`,
      details: { message },
      correlationId: params.correlationId,
    })

    this.emitEvent({ type: "message_sent", message })

    // Process queue asynchronously
    if (!this.processingQueue) {
      this.processingQueue = true
      setImmediate(() => this.processMessageQueue())
    }

    return message.id
  }

  /**
   * Subscribe to messages with optional filters.
   *
   * @returns Unsubscribe function.
   */
  subscribe(
    handler: MessageHandler,
    filters?: {
      messageType?: string
      sourceFilter?: string
      targetFilter?: string | "*"
    }
  ): () => void {
    const subscription: MessageSubscription = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      handler,
      filter: filters?.messageType,
      sourceFilter: filters?.sourceFilter,
      targetFilter: filters?.targetFilter,
    }

    this.subscriptions.set(subscription.id, subscription)

    return () => {
      this.subscriptions.delete(subscription.id)
    }
  }

  /**
   * Process the message queue, delivering to matching subscribers.
   * Messages are processed in priority order (critical first).
   */
  private async processMessageQueue(): Promise<void> {
    // Sort by priority
    const priorityOrder: Record<MessagePriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    }

    this.messageQueue.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    )

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!
      await this.deliverMessage(message)
    }

    this.processingQueue = false
  }

  /**
   * Deliver a single message to all matching subscribers.
   */
  private async deliverMessage(message: AgentMessage): Promise<void> {
    const matchingSubscriptions = Array.from(this.subscriptions.values()).filter(
      (sub) => {
        // Type filter
        if (sub.filter && sub.filter !== message.type) return false
        // Source filter
        if (sub.sourceFilter && sub.sourceFilter !== message.source) return false
        // Target filter — "*" means receive all
        if (sub.targetFilter && sub.targetFilter !== "*" && sub.targetFilter !== message.target) return false
        return true
      }
    )

    // Deliver to matching subscribers
    const deliverPromises = matchingSubscriptions.map(async (sub) => {
      try {
        await sub.handler(message)
      } catch (error) {
        this.stats.totalErrors++
        this.addLogEntry({
          entryType: "error",
          source: sub.id,
          summary: `Message handler error: ${(error as Error).message}`,
          details: { messageId: message.id, error: (error as Error).message },
          correlationId: message.correlationId,
        })
      }
    })

    await Promise.allSettled(deliverPromises)

    message.delivered = true
    this.stats.totalMessagesDelivered++

    // Mark target agent as active if it's registered
    if (message.target !== "*" && this.agents.has(message.target)) {
      this.markAgentActive(message.target)
    }

    this.addLogEntry({
      entryType: "message_received",
      source: message.target === "*" ? "broadcast" : message.target,
      summary: `Message delivered: ${message.type}`,
      details: { messageId: message.id, subscriberCount: matchingSubscriptions.length },
      correlationId: message.correlationId,
    })

    this.emitEvent({ type: "message_delivered", messageId: message.id })
  }

  // ============================================================
  // Action Execution (via AgentServiceBridge)
  // ============================================================

  /**
   * Execute an agent action through the service bridge.
   * This is the primary way agents perform real work: sending WhatsApp
   * messages, querying CRM, processing documents, etc.
   *
   * All action execution is logged and traced through the Central Brain.
   */
  async executeAction(
    agentType: string,
    action: string,
    context: {
      sessionId: string
      objective: string
      startTime: number
    } & {
      userPersonalization?: import("./agent-service-bridge").UserPersonalizationContext
    },
    options: { correlationId?: string; userId?: string } = {}
  ): Promise<ServiceActionResult> {
    const startTime = Date.now()
    const correlationId = options.correlationId || `action-${Date.now()}`

    // Enrich context with user personalization if userId is provided
    const enrichedContext = { ...context }
    if (options.userId) {
      try {
        const { getCachedUserPersonalization } = await import("./agent-service-bridge")
        enrichedContext.userPersonalization = await getCachedUserPersonalization(options.userId)
      } catch (e) {
        console.error("[CentralBrain] Failed to load personalization context:", e)
      }
    }

    // Mark agent as active
    this.markAgentActive(agentType)

    this.emitEvent({
      type: "action_executing",
      agentType,
      action,
      correlationId,
    })

    // Send a message through the bus to signal execution start
    this.sendMessage({
      source: "central-brain",
      target: agentType,
      type: "action:execute",
      payload: { action, context: enrichedContext },
      priority: "high",
      correlationId,
    })

    try {
      const result = await executeAgentServiceAction(agentType, action, enrichedContext)

      const durationMs = Date.now() - startTime

      if (result.success) {
        this.stats.totalActionsExecuted++
        this.addLogEntry({
          entryType: "action_executed",
          source: agentType,
          summary: `Action executed: ${action.substring(0, 80)}`,
          details: { action, result: result.summary, metrics: result.metrics },
          durationMs,
          correlationId,
        })
      } else {
        this.stats.totalActionsFailed++
        this.addLogEntry({
          entryType: "action_failed",
          source: agentType,
          summary: `Action failed: ${action.substring(0, 80)} — ${result.summary}`,
          details: { action, result, errors: result.errors },
          durationMs,
          correlationId,
        })
      }

      this.emitEvent({
        type: "action_completed",
        agentType,
        action,
        success: result.success,
        durationMs,
        correlationId,
      })

      // Send completion message through the bus
      this.sendMessage({
        source: agentType,
        target: "central-brain",
        type: "action:completed",
        payload: { action, success: result.success, summary: result.summary },
        priority: "medium",
        correlationId,
      })

      this.markAgentIdle(agentType)
      return result
    } catch (error) {
      const durationMs = Date.now() - startTime
      this.stats.totalActionsFailed++
      this.stats.totalErrors++

      this.addLogEntry({
        entryType: "action_failed",
        source: agentType,
        summary: `Action threw: ${action.substring(0, 80)} — ${(error as Error).message}`,
        details: { action, error: (error as Error).message },
        durationMs,
        correlationId,
      })

      this.emitEvent({
        type: "error",
        source: agentType,
        error: (error as Error).message,
        correlationId,
      })

      this.markAgentError(agentType)

      return {
        success: false,
        summary: `Central Brain execution error for ${agentType}: ${(error as Error).message}`,
        errors: [(error as Error).message],
      }
    }
  }

  // ============================================================
  // Orchestration API
  // ============================================================

  /**
   * Run a multi-agent orchestration.
   * Routes the objective through the message bus, collects results
   * from each agent, and returns the aggregated outcome.
   *
   * This is the high-level API used by HermesAgent's LangGraph workflow.
   */
  async runOrchestration(
    objective: string,
    actions: Array<{
      agentType: string
      action: string
      reasoning: string
      priority: MessagePriority
    }>,
    context: {
      operationId: string
      startTime: number
      userId?: string
    }
  ): Promise<{
    results: Array<{
      agentType: string
      action: string
      success: boolean
      summary: string
      details?: string
      durationMs: number
    }>
    errors: string[]
  }> {
    const correlationId = `orch-${context.operationId}`
    const results: Array<{
      agentType: string
      action: string
      success: boolean
      summary: string
      details?: string
      durationMs: number
    }> = []
    const errors: string[] = []

    // Track the orchestration
    trackFeatureUsed(context.userId || "system", "orchestration_started")
    this.emitEvent({
      type: "orchestration_started",
      workflowId: context.operationId,
      objective,
    })

    this.addLogEntry({
      entryType: "event",
      source: "central-brain",
      summary: `Orchestration started: ${objective.substring(0, 120)}`,
      details: { actionsCount: actions.length, actions },
      correlationId,
    })

    // Broadcast the objective to all relevant agents
    this.sendMessage({
      source: "central-brain",
      target: "*",
      type: "orchestration:start",
      payload: { objective, actions },
      priority: "high",
      correlationId,
    })

    // Execute each action sequentially (in priority order)
    const sortedActions = [...actions].sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      return (order[a.priority] || 2) - (order[b.priority] || 2)
    })

    for (const actionDef of sortedActions) {
      const actionStart = Date.now()

      try {
        const result = await this.executeAction(
          actionDef.agentType,
          actionDef.action,
          {
            sessionId: context.operationId,
            objective,
            startTime: context.startTime,
          },
          { correlationId }
        )

        results.push({
          agentType: actionDef.agentType,
          action: actionDef.action,
          success: result.success,
          summary: result.summary,
          details: result.details,
          durationMs: Date.now() - actionStart,
        })

        if (!result.success && result.errors) {
          errors.push(...result.errors)
        }
      } catch (error) {
        const durationMs = Date.now() - actionStart
        const errorMsg = (error as Error).message
        results.push({
          agentType: actionDef.agentType,
          action: actionDef.action,
          success: false,
          summary: `Execution failed: ${errorMsg}`,
          durationMs,
        })
        errors.push(`[${actionDef.agentType}] ${actionDef.action}: ${errorMsg}`)
      }
    }

    // Broadcast completion
    this.sendMessage({
      source: "central-brain",
      target: "*",
      type: "orchestration:completed",
      payload: {
        objective,
        resultsCount: results.length,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length,
      },
      priority: "medium",
      correlationId,
    })

    this.emitEvent({
      type: "orchestration_completed",
      workflowId: context.operationId,
      status: errors.length === 0 ? "completed" : "completed_with_errors",
      durationMs: Date.now() - context.startTime,
    })

    this.addLogEntry({
      entryType: "event",
      source: "central-brain",
      summary: `Orchestration completed: ${results.filter((r) => r.success).length}/${results.length} actions succeeded`,
      details: { results, errorsCount: errors.length },
      correlationId,
    })

    return { results, errors }
  }

  // ============================================================
  // Insight & Memory Integration
  // ============================================================

  /**
   * Add an insight to agent memory and log it through the Central Brain.
   */
  async addInsight(
    agentType: AgentType,
    title: string,
    description: string,
    category: AgentInsight["category"] = "insight",
    metadata: Record<string, any> = {}
  ): Promise<AgentInsight> {
    const insight = await agentMemory.addInsight(agentType, title, description, category, metadata)

    this.addLogEntry({
      entryType: "insight_generated",
      source: agentType,
      summary: `Insight: ${title}`,
      details: { description, category, metadata },
      correlationId: metadata.correlationId,
    })

    this.emitEvent({ type: "insight_discovered", insight })

    return insight
  }

  /**
   * Analyze a pattern and optionally store as insight.
   */
  async analyzePattern(newData: string, sourceAgent: AgentType): Promise<AgentInsight | null> {
    return agentMemory.analyzePattern(newData, sourceAgent)
  }

  /**
   * Generate a report for an agent type.
   */
  async generateReport(
    agentType: AgentType,
    periodStart: number,
    periodEnd: number,
    actions: Array<{ action: string; result: string; impact: string }>,
    metrics: Record<string, number>
  ): Promise<AgentReport> {
    return agentMemory.generateReport(agentType, periodStart, periodEnd, actions, metrics)
  }

  /**
   * Search insights across all agent memory.
   */
  async searchInsights(query: string, k: number = 5): Promise<AgentInsight[]> {
    return agentMemory.searchInsights(query, k)
  }

  /**
   * Get all reports from agent memory.
   */
  getAllReports(): AgentReport[] {
    return agentMemory.getAllReports()
  }

  /**
   * Get reports for a specific agent type.
   */
  getReports(agentType: AgentType): AgentReport[] {
    return agentMemory.getReports(agentType)
  }

  /**
   * Get insights for a specific agent type.
   */
  getInsightsByAgent(agentType: AgentType): AgentInsight[] {
    return agentMemory.getInsightsByAgent(agentType)
  }

  /**
   * Apply an insight (increment its applied count).
   */
  applyInsight(insightId: string): void {
    return agentMemory.applyInsight(insightId)
  }

  // ============================================================
  // Communication Log
  // ============================================================

  /**
   * Add an entry to the communication log.
   * Automatically trims to MAX_LOG_ENTRIES and persists to the database.
   */
  private addLogEntry(entry: Omit<LogEntry, "id" | "timestamp">): void {
    const logEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    }

    this.logEntries.unshift(logEntry)

    // Trim to max entries
    if (this.logEntries.length > this.MAX_LOG_ENTRIES) {
      this.logEntries = this.logEntries.slice(0, this.MAX_LOG_ENTRIES)
    }

    this.emitEvent({ type: "log_entry", entry: logEntry })

    // Persist to database (async, non-blocking)
    this.persistLogEntry(logEntry).catch(() => {
      // Non-critical — in-memory fallback is sufficient for runtime
    })
  }

  /**
   * Persist a log entry to the database.
   * Runs asynchronously and does not block the caller.
   */
  private async persistLogEntry(entry: LogEntry): Promise<void> {
    try {
      const { prisma } = await import("./db")
      await prisma.communicationLogEntry.create({
        data: {
          id: entry.id,
          entryType: entry.entryType,
          source: entry.source,
          summary: entry.summary.substring(0, 500),
          details: entry.details ? JSON.stringify(entry.details).substring(0, 5000) : null,
          durationMs: entry.durationMs ?? null,
          correlationId: entry.correlationId ?? null,
          timestamp: new Date(entry.timestamp),
        },
      })
    } catch {
      // Non-fatal — in-memory log is still available
    }
  }

  /**
   * Get paginated log entries.
   */
  getLogEntries(options: {
    limit?: number
    offset?: number
    source?: string
    entryType?: LogEntry["entryType"]
    since?: number
  } = {}): LogEntry[] {
    let entries = this.logEntries

    if (options.source) {
      entries = entries.filter((e) => e.source === options.source)
    }
    if (options.entryType) {
      entries = entries.filter((e) => e.entryType === options.entryType)
    }
    if (options.since) {
      entries = entries.filter(
        (e) => new Date(e.timestamp).getTime() >= options.since!
      )
    }

    const offset = options.offset || 0
    const limit = options.limit || 100

    return entries.slice(offset, offset + limit)
  }

  /**
   * Get total log entry count.
   */
  getLogEntryCount(): number {
    return this.logEntries.length
  }

  /**
   * Clear the communication log.
   */
  clearLog(): void {
    this.logEntries = []
  }

  // ============================================================
  // Event System
  // ============================================================

  /**
   * Subscribe to Central Brain lifecycle events (agent registration, action execution, etc.).
   */
  onEvent(listener: CentralBrainListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Emit an event to all listeners.
   */
  private emitEvent(event: CentralBrainEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {
        // Silent — never let a listener throw affect other listeners
      }
    }
  }

  // ============================================================
  // Statistics & Status
  // ============================================================

  /**
   * Get Central Brain statistics.
   */
  getStats() {
    return {
      ...this.stats,
      uptimeMs: Date.now() - this.stats.startedAt,
      registeredAgents: this.agents.size,
      activeSubscriptions: this.subscriptions.size,
      queuedMessages: this.messageQueue.length,
      logEntryCount: this.logEntries.length,
    }
  }

  /**
   * Get a full system status report.
   */
  getSystemReport() {
    return {
      stats: this.getStats(),
      agents: this.getAgentStatuses(),
      recentLogs: this.logEntries.slice(0, 20),
    }
  }

  /**
   * Reset all state (for testing).
   */
  reset(): void {
    this.agents.clear()
    this.subscriptions.clear()
    this.messageQueue = []
    this.logEntries = []
    this.listeners.clear()
    this.stats = {
      totalMessagesSent: 0,
      totalMessagesDelivered: 0,
      totalActionsExecuted: 0,
      totalActionsFailed: 0,
      totalErrors: 0,
      startedAt: Date.now(),
    }
    this.processingQueue = false

    // Re-register default agents
    this.registerAgent("orchestrator", {
      displayName: "Hermes Orchestrator",
      description: "Coordinates all agents and routes messages",
      capabilities: [
        { name: "orchestrate", description: "Run multi-agent workflows" },
        { name: "route-messages", description: "Route messages between agents" },
        { name: "monitor-system", description: "Monitor all agent health and status" },
      ],
      status: "active",
    })

    this.registerAgent("system", {
      displayName: "System",
      description: "Built-in system utilities",
      capabilities: [
        { name: "heartbeat", description: "System health check" },
        { name: "broadcast", description: "Broadcast to all agents" },
      ],
      status: "active",
    })
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const centralBrain = new HermesCentralBrain()
export default HermesCentralBrain
