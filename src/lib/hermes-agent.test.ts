import { describe, it, expect, vi, beforeEach } from "vitest"
import { hermesAgent, type HermesOperation } from "@/lib/hermes-agent"

vi.mock("@/lib/rag-pipeline", () => ({
  ragPipeline: { searchDocuments: vi.fn().mockResolvedValue([]) },
}))

vi.mock("@/lib/agent-memory", () => ({
  agentMemory: {
    searchInsights: vi.fn().mockResolvedValue([]),
    addInsight: vi.fn().mockResolvedValue({ id: "insight-1" }),
    analyzePattern: vi.fn().mockResolvedValue(null),
    generateReport: vi.fn().mockResolvedValue({ id: "report-1" }),
  },
}))

vi.mock("@/lib/agent-service-bridge", () => ({
  executeAgentServiceAction: vi.fn().mockResolvedValue({
    success: true,
    summary: "Action executed",
    details: "Details",
    metrics: {},
    errors: [],
  }),
}))

describe("HermesAgent singleton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a completed planning operation", async () => {
    const op = await hermesAgent.runOperation("Test order")
    expect(op.objective).toBe("Test order")
    expect(op.id).toMatch(/^hermes-/)
  }, 15000)

  it("attaches userId", async () => {
    const op = await hermesAgent.runOperation("With user", { userId: "user-123" })
    expect(op.userId).toBe("user-123")
  })

  it("runLeadSweep uses predefined objective", async () => {
    const op = await hermesAgent.runLeadSweep("user-1")
    expect(op.objective).toContain("lead")
  })

  it("runSystemHealthCheck uses predefined objective", async () => {
    const op = await hermesAgent.runSystemHealthCheck("system")
    expect(op.objective).toContain("health")
  })

  it("getOperation returns undefined for missing id", () => {
    expect(hermesAgent.getOperation("missing")).toBeUndefined()
  })

  it("getRecentOperations slices results", async () => {
    await hermesAgent.runOperation("Op 1")
    await hermesAgent.runOperation("Op 2")
    await hermesAgent.runOperation("Op 3")
    const recent = hermesAgent.getRecentOperations(2)
    expect(recent.length).toBe(2)
  })

  it("getAllOperations sorts newest first", async () => {
    await hermesAgent.runOperation("First")
    await hermesAgent.runOperation("Second")
    const all = hermesAgent.getAllOperations()
    expect(all[0].objective).toBe("Second")
  })

  it("getSystemStatus reports running operation", async () => {
    const runningOp: HermesOperation = {
      id: "running-op",
      objective: "Running",
      status: "running",
      context: "",
      plannedActions: [],
      results: [],
      insights: [],
      errors: [],
      startedAt: Date.now(),
      userId: "u",
    }
    ;(hermesAgent as any).operations.set(runningOp.id, runningOp)
    const status = hermesAgent.getSystemStatus()
    expect(status.runningOperation?.id).toBe("running-op")
  })

  it("scheduled cron can trigger runLeadSweep", async () => {
    const op = await hermesAgent.runLeadSweep("cron:token")
    expect(op.userId).toBe("cron:token")
  })

  it("scheduled cron can trigger runSystemHealthCheck", async () => {
    const op = await hermesAgent.runSystemHealthCheck("cron:token")
    expect(op.userId).toBe("cron:token")
  })

  it("scheduled cron can trigger custom objective run", async () => {
    const op = await hermesAgent.runOperation("Cron daily sweep", { userId: "cron:token" })
    expect(op.objective).toBe("Cron daily sweep")
    expect(op.userId).toBe("cron:token")
  })
})
