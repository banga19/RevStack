/**
 * Hermes Agent — Supervisory Autonomous Agent
 *
 * Hermes is the top-level orchestrator that:
 * 1. Uses RAG pipeline to retrieve business context about the current state
 * 2. Plans a multi-agent workflow using LangChain LLM reasoning
 * 3. Delegates execution to agent-service-bridge (WATI, Zoho, QMe, etc.)
 * 4. Stores insights and learns across sessions via agent memory
 * 5. Uses LangGraph StateGraph for stateful, auditable execution
 *
 * Unlike God Mode (which is session/task based), Hermes is context-aware:
 * it queries the business knowledge base before planning, adapts its plan
 * based on real-time data, and stores patterns for future runs.
 */

import { StringOutputParser } from "@langchain/core/output_parsers"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { Annotation, StateGraph } from "@langchain/langgraph"
import { agentMemory, type AgentType, type AgentInsight, type AgentReport } from "./agent-memory"
import { createPlannerLlm, createAnalystLlm } from "./model-provider"
import { ragPipeline } from "./rag-pipeline"
import {
  executeAgentServiceAction,
  type ServiceActionResult,
} from "./agent-service-bridge"
import { trackGodModeDeployed, trackFeatureUsed } from "./analytics"

// ============================================================
// Types
// ============================================================

export type HermesPriority = "critical" | "high" | "medium" | "low"

export interface HermesPlannedAction {
  agentType: AgentType
  action: string
  reasoning: string
  priority: HermesPriority
  estimatedDuration: string
}

export interface HermesActionResult {
  action: HermesPlannedAction
  result: ServiceActionResult
  duration: number // ms
}

export interface HermesOperation {
  id: string
  objective: string
  status: "planning" | "running" | "completed" | "failed"
  context: string
  plannedActions: HermesPlannedAction[]
  results: HermesActionResult[]
  insights: AgentInsight[]
  errors: string[]
  startedAt: number
  completedAt?: number
  userId?: string
}

// ============================================================
// LangGraph State
// ============================================================

const HermesState = Annotation.Root({
  objective: Annotation<string>,
  context: Annotation<string>,
  plannedActions: Annotation<HermesPlannedAction[]>,
  currentActionIndex: Annotation<number>,
  results: Annotation<HermesActionResult[]>,
  errors: Annotation<string[]>,
  insights: Annotation<AgentInsight[]>,
  completed: Annotation<boolean>,
  operationId: Annotation<string>,
  startTime: Annotation<number>,
})

// ============================================================
// LLM (shared across all graph nodes)
// ============================================================

const plannerLlm = createPlannerLlm()
const analystLlm = createAnalystLlm()

// ============================================================
// Graph Node Functions
// ============================================================

/**
 * Step 1: Retrieve relevant context from the RAG knowledge base.
 * Queries business documents, past agent reports, and operational data
 * to inform planning.
 */
async function retrieveContext(state: typeof HermesState.State) {
  try {
    // Search the RAG knowledge base for documents relevant to the objective
    const docs = await ragPipeline.searchDocuments(state.objective, { k: 5 })

    // Also search agent memory for relevant past insights
    const insights = await agentMemory.searchInsights(state.objective, 3)

    let context = ""

    if (docs.length > 0) {
      context += "=== RELEVANT KNOWLEDGE BASE DOCUMENTS ===\n"
      context += docs
        .map((doc, i) => `[Document ${i + 1}]: ${doc.pageContent.substring(0, 1000)}`)
        .join("\n\n")
    }

    if (insights.length > 0) {
      context += "\n\n=== PAST AGENT INSIGHTS ===\n"
      context += insights
        .map(
          (insight, i) =>
            `[Insight ${i + 1}] ${insight.title} (${insight.agentType}, ${insight.category}): ${insight.description}`
        )
        .join("\n")
    }

    if (!context) {
      context = "No relevant context found in knowledge base or agent memory."
    }

    return { context }
  } catch (error) {
    return { context: `Context retrieval unavailable: ${(error as Error).message}` }
  }
}

/**
 * Step 2: Plan the multi-agent workflow using LLM reasoning.
 * Analyzes the objective + context to decide which agents to invoke,
 * in what order, and with what specific actions.
 */
