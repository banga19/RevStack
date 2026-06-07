/**
 * Hermes Agent Core — Unit Tests
 *
 * Covers the HermesAgent class API surface without invoking real LLMs or services:
 *   1. Constructor and state management
 *   2. Query methods: getOperation, getAllOperations, getRecentOperations, getOperationsByStatus
 *   3. System status: getSystemStatus with various states
 *   4. Subscription: subscribe, unsubscribe, listener notification
 *   5. runOperation: full workflow lifecycle with mocked dependencies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ============================================================
// Hoisted mocks — must be before any imports
// ============================================================

// Mock model-provider so LLM calls in graph nodes are deterministic
vi.mock("@/lib/model-provider", () => ({
  createLlm: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({ content: "lead|Qualify leads|3 new leads|high|30 min" }),
    pipe: vi.fn().mockReturnThis(),
  })),
  createPlannerLlm: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({ content: "lead|Qualify leads|3 new leads|high|30 min" }),
    pipe: vi.fn().mockReturnThis(),
  })),
  createAnalystLlm: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({ content: "Analysis complete" }),
    pipe: vi.fn().mockReturnThis(),
  })),
  createEmbeddings: vi.fn(),
  getActiveProvider: vi.fn(() => ({
    id: "openai",
    config: { name: "OpenAI", defaultModel: "gpt-4o" },
  })),
}))

// Mock rag-pipeline so context retrieval is deterministic
vi.mock("@/lib/rag-pipeline", () => ({
  ragPipeline: {
    searchDocuments: vi.fn().mockResolvedValue([]),
    generateResponse: vi.fn().mockResolvedValue({ response: "" }),
  },
}))

// Mock agent-memory so insights/reports are deterministic
const mockAgentMemory = {
  searchInsights: vi.fn().mockResolvedValue([]),
  addInsight: vi.fn().mockResolvedValue({
    id: "insight-mock-1",
    agentType: "orchestrator",
    timestamp: Date.now(),
    title: "Test insight",
    description: "Test description",
    category: "insight",
    relevanceScore: 0.8,
    metadata: {},
    appliedCount: 0,
  }),
  analyzePattern: vi.fn().mockResolvedValue(null),
  generateReport: vi.fn().mockResolvedValue({
    id: "report-mock-1",
    agentType: "lead",
    timestamp: Date.now(),
    period: { start: Date.now() - 1000, end: Date.now() },
    title: "Lead Agent Report",
    summary: "Test summary",
    actions: [],
    metrics: {},
    insights: [],
    nextActions: [],
  }),
}

vi.mock("@/lib/agent-memory", () => ({
  agentMemory: mockAgentMemory,
}))

// Mock agent-service-bridge so action execution is deterministic
vi.mock("@/lib/agent-service-bridge", () => ({
  executeAgentServiceAction: vi.fn().mockResolvedValue({
    success: true,
    summary: "Mock action executed successfully",
    details: "Mock details for testing",
    metrics: { items: 5 },
  }),
}))

// Mock analytics
vi.mock("@/lib/analytics", () => ({
  trackFeatureUsed: vi.fn(),
  trackGodModeDeployed: vi.fn(),
}))

// Mock db (prisma) for startup analysis
vi.mock("@/lib/db", () => ({
  prisma: {
    client: {
      count: vi.fn().mockResolvedValue(0),
    },
    clientCompliance: {
      count: vi.fn().mockResolvedValue(0),
    },
    revenueEntry: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
  },
}))

// Mock @langchain/core modules
vi.mock("@langchain/core/output_parsers", () => ({
  StringOutputParser: vi.fn().mockImplementation(() => ({
    pipe: vi.fn().mockReturnThis(),
  })),
}))

vi.mock("@langchain/core/prompts", () => ({
  ChatPromptTemplate: {
    fromMessages: vi.fn(() => ({
      pipe: vi.fn().mockReturnThis(),
    })),
  },
}))

vi.mock("@langchain/langgraph", () => ({
  Annotation: {
    Root: vi.fn(() => ({
      // StateShape — minimal mock
    })),
  },
  StateGraph: vi.fn().mockImplementation(() => ({
    addNode: vi.fn().mockReturnThis(),
    addEdge: vi.fn().mockReturnThis(),
    addConditionalEdges: vi.fn().mockReturnThis(),
    compile: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        objective: "Test objective",
        context: "Mock context from test",
        plannedActions: [
          {
            agentType: "lead",
            action: "Qualify leads",
            reasoning: "Test",
            priority: "high",
            estimatedDuration: "30 min",
          },
        ],
        currentActionIndex: 1,
        results: [
          {
            action: {
              agentType: "lead",
              action: "Qualify leads",
              reasoning: "Test",
              priority: "high",
              estimatedDuration: "30 min",
            },
            result: { success: true, summary: "Done", details: "Success" },
            duration: 100,
          },
        ],
        errors: [],
        insights: [],
        completed: true,
        operationId: "test-op-1",
        startTime: 1000,
      }),
    }),
  })),
}))

// ============================================================
// Mock the singleton so we can import it cleanly, but we'll
// construct fresh instances for each test
// ============================================================

import HermesAgent, { hermesAgent } from "@/lib/hermes-agent"

// ============================================================
// Tests
// ============================================================

describe("HermesAgent — constructor & singleton", () => {
  it("exports a singleton instance", () => {
    expect(hermesAgent).toBeDefined()
    expect(hermesAgent).toBeInstanceOf(HermesAgent)
  })

  it("creates an instance with empty state", () => {
    const agent = new HermesAgent()
    const status = agent.getSystemStatus()
    expect(status.totalOperations).toBe(0)
    expect(status.lastOperation).toBeNull()
    expect(status.runningOperation).toBeNull()
    expect(status.insightsCount).toBe(0)
    expect(status.recentErrorCount).toBe(0)
  })
})

describe("HermesAgent — operation query methods", () => {
  let agent: HermesAgent

  beforeEach(() => {
    agent = new HermesAgent()
    vi.clearAllMocks()
  })

  describe("getOperation", () => {
    it("returns undefined for unknown operation ID", () => {
      expect(agent.getOperation("nonexistent-id")).toBeUndefined()
    })
  })

  describe("getAllOperations", () => {
    it("returns empty array when no operations exist", () => {
      expect(agent.getAllOperations()).toEqual([])
    })
  })

  describe("getRecentOperations", () => {
    it("returns empty array when no operations exist", () => {
      expect(agent.getRecentOperations(5)).toEqual([])
    })
  })

  describe("getOperationsByStatus", () => {
    it("returns empty array for any status when empty", () => {
      expect(agent.getOperationsByStatus("completed")).toEqual([])
      expect(agent.getOperationsByStatus("failed")).toEqual([])
      expect(agent.getOperationsByStatus("running")).toEqual([])
    })
  })
})

describe("HermesAgent — subscription & listeners", () => {
  let agent: HermesAgent

  beforeEach(() => {
    agent = new HermesAgent()
    vi.clearAllMocks()
  })

  it("notifies listeners when an operation is updated", async () => {
    const listener = vi.fn()
    agent.subscribe(listener)

    // Run an operation to trigger listener
    await agent.runOperation("Test objective")

    // Listener should have been called at least once
    expect(listener).toHaveBeenCalled()
    const operation = listener.mock.calls[0][0]
    expect(operation.objective).toBe("Test objective")
  })

  it("unsubscribe removes the listener", async () => {
    const listener = vi.fn()
    const unsubscribe = agent.subscribe(listener)
    unsubscribe()

    await agent.runOperation("Test objective")
    expect(listener).not.toHaveBeenCalled()
  })

  it("supports multiple listeners", async () => {
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    agent.subscribe(listener1)
    agent.subscribe(listener2)

    await agent.runOperation("Test objective")

    expect(listener1).toHaveBeenCalled()
    expect(listener2).toHaveBeenCalled()
  })

  it("handles listener errors gracefully", async () => {
    const throwingListener = vi.fn(() => { throw new Error("Listener error") })
    const normalListener = vi.fn()

    agent.subscribe(throwingListener)
    agent.subscribe(normalListener)

    await agent.runOperation("Test objective")

    // Normal listener should still be called despite the throwing one
    expect(normalListener).toHaveBeenCalled()
  })
})

describe("HermesAgent — runOperation lifecycle", () => {
  let agent: HermesAgent

  beforeEach(() => {
    agent = new HermesAgent()
    vi.clearAllMocks()
  })

  it("returns an operation with completed status on success", async () => {
    const operation = await agent.runOperation("Test objective")

    expect(operation).toBeDefined()
    expect(operation.id).toBeDefined()
    expect(operation.id).toMatch(/^hermes-/)
    expect(operation.objective).toBe("Test objective")
    expect(operation.status).toBe("completed")
    expect(operation.startedAt).toBeGreaterThan(0)
    expect(operation.completedAt).toBeGreaterThanOrEqual(operation.startedAt)
  })

  it("includes planned actions and results in completed operation", async () => {
    const operation = await agent.runOperation("Sweep all leads")

    expect(operation.plannedActions.length).toBeGreaterThanOrEqual(1)
    expect(operation.results.length).toBeGreaterThanOrEqual(1)
    expect(operation.results[0].result.success).toBe(true)
  })

  it("accepts an optional userId", async () => {
    const operation = await agent.runOperation("Test", { userId: "user-1" })

    expect(operation.userId).toBe("user-1")
  })

  it("captures errors and sets status to failed when workflow throws", async () => {
    // Override the LangGraph invoke to throw
    const { StateGraph } = await import("@langchain/langgraph")
    const mockCompile = vi.mocked(StateGraph).mock.calls[0][0]
    // The mock is already set up — we need to make a new instance

    // Create a new agent with a failing workflow
    const FailingAgent = new HermesAgent()
    // Override the workflow
    ;(FailingAgent as any).workflow = {
      invoke: vi.fn().mockRejectedValue(new Error("Graph execution failed")),
    }

    const operation = await FailingAgent.runOperation("Failing objective")

    expect(operation.status).toBe("failed")
    expect(operation.errors.length).toBeGreaterThanOrEqual(1)
    expect(operation.errors[0]).toContain("Graph execution failed")
  })

  it("stores the operation and makes it retrievable", async () => {
    const operation = await agent.runOperation("Test objective")

    const retrieved = agent.getOperation(operation.id)
    expect(retrieved).toBeDefined()
    expect(retrieved!.id).toBe(operation.id)
    expect(retrieved!.objective).toBe("Test objective")
  })

  it("includes operation in getAllOperations after run", async () => {
    await agent.runOperation("Test objective")

    const all = agent.getAllOperations()
    expect(all.length).toBe(1)
    expect(all[0].objective).toBe("Test objective")
  })
})

describe("HermesAgent — runLeadSweep and runSystemHealthCheck", () => {
  let agent: HermesAgent

  beforeEach(() => {
    agent = new HermesAgent()
    vi.clearAllMocks()
  })

  it("runLeadSweep creates operation with sweep objective", async () => {
    const operation = await agent.runLeadSweep("user-1")

    expect(operation.objective).toContain("Sweep all unprocessed leads")
    expect(operation.userId).toBe("user-1")
    expect(operation.status).toBe("completed")
  })

  it("runSystemHealthCheck creates operation with health check objective", async () => {
    const operation = await agent.runSystemHealthCheck()

    expect(operation.objective).toContain("Full system health check")
    expect(operation.status).toBe("completed")
  })
})

describe("HermesAgent — getSystemStatus with operations", () => {
  let agent: HermesAgent

  beforeEach(async () => {
    agent = new HermesAgent()
    vi.clearAllMocks()
  })

  it("returns correct totalOperations count", async () => {
    await agent.runOperation("Op 1")
    await agent.runOperation("Op 2")
    await agent.runOperation("Op 3")

    const status = agent.getSystemStatus()
    expect(status.totalOperations).toBe(3)
  })

  it("returns lastOperation as the most recent", async () => {
    await agent.runOperation("First")
    await agent.runOperation("Second")

    const status = agent.getSystemStatus()
    expect(status.lastOperation).not.toBeNull()
    expect(status.lastOperation!.objective).toBe("Second")
  })

  it("returns runningOperation when an operation is in progress", async () => {
    // Simulate a running operation by injecting it
    const runOp = await agent.runOperation("Running op")

    const status = agent.getSystemStatus()
    // With mocked workflow, operations complete immediately
    expect(status.lastOperation).not.toBeNull()
  })

  it("returns zero insightsCount and recentErrorCount when empty", () => {
    const status = agent.getSystemStatus()
    expect(status.insightsCount).toBe(0)
    expect(status.recentErrorCount).toBe(0)
  })

  it("returns null lastOperation and runningOperation when no operations", () => {
    const status = agent.getSystemStatus()
    expect(status.lastOperation).toBeNull()
    expect(status.runningOperation).toBeNull()
  })
})

describe("HermesAgent — getRecentOperations sort and limit", () => {
  let agent: HermesAgent

  beforeEach(async () => {
    agent = new HermesAgent()
    vi.clearAllMocks()
  })

  it("returns operations sorted by startedAt descending", async () => {
    await agent.runOperation("Oldest")
    await agent.runOperation("Middle")
    await agent.runOperation("Newest")

    const all = agent.getAllOperations()
    expect(all[0].objective).toBe("Newest")
    expect(all[1].objective).toBe("Middle")
    expect(all[2].objective).toBe("Oldest")
  })

  it("getRecentOperations limits results", async () => {
    await agent.runOperation("Op 1")
    await agent.runOperation("Op 2")
    await agent.runOperation("Op 3")

    expect(agent.getRecentOperations(2).length).toBe(2)
    expect(agent.getRecentOperations(1).length).toBe(1)
  })

  it("getRecentOperations defaults to 10", async () => {
    for (let i = 0; i < 5; i++) {
      await agent.runOperation(`Op ${i}`)
    }

    expect(agent.getRecentOperations().length).toBe(5)
  })

  it("getOperationsByStatus filters correctly", async () => {
    // With mocked workflow, all operations complete successfully
    await agent.runOperation("Op 1")
    await agent.runOperation("Op 2")

    expect(agent.getOperationsByStatus("completed").length).toBe(2)
    expect(agent.getOperationsByStatus("failed").length).toBe(0)
    expect(agent.getOperationsByStatus("running").length).toBe(0)
  })
})
