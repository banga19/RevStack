/**
 * RevStack Operations Agent — Unit Tests
 *
 * Covers revstackOperationsAgentAction for both operations:
 *   1. generate-invoices — invoice creation, overdue detection, dedup, nextBilling update
 *   2. client-health-score — 5-dimension scoring, tier classification, high-risk alerts
 *   3. "all" action — runs both operations
 *   4. Error handling — DB failures, empty data
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================
// Mock all external dependencies
// Follows the same pattern as agent-service-bridge.test.ts:
// inline vi.fn() inside the factory, then use vi.mocked() to control.
// ============================================================

vi.mock("@/lib/db", () => ({
  prisma: {
    retainer: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/model-provider", () => ({
  createLlm: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({ content: "" }),
    pipe: vi.fn().mockReturnThis(),
  })),
  createPlannerLlm: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({ content: "" }),
    pipe: vi.fn().mockReturnThis(),
  })),
  createAnalystLlm: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({ content: "" }),
    pipe: vi.fn().mockReturnThis(),
  })),
  createEmbeddings: vi.fn(),
  getActiveProvider: vi.fn(() => ({
    id: "mock",
    config: { name: "Mock", defaultModel: "mock-model" },
  })),
}))

vi.mock("@langchain/core/output_parsers", () => ({
  StringOutputParser: vi.fn(),
}))

vi.mock("@langchain/core/prompts", () => ({
  ChatPromptTemplate: { fromMessages: vi.fn() },
}))

// ============================================================
// Import under test
// ============================================================

import { prisma } from "@/lib/db"
import { revstackOperationsAgentAction } from "@/lib/agent-service-bridge"

// ============================================================
// Test context
// ============================================================

const mockContext = {
  sessionId: "test-session-1",
  objective: "Test RevStack operations",
  startTime: Date.now(),
}

// ============================================================
// Helpers: Build mock data
// ============================================================

function buildRetainer(overrides: Record<string, any> = {}) {
  return {
    id: "ret-1",
    clientId: "client-1",
    userId: "user-1",
    name: "Premium Trade Retainer",
    amountUsd: 4500,
    billingCycle: "monthly",
    status: "active",
    startDate: "2026-01-01T00:00:00.000Z",
    nextBillingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days overdue
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-06-01"),
    client: { name: "Ultimo Trading", company: "Ultimo Trading Ltd", email: "ultimo@test.com" },
    ...overrides,
  }
}

function buildClientForHealth(overrides: Record<string, any> = {}) {
  return {
    id: "client-1",
    name: "Ultimo Trading",
    company: "Ultimo Trading Ltd",
    email: "ultimo@test.com",
    phone: "+254700100001",
    status: "active",
    tier: "enterprise",
    monthlyRetainer: 4500,
    corridor: "china-africa",
    ersScore: 82,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-06-01"),
    userId: "user-1",
    retainers: [{ amountUsd: 4500, billingCycle: "monthly" }],
    complianceRecords: [{
      status: "obtained",
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }],
    followups: [{
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    }],
    ...overrides,
  }
}

// ============================================================
// Tests: generate-invoices
// ============================================================

describe("revstackOperationsAgentAction — generate-invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates invoices for overdue retainers with status 'overdue'", async () => {
    const retainer = buildRetainer() // 30 days overdue
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([retainer])
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.invoice.create).mockResolvedValue({ id: "inv-1" } as any)
    vi.mocked(prisma.retainer.update).mockResolvedValue({} as any)
    vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

    const result = await revstackOperationsAgentAction("generate-invoices", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.invoices_created).toBe(1)
    expect(prisma.invoice.create).toHaveBeenCalledTimes(1)
    expect(prisma.retainer.update).toHaveBeenCalledTimes(1)
    expect(prisma.activity.create).toHaveBeenCalledTimes(1)

    const createCall = vi.mocked(prisma.invoice.create).mock.calls[0][0]
    expect(createCall.data.retainerId).toBe("ret-1")
    expect(createCall.data.clientId).toBe("client-1")
    expect(createCall.data.amountUsd).toBe(4500)
    expect(createCall.data.currency).toBe("USD")
    expect(createCall.data.status).toBe("overdue")
  })

  it("marks invoice as 'draft' when only slightly overdue (< 7 days)", async () => {
    const retainer = buildRetainer({
      nextBillingDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days overdue
    })
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([retainer])
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.invoice.create).mockResolvedValue({ id: "inv-1" } as any)
    vi.mocked(prisma.retainer.update).mockResolvedValue({} as any)
    vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

    const result = await revstackOperationsAgentAction("generate-invoices", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.invoices_created).toBe(1)
    const createCall = vi.mocked(prisma.invoice.create).mock.calls[0][0]
    expect(createCall.data.status).toBe("draft")
  })

  it("skips retainers already invoiced for the current period", async () => {
    const retainer = buildRetainer()
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([retainer])
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue({ id: "existing-inv" } as any)

    const result = await revstackOperationsAgentAction("generate-invoices", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.invoices_created).toBe(0)
    expect(prisma.invoice.create).not.toHaveBeenCalled()
  })

  it("skips retainers whose nextBilling is still in the future", async () => {
    const retainer = buildRetainer({
      nextBillingDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    })
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([retainer])

    const result = await revstackOperationsAgentAction("generate-invoices", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.invoices_created).toBe(0)
    expect(prisma.invoice.create).not.toHaveBeenCalled()
  })

  it("handles empty retainers gracefully", async () => {
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])

    const result = await revstackOperationsAgentAction("generate-invoices", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.invoices_created).toBe(0)
    expect(result.metrics?.active_retainers_checked).toBe(0)
  })

  it("advances nextBillingDate to next month for monthly retainers", async () => {
    const nextBilling = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    const retainer = buildRetainer({ nextBillingDate: nextBilling.toISOString() })
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([retainer])
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.invoice.create).mockResolvedValue({ id: "inv-1" } as any)
    vi.mocked(prisma.retainer.update).mockResolvedValue({} as any)
    vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

    await revstackOperationsAgentAction("generate-invoices", mockContext)

    const updateCall = vi.mocked(prisma.retainer.update).mock.calls[0][0]
    const newDate = new Date(updateCall.data.nextBillingDate)
    expect(newDate.getMonth()).toBe((nextBilling.getMonth() + 1) % 12)
  })

  it("logs an activity entry for each invoice generated", async () => {
    const retainer = buildRetainer()
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([retainer])
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.invoice.create).mockResolvedValue({ id: "inv-1" } as any)
    vi.mocked(prisma.retainer.update).mockResolvedValue({} as any)
    vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

    await revstackOperationsAgentAction("generate-invoices", mockContext)

    expect(prisma.activity.create).toHaveBeenCalledTimes(1)
    const activityCall = vi.mocked(prisma.activity.create).mock.calls[0][0]
    expect(activityCall.data.type).toBe("invoice_generated")
    expect(activityCall.data.entityType).toBe("retainer")
  })
})

// ============================================================
// Tests: client-health-score
// ============================================================

describe("revstackOperationsAgentAction — client-health-score", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("classifies a well-scored client as healthy (≥70)", async () => {
    const client = buildClientForHealth()
    vi.mocked(prisma.client.findMany).mockResolvedValue([client])
    vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

    const result = await revstackOperationsAgentAction("client-health-score", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.clients_scored).toBe(1)
    expect(result.metrics?.healthy_clients).toBe(1)
    expect(result.metrics?.high_risk_clients).toBe(0)
  })

  it("classifies a low-scoring client as high-risk (<45) and creates alert", async () => {
    const client = buildClientForHealth({
      status: "qualified",
      retainers: [],
      complianceRecords: [],
      followups: [],
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days old → tenure=2
    })
    vi.mocked(prisma.client.findMany).mockResolvedValue([client])
    vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

    const result = await revstackOperationsAgentAction("client-health-score", mockContext)
    // Score: revenue 0 + engagement 0 + compliance 10 + status 5 + tenure 2 = 17 → high-risk

    expect(result.success).toBe(true)
    expect(result.metrics?.high_risk_clients).toBe(1)
    expect(result.metrics?.healthy_clients).toBe(0)

    const activityCall = vi.mocked(prisma.activity.create).mock.calls[0][0]
    expect(activityCall.data.type).toBe("client_health_alert")
  })

  it("classifies a moderately-scored client as medium risk (45-69)", async () => {
    const client = buildClientForHealth({
      retainers: [{ amountUsd: 1000, billingCycle: "monthly" }], // revenue=10
      complianceRecords: [], // compliance=10 (no records = default)
      followups: [{ createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) }], // engagement=10 (20 days)
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // tenure=4 (60 days)
    })
    vi.mocked(prisma.client.findMany).mockResolvedValue([client])

    const result = await revstackOperationsAgentAction("client-health-score", mockContext)
    // Score: revenue 10 + engagement 10 + compliance 10 + status 15 + tenure 4 = 49 → medium

    expect(result.success).toBe(true)
    expect(result.metrics?.medium_risk_clients).toBe(1)
    expect(result.metrics?.high_risk_clients).toBe(0)
  })

  it("computes engagement score based on days since last followup", async () => {
    // 50 days → engagement = 5 points
    const client = buildClientForHealth({
      followups: [{ createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000) }],
    })
    vi.mocked(prisma.client.findMany).mockResolvedValue([client])

    const result = await revstackOperationsAgentAction("client-health-score", mockContext)
    // Total: revenue 30 + engagement 5 + compliance 20 + status 15 + tenure 10 = 80

    expect(result.success).toBe(true)
    expect(result.metrics?.healthy_clients).toBe(1)
  })

  it("handles clients with no followups (engagement = 0)", async () => {
    const client = buildClientForHealth({ followups: [] })
    vi.mocked(prisma.client.findMany).mockResolvedValue([client])

    const result = await revstackOperationsAgentAction("client-health-score", mockContext)
    // Total: revenue 30 + engagement 0 + compliance 20 + status 15 + tenure 10 = 75

    expect(result.success).toBe(true)
    expect(result.metrics?.healthy_clients).toBe(1)
  })

  it("reduces compliance score when certifications are expiring soon", async () => {
    const client = buildClientForHealth({
      complianceRecords: [{
        status: "obtained",
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // expires in 10 days
      }],
    })
    vi.mocked(prisma.client.findMany).mockResolvedValue([client])

    const result = await revstackOperationsAgentAction("client-health-score", mockContext)
    // expiringCompliance=1, obtained=1 → 1 > 1/2 → compliance=5
    // Total: revenue 30 + engagement 25 + compliance 5 + status 15 + tenure 10 = 85

    expect(result.success).toBe(true)
    expect(result.metrics?.healthy_clients).toBe(1)
  })

  it("scores multiple clients with different health tiers", async () => {
    const healthy = buildClientForHealth({ id: "c1", name: "Healthy Co" })
    const highRisk = buildClientForHealth({
      id: "c2", name: "At Risk Co",
      status: "qualified", retainers: [], complianceRecords: [], followups: [],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    })
    vi.mocked(prisma.client.findMany).mockResolvedValue([healthy, highRisk])
    vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

    const result = await revstackOperationsAgentAction("client-health-score", mockContext)

    expect(result.metrics?.clients_scored).toBe(2)
    expect(result.metrics?.healthy_clients).toBe(1)
    expect(result.metrics?.high_risk_clients).toBe(1)
    expect(prisma.activity.create).toHaveBeenCalledTimes(1) // only for high-risk
  })

  it("handles empty client list gracefully", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([])

    const result = await revstackOperationsAgentAction("client-health-score", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.clients_scored).toBe(0)
    expect(prisma.activity.create).not.toHaveBeenCalled()
  })
})

// ============================================================
// Tests: "all" action
// ============================================================

describe('revstackOperationsAgentAction — "all" action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("runs both generate-invoices and client-health-score", async () => {
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([buildRetainer()])
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.invoice.create).mockResolvedValue({ id: "inv-1" } as any)
    vi.mocked(prisma.retainer.update).mockResolvedValue({} as any)
    vi.mocked(prisma.client.findMany).mockResolvedValue([buildClientForHealth()])
    vi.mocked(prisma.activity.create).mockResolvedValue({} as any)

    const result = await revstackOperationsAgentAction("all", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.invoices_created).toBe(1)
    expect(result.metrics?.clients_scored).toBe(1)
  })

  it("runs both operations when action is empty string", async () => {
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])
    vi.mocked(prisma.client.findMany).mockResolvedValue([])

    const result = await revstackOperationsAgentAction("", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.invoices_created).toBe(0)
    expect(result.metrics?.clients_scored).toBe(0)
  })
})

// ============================================================
// Tests: error handling
// ============================================================

describe("revstackOperationsAgentAction — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns failure when invoicing DB query throws", async () => {
    vi.mocked(prisma.retainer.findMany).mockRejectedValue(new Error("Database connection lost"))

    const result = await revstackOperationsAgentAction("generate-invoices", mockContext)

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errors![0]).toContain("Database connection lost")
  })

  it("returns failure when health scoring DB query throws", async () => {
    vi.mocked(prisma.client.findMany).mockRejectedValue(new Error("Database timeout"))

    const result = await revstackOperationsAgentAction("client-health-score", mockContext)

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errors![0]).toContain("Database timeout")
  })

  it("handles non-critical activity creation failure gracefully during health scoring", async () => {
    const client = buildClientForHealth({
      status: "qualified", retainers: [], complianceRecords: [], followups: [],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    })
    vi.mocked(prisma.client.findMany).mockResolvedValue([client])
    vi.mocked(prisma.activity.create).mockRejectedValue(new Error("Activity log failure"))

    const result = await revstackOperationsAgentAction("client-health-score", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.high_risk_clients).toBe(1)
  })
})