async function planWorkflow(state: typeof HermesState.State) {
  const agentsDescription = [
    "lead — Lead Agent: Qualifies leads, sends WhatsApp follow-ups via WATI, syncs to Zoho CRM, launches Instantly.ai outreach campaigns",
    "trade — Trade Agent: Runs supplier matching against Korean buyer profiles, checks Sokogate platform, analyzes trade corridors",
    "compliance — Compliance Agent: Reviews expiring certifications via QMe document processing, sends Make.com compliance alerts, runs Voiceflow checks",
    "onboarding — Onboarding Agent: Follows up with stuck clients via email, creates QMe document workflows, syncs to Zoho CRM, triggers Make.com sequences",
    "revenue — Revenue Agent: Computes financial metrics, stores in RAG knowledge base, syncs to Zoho CRM deals, triggers Make.com reporting",
  ].join("\n")

  const planningPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are Hermes, the supervisory agent for Mapato's B2B trade operations platform. " +
      "Your job is to analyze the given objective along with retrieved business context, " +
      "and plan the optimal sequence of agent actions. Consider dependencies between agents " +
      "(e.g., leads should be qualified before onboarding; compliance checks help with trade matching). " +
      "Return a numbered plan with each step formatted as: AGENT_TYPE|ACTION|REASONING|PRIORITY|DURATION",
    ],
    [
      "human",
      `Objective: ${state.objective}

Retrieved Context:
${state.context || "No context available"}

Available Agents:
${agentsDescription}

Plan the sequence of agent actions. Consider:
1. Which agents are relevant to this objective?
2. What specific, concrete actions should each take?
3. In what order should they run?
4. What priority level?

Format each step as: AGENT_TYPE|ACTION|REASONING|PRIORITY|DURATION

PRIORITY must be one of: critical, high, medium, low
DURATION is an estimate like "5 min", "30 min", "2 hours"

Example:
lead|Qualify all unprocessed leads and send WATI follow-ups|3 new leads from demo requests|high|30 min`,
    ],
  ])

  const chain = planningPrompt.pipe(plannerLlm).pipe(new StringOutputParser())
  const plan = await chain.invoke({})

  // Parse the plan into structured actions
  const lines = plan.split("\n").filter((l) => l.match(/^\d+\.|[-*]/) || l.includes("|"))
  const parsed: HermesPlannedAction[] = []

  for (const line of lines) {
    // Remove numbering/bullets
    const clean = line.replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, "").trim()
    if (!clean.includes("|")) continue

    const parts = clean.split("|").map((p) => p.trim())
    const agentType = parts[0]?.toLowerCase() as AgentType
    const validAgents: AgentType[] = ["lead", "trade", "compliance", "onboarding", "revenue", "orchestrator"]

    parsed.push({
      agentType: validAgents.includes(agentType) ? agentType : "orchestrator",
      action: parts[1] || "Execute autonomous operations",
      reasoning: parts[2] || "Based on system analysis",
      priority: (["critical", "high", "medium", "low"].includes(parts[3]?.toLowerCase())
        ? parts[3].toLowerCase()
        : "medium") as HermesPriority,
      estimatedDuration: parts[4] || "30 min",
    })
  }

  // If parsing failed, fall back to a default plan
  const actions = parsed.length > 0 ? parsed : [
    {
      agentType: "lead" as AgentType,
      action: "Qualify unprocessed leads and send WhatsApp follow-ups via WATI",
      reasoning: "Lead qualification is the first step in the pipeline",
      priority: "high" as HermesPriority,
      estimatedDuration: "30 min",
    },
    {
      agentType: "compliance" as AgentType,
      action: "Check certification expiry dates and send renewal alerts via QMe and Make.com",
      reasoning: "Compliance status affects trade readiness",
      priority: "medium" as HermesPriority,
      estimatedDuration: "20 min",
    },
    {
      agentType: "trade" as AgentType,
      action: "Scan for new supplier-buyer matches using Sokogate and internal matching engine",
      reasoning: "Trade matching creates new revenue opportunities",
      priority: "medium" as HermesPriority,
      estimatedDuration: "15 min",
    },
    {
      agentType: "onboarding" as AgentType,
      action: "Follow up with clients stuck in onboarding, send email reminders, sync to Zoho CRM",
      reasoning: "Improve activation rate for existing signups",
      priority: "high" as HermesPriority,
      estimatedDuration: "25 min",
    },
    {
      agentType: "revenue" as AgentType,
      action: "Calculate revenue metrics and store in RAG knowledge base",
      reasoning: "Track financial health of the platform",
      priority: "low" as HermesPriority,
      estimatedDuration: "10 min",
    },
  ]

  return {
    plannedActions: actions,
    currentActionIndex: 0,
    results: [],
    errors: [],
    insights: [],
    completed: false,
  }
}

