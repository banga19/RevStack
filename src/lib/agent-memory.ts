/**
 * Agent Memory & Shared Learning System
 *
 * Polsia-inspired shared memory that allows all agents to learn from each other.
 * When one agent discovers a pattern or insight, it's shared across all agents.
 */

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { Document } from "@langchain/core/documents"
import { z } from "zod"

// ============================================================
// Types
// ============================================================

export type AgentType = "lead" | "trade" | "compliance" | "onboarding" | "revenue" | "orchestrator"

export interface AgentInsight {
  id: string
  agentType: AgentType
  timestamp: number
  title: string
  description: string
  category: "pattern" | "anomaly" | "optimization" | "insight" | "alert"
  relevanceScore: number // 0-1
  metadata: Record<string, any>
  appliedCount: number
}

export interface AgentMemory {
  insights: AgentInsight[]
  context: Record<string, any>
  lastUpdated: number
}

export interface AgentReport {
  id: string
  agentType: AgentType
  timestamp: number
  period: { start: number; end: number }
  title: string
  summary: string
  actions: Array<{
    action: string
    result: string
    impact: string
  }>
  metrics: Record<string, number>
  insights: string[]
  nextActions: string[]
}

export interface GodModeConfig {
  duration: number // in milliseconds
  objective: string
  agents: AgentType[]
  checkInterval: number // how often to report back, in ms
}

// ============================================================
// Agent Memory System
// ============================================================

class AgentMemorySystem {
  private memory: AgentMemory
  private vectorStore: MemoryVectorStore
  private llm: ChatOpenAI
  private reportHistory: Map<string, AgentReport[]>
  private listeners: Array<(memory: AgentMemory) => void>