/**
 * Step 3: Execute ALL planned actions via the agent service bridge.
 * Loops through every action in sequence, collecting results and errors.
 * This avoids needing conditional graph edges (which are version-dependent)
 * while still providing per-action result granularity.
 */
async function executeAction(state: typeof HermesState.State) {
  const results: HermesActionResult[] = [...(state.results || [])]
  const errors: string[] = [...(state.errors || [])]
  const insights: AgentInsight[] = [...(state.insights || [])]

  for (const action of state.plannedActions) {
    const actionStart = Date.now()

    try {
      // Execute via the service bridge — this calls real integrations
      const result = await executeAgentServiceAction(
        action.agentType,
        action.action,
        {
          sessionId: state.operationId,
          objective: state.objective,
          startTime: state.startTime,
        }
      )

      const executionResult: HermesActionResult = {
        action,
        result,
        duration: Date.now() - actionStart,
      }

      results.push(executionResult)

      // Analyze the result for insights via agent memory
      if (result.success && result.details) {
        try {
          const insight = await agentMemory.analyzePattern(
            result.details.substring(0, 2000),
            action.agentType
          )
          if (insight) {
            insights.push(insight)
          }
        } catch {
          // Pattern analysis is non-critical — continue
        }
      }
    } catch (error) {
      const errorMsg = (error as Error).message
      results.push({
        action,
        result: {
          success: false,
          summary: `Execution failed: ${errorMsg}`,
          errors: [errorMsg],
        },
        duration: Date.now() - actionStart,
      })
      errors.push(`[${action.agentType}] ${action.action}: ${errorMsg}`)
    }
  }

  return {
    results,
    errors,
    insights,
    currentActionIndex: state.plannedActions.length,
    completed: true,
  }
}

/**
 * Step 4: Final analysis — generate a consolidated report and store in agent memory.
 */
async function finalizeOperation(state: typeof HermesState.State) {
  const successfulResults = state.results.filter((r) => r.result.success)
  const failedResults = state.results.filter((r) => !r.result.success)
  const totalDuration = Date.now() - state.startTime

  // Generate a summary report and store in agent memory
  if (successfulResults.length > 0) {
    try {
      // Group by agent type
      const agentTypes = [...new Set(successfulResults.map((r) => r.action.agentType))]

      for (const agentType of agentTypes) {
        const agentResults = successfulResults.filter((r) => r.action.agentType === agentType)
        await agentMemory.generateReport(
          agentType,
          state.startTime,
          Date.now(),
          agentResults.map((r) => ({
            action: r.action.action,
            result: r.result.summary,
            impact: r.result.details
              ? r.result.details.substring(0, 200)
              : "Executed successfully",
          })),
          {
            tasksCompleted: agentResults.length,
            tasksFailed: failedResults.filter((r) => r.action.agentType === agentType).length,
            duration: totalDuration / 1000,
          }
        )
      }
    } catch {
      // Report generation is non-critical
    }
  }

  // Generate a high-level orchestration insight
  if (successfulResults.length > 0) {
    const summaryLine = `Hermes operation "${state.objective.substring(0, 80)}": ` +
      `${successfulResults.length}/${state.results.length} agent actions completed in ${(totalDuration / 1000).toFixed(0)}s`

    try {
      await agentMemory.addInsight(
        "orchestrator",
        "Hermes operation completed",
        summaryLine,
        "insight",
        {
          operationId: state.operationId,
          totalActions: state.results.length,
          successfulActions: successfulResults.length,
          failedActions: failedResults.length,
          duration: totalDuration,
          objective: state.objective,
        }
      )
    } catch {
      // Non-critical
    }
  }

  return { completed: true }
}

// ============================================================
// Build the LangGraph Workflow
// ============================================================

function buildHermesWorkflow() {
  const workflow = new StateGraph(HermesState)
    .addNode("retrieveContext", retrieveContext)
    .addNode("planWorkflow", planWorkflow)
    .addNode("executeAction", executeAction)
    .addNode("finalizeOperation", finalizeOperation)

    // Linear pipeline: context → plan → execute → finalize
    .addEdge("__start__", "retrieveContext")
    .addEdge("retrieveContext", "planWorkflow")
    .addEdge("planWorkflow", "executeAction")
    .addEdge("executeAction", "finalizeOperation")
    .addEdge("finalizeOperation", "__end__")

  return workflow.compile()
}

// ============================================================
// Hermes Agent Class
// ============================================================

class HermesAgent {
  private operations: Map<string, HermesOperation>
  private workflow: ReturnType<typeof buildHermesWorkflow>
  private listeners: Array<(operation: HermesOperation) => void>
  private analysisPromise: Promise<void> | null

  constructor() {
    this.operations = new Map()
    this.workflow = buildHermesWorkflow()
    this.listeners = []
    this.analysisPromise = null
  }

  // ==========================================================
  // Core: Run an Operation
  // ==========================================================

  /**
   * Run a Hermes autonomous operation.
   * This is the main entry point — it triggers the full LangGraph workflow.
   */
  async runOperation(
    objective: string,
    options: { userId?: string } = {}
  ): Promise<HermesOperation> {
    // Perform one-time startup analysis if not done yet (promise-guarded against races)
    if (!this.analysisPromise) {
      this.analysisPromise = this.runStartupAnalysis()
    }
    await this.analysisPromise

    const operation: HermesOperation = {
      id: `hermes-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      objective,
      status: "planning",
      context: "",
      plannedActions: [],
      results: [],
      insights: [],
      errors: [],
      startedAt: Date.now(),
      userId: options.userId,
    }

    this.operations.set(operation.id, operation)
    this.notifyListeners(operation)

    try {
      // Track the operation
      trackFeatureUsed(options.userId || "system", "hermes_operation_started")

      // Run the LangGraph workflow
      const initialState = {
        objective,
        context: "",
        plannedActions: [],
        currentActionIndex: 0,
        results: [],
        errors: [],
        insights: [],
        completed: false,
        operationId: operation.id,
        startTime: operation.startedAt,
      }

      const finalState = await this.workflow.invoke(initialState)

      // Update the operation with results
      operation.status = finalState.completed ? "completed" : "failed"
      operation.context = finalState.context || ""
      operation.plannedActions = finalState.plannedActions || []
      operation.results = finalState.results || []
      operation.insights = finalState.insights || []
      operation.errors = finalState.errors || []
      operation.completedAt = Date.now()

      this.operations.set(operation.id, operation)
      this.notifyListeners(operation)

      return operation
    } catch (error) {
      operation.status = "failed"
      operation.errors = [...operation.errors, (error as Error).message]
      operation.completedAt = Date.now()

      this.operations.set(operation.id, operation)
      this.notifyListeners(operation)

      return operation
    }
  }

  // ==========================================================
  // One-time Startup Analysis
  // ==========================================================

  /**
   * Run a one-time Hermes startup analysis that seeds the agent memory
   * with an initial understanding of the system state. This helps the
   * planner make better decisions on subsequent runs.
   */
  private async runStartupAnalysis(): Promise<void> {

    try {
      // Import prisma inline to avoid circular dependencies at module level
      const { prisma } = await import("./db")

      // Gather current system state
      const [leadCount, activeClientCount, onboardingCount, expiringCertCount, revenueData] =
        await Promise.all([
          prisma.client.count({ where: { status: "lead" } }),
          prisma.client.count({ where: { status: "active" } }),
          prisma.client.count({ where: { status: "onboarding" } }),
          prisma.clientCompliance.count({
            where: {
              status: "obtained",
              expiresAt: {
                lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
          }),
          prisma.revenueEntry.aggregate({ _sum: { amount: true } }),
        ])

      // Store as system insights in agent memory
      if (leadCount > 0) {
        await agentMemory.addInsight(
          "lead",
          `Hermes startup: ${leadCount} unprocessed leads in pipeline`,
          `There are ${leadCount} leads awaiting qualification. Hermes should prioritize lead agent actions in subsequent runs.`,
          "insight",
          { count: leadCount, source: "hermes-startup" }
        )
      }

      if (onboardingCount > 0) {
        await agentMemory.addInsight(
          "onboarding",
          `Hermes startup: ${onboardingCount} clients stuck in onboarding`,
          `${onboardingCount} clients have not completed onboarding. Hermes should send follow-ups and trigger Make.com sequences.`,
          "alert",
          { count: onboardingCount, source: "hermes-startup" }
        )
      }

      if (expiringCertCount > 0) {
        await agentMemory.addInsight(
          "compliance",
          `Hermes startup: ${expiringCertCount} certifications expiring within 30 days`,
          `Found ${expiringCertCount} certs approaching expiry. Compliance agent should prioritize QMe reviews and Make.com alerts.`,
          "alert",
          { count: expiringCertCount, source: "hermes-startup" }
        )
      }

      await agentMemory.addInsight(
        "orchestrator",
        "Hermes agent initialized",
        `System state at startup: ${leadCount} leads, ${activeClientCount} active clients, ${onboardingCount} stuck in onboarding, ${expiringCertCount} expiring certs, $${revenueData._sum.amount || 0} total revenue.`,
        "insight",
        {
          leadCount,
          activeClientCount,
          onboardingCount,
          expiringCertCount,
          totalRevenue: revenueData._sum.amount || 0,
          source: "hermes-startup",
        }
      )
    } catch {
      // Startup analysis is non-critical — Hermes can still operate without it
    }
  }

  // ==========================================================
  // Helpers: Standard Operations
  // ==========================================================

  /**
   * Quick lead sweep — qualifies leads, sends follow-ups, syncs to CRM.
   */
  async runLeadSweep(userId?: string): Promise<HermesOperation> {
    return this.runOperation(
      "Sweep all unprocessed leads: qualify via WATI, sync to Zoho CRM, " +
      "launch Instantly.ai outreach campaigns, and route qualified leads to pipeline.",
      { userId }
    )
  }

  /**
   * Full system health check — all agents run a standard diagnostic.
   */
  async runSystemHealthCheck(userId?: string): Promise<HermesOperation> {
    return this.runOperation(
      "Full system health check: scan leads, check compliance expiry, " +
      "review revenue metrics, check trade corridor matches, " +
      "and follow up with stuck onboarding clients.",
      { userId }
    )
  }

  // ==========================================================
  // Query Operations
  // ==========================================================

  getOperation(operationId: string): HermesOperation | undefined {
    return this.operations.get(operationId)
  }

  getAllOperations(): HermesOperation[] {
    return Array.from(this.operations.values()).sort(
      (a, b) => b.startedAt - a.startedAt
    )
  }

  getRecentOperations(limit: number = 10): HermesOperation[] {
    return this.getAllOperations().slice(0, limit)
  }

  getOperationsByStatus(status: HermesOperation["status"]): HermesOperation[] {
    return this.getAllOperations().filter((op) => op.status === status)
  }

  /**
   * Get a summary of the current system state for the operations page.
   */
  getSystemStatus(): {
    totalOperations: number
    lastOperation: HermesOperation | null
    runningOperation: HermesOperation | null
    insightsCount: number
    recentErrorCount: number
  } {
    const all = this.getAllOperations()
    const running = all.find((op) => op.status === "running")
    const lastOp = all[0] || null
    const recentErrors = all
      .slice(0, 5)
      .reduce((sum, op) => sum + op.errors.length, 0)

    return {
      totalOperations: all.length,
      lastOperation: lastOp,
      runningOperation: running || null,
      insightsCount: all.reduce((sum, op) => sum + op.insights.length, 0),
      recentErrorCount: recentErrors,
    }
  }

  // ==========================================================
  // Subscription
  // ==========================================================

  subscribe(listener: (operation: HermesOperation) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners(operation: HermesOperation): void {
    for (const listener of this.listeners) {
      try {
        listener(operation)
      } catch {
        // Silently skip failed listeners
      }
    }
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const hermesAgent = new HermesAgent()
export default HermesAgent