  constructor() {
    this.memory = {
      insights: [],
      context: {
        version: "1.0.0",
        initializedAt: Date.now(),
        totalAgentRuns: 0,
        insightsDiscovered: 0,
      },
      lastUpdated: Date.now(),
    }
    this.vectorStore = new MemoryVectorStore(new OpenAIEmbeddings())
    this.llm = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0.7 })
    this.reportHistory = new Map()
    this.listeners = []
  }

  // ==========================================================
  // Insight Management
  // ==========================================================

  async addInsight(
    agentType: AgentType,
    title: string,
    description: string,
    category: AgentInsight["category"] = "insight",
    metadata: Record<string, any> = {}
  ): Promise<AgentInsight> {
    const insight: AgentInsight = {
      id: `insight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      agentType,
      timestamp: Date.now(),
      title,
      description,
      category,
      relevanceScore: 0.8,
      metadata,
      appliedCount: 0,
    }

    // Check for duplicate insights
    const isDuplicate = this.memory.insights.some(
      (i) => i.title.toLowerCase() === title.toLowerCase()
    )
    if (isDuplicate) return this.memory.insights.find((i) => i.title.toLowerCase() === title.toLowerCase())!

    this.memory.insights.push(insight)
    this.memory.context.insightsDiscovered++
    this.memory.lastUpdated = Date.now()

    // Add to vector store for semantic search
    await this.vectorStore.addDocuments([
      new Document({
        pageContent: `${title}: ${description}`,
        metadata: {
          insightId: insight.id,
          agentType,
          category,
          timestamp: insight.timestamp,
        },
      }),
    ])

    this.notifyListeners()
    return insight
  }

  async searchInsights(query: string, k: number = 5): Promise<AgentInsight[]> {
    const results = await this.vectorStore.similaritySearch(query, k)
    return results
      .map((doc) => this.memory.insights.find((i) => i.id === doc.metadata.insightId))
      .filter((i): i is AgentInsight => i !== undefined)
  }

  getInsightsByAgent(agentType: AgentType): AgentInsight[] {
    return this.memory.insights.filter((i) => i.agentType === agentType)
  }

  getInsightsByCategory(category: AgentInsight["category"]): AgentInsight[] {
    return this.memory.insights.filter((i) => i.category === category)
  }

  applyInsight(insightId: string): void {
    const insight = this.memory.insights.find((i) => i.id === insightId)
    if (insight) {
      insight.appliedCount++
      insight.relevanceScore = Math.min(1, insight.relevanceScore + 0.05)
    }
  }

  // ==========================================================
  // Report Generation
  // ==========================================================

  async generateReport(
    agentType: AgentType,
    periodStart: number,
    periodEnd: number,
    actions: Array<{ action: string; result: string; impact: string }>,
    metrics: Record<string, number>,
    insightIds: string[] = []
  ): Promise<AgentReport> {
    const relevantInsights = insightIds
      .map((id) => this.memory.insights.find((i) => i.id === id))
      .filter((i): i is AgentInsight => i !== undefined)

    const insightSummaries = relevantInsights.map(
      (i) => `- ${i.title}: ${i.description}`
    )

    // Generate AI-powered summary
    const summaryPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are an AI agent report writer. Summarize the agent's actions, results, and next steps in a clear, actionable format.",
      ],
      [
        "human",
        `Agent: ${agentType}
Period: ${new Date(periodStart).toLocaleString()} - ${new Date(periodEnd).toLocaleString()}
Actions: ${JSON.stringify(actions)}
Metrics: ${JSON.stringify(metrics)}
Insights: ${insightSummaries.join("\n")}

Generate a concise executive summary of what was accomplished.`,
      ],
    ])

    const chain = summaryPrompt.pipe(this.llm).pipe(new StringOutputParser())
    const summary = await chain.invoke({})

    // Generate next actions
    const nextActionsPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "Based on the agent's performance and insights, suggest the next most important actions to take.",
      ],
      [
        "human",
        `Agent: ${agentType}
Actions done: ${JSON.stringify(actions)}
Metrics: ${JSON.stringify(metrics)}
Insights: ${insightSummaries.join("\n")}

Suggest 3-5 next actions this agent should take.`,
      ],
    ])

    const nextChain = nextActionsPrompt.pipe(this.llm).pipe(new StringOutputParser())
    const nextActionsRaw = await nextChain.invoke({})
    const nextActions = nextActionsRaw
      .split("\n")
      .filter((line) => line.match(/^\d+\./))
      .map((line) => line.replace(/^\d+\.\s*/, ""))

    const report: AgentReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      agentType,
      timestamp: Date.now(),
      period: { start: periodStart, end: periodEnd },
      title: `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent Report`,
      summary,
      actions,
      metrics,
      insights: relevantInsights.map((i) => i.title),
      nextActions,
    }

    // Store report
    const existing = this.reportHistory.get(agentType) || []
    existing.unshift(report)
    this.reportHistory.set(agentType, existing.slice(0, 50)) // Keep last 50 reports

    return report
  }

  getReports(agentType: AgentType): AgentReport[] {
    return this.reportHistory.get(agentType) || []
  }

  getAllReports(): AgentReport[] {
    const all: AgentReport[] = []
    for (const reports of this.reportHistory.values()) {
      all.push(...reports)
    }
    return all.sort((a, b) => b.timestamp - a.timestamp)
  }

  // ==========================================================
  // Context Management
  // ==========================================================

  updateContext(updates: Record<string, any>): void {
    this.memory.context = { ...this.memory.context, ...updates }
    this.memory.lastUpdated = Date.now()
    this.notifyListeners()
  }

  getContext(): Record<string, any> {
    return { ...this.memory.context }
  }

  getMemory(): AgentMemory {
    return { ...this.memory, insights: [...this.memory.insights] }
  }

  // ==========================================================
  // Learning & Pattern Recognition
  // ==========================================================

  async analyzePattern(newData: string, sourceAgent: AgentType): Promise<AgentInsight | null> {
    try {
      // Use structured output with Zod schema for robust parsing
      const PatternSchema = z.object({
        hasInsight: z.boolean(),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["pattern", "anomaly", "optimization", "alert"]).optional(),
      })

      const analysisPrompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          "You are analyzing data from an AI agent to discover patterns, anomalies, and optimization opportunities. " +
          "Respond with structured data.",
        ],
        [
          "human",
          `Agent: ${sourceAgent}
Data: ${newData}

Analyze this data. Is there any notable pattern, anomaly, or optimization opportunity?`,
        ],
      ])

      const structuredLlm = this.llm.withStructuredOutput(PatternSchema)
      const chain = analysisPrompt.pipe(structuredLlm)
      const result = await chain.invoke({})

      if (!result.hasInsight || !result.title || !result.description || !result.category) {
        return null
      }

      return await this.addInsight(
        sourceAgent,
        result.title,
        result.description,
        result.category,
        { sourceData: newData.substring(0, 200) }
      )
    } catch {
      return null
    }
  }

  // ==========================================================
  // Subscription
  // ==========================================================

  subscribe(listener: (memory: AgentMemory) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners(): void {
    const memoryCopy = this.getMemory()
    this.listeners.forEach((listener) => {
      try {
        listener(memoryCopy)
      } catch (error) {
        console.error("Error in agent memory listener:", error)
      }
    })
  }

  // ==========================================================
  // Summary
  // ==========================================================

  getSummary(): string {
    return [
      `Agent Memory System Summary`,
      `- Total Insights: ${this.memory.insights.length}`,
      `- Total Reports: ${this.getAllReports().length}`,
      `- Agents Active: ${new Set(this.memory.insights.map((i) => i.agentType)).size}`,
      `- Last Updated: ${new Date(this.memory.lastUpdated).toLocaleString()}`,
    ].join("\n")
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const agentMemory = new AgentMemorySystem()
export default AgentMemorySystem
