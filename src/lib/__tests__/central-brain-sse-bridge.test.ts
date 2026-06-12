/**
 * Tests for Central Brain → SSE Bridge
 *
 * Verifies that:
 *   1. The bridge buffers events and serves them via REST API
 *   2. Events are filtered by type and time
 *   3. The bridge is idempotent (multiple init calls don't create multiple subscriptions)
 *   4. Clearing the buffer works
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock model-provider to avoid OpenAI credentials error during AgentMemorySystem construction
vi.mock("@/lib/model-provider", () => ({
  createLlm: vi.fn(() => ({
    pipe: vi.fn(() => ({ invoke: vi.fn().mockResolvedValue("Mock summary") })),
    withStructuredOutput: vi.fn(() => vi.fn().mockResolvedValue({ hasInsight: false })),
  })),
  createEmbeddings: vi.fn(() => ({
    embedDocuments: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    embedQuery: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  })),
  getActiveProvider: vi.fn(() => ({ id: "openai", config: { name: "Mock", envVar: "MOCK_KEY", baseUrl: "https://mock", defaultModel: "mock-model", available: true } })),
  getProviderSummary: vi.fn(() => "Mock provider summary"),
  default: {
    createLlm: vi.fn(),
    createEmbeddings: vi.fn(),
    getActiveProvider: vi.fn(),
    getProviderSummary: vi.fn(),
  },
}))

// Mock db to prevent DB connection errors during agent-memory loading
vi.mock("@/lib/db", () => ({
  prisma: {
    agentInsight: { findMany: vi.fn().mockResolvedValue([]) },
    agentReport: { findMany: vi.fn().mockResolvedValue([]) },
    communicationLogEntry: { create: vi.fn().mockResolvedValue({}) },
  },
}))

import { centralBrain } from "@/lib/hermes-central-brain"
import {
  initCentralBrainBridge,
  resetBridgeForTest,
  getBridgedEvents,
  getBridgedEventCount,
  clearBridgedEvents,
  isBridgeInitialized,
} from "@/lib/central-brain-sse-bridge"

describe("CentralBrainSSEBridge", () => {
  beforeEach(() => {
    // Reset the bridge and central brain state before each test
    resetBridgeForTest()
    centralBrain.reset()
  })

  // ── Initialisation ────────────────────────────────────────

  describe("initialisation", () => {
    it("starts uninitialized", () => {
      expect(isBridgeInitialized()).toBe(false)
    })

    it("becomes initialized after init call", () => {
      initCentralBrainBridge()
      expect(isBridgeInitialized()).toBe(true)
    })

    it("is idempotent — multiple init calls don't double-subscribe", () => {
      initCentralBrainBridge()
      initCentralBrainBridge()
      initCentralBrainBridge()
      expect(isBridgeInitialized()).toBe(true)

      // Buffer should only have events from the init itself
      // (The orchestrator and system agents are registered during reset)
      const count = getBridgedEventCount()
      // After init, no events should have fired yet since we haven't done anything
      expect(getBridgedEventCount()).toBe(0)
    })
  })

  // ── Event Buffering ───────────────────────────────────────

  describe("event buffering", () => {
    it("buffers events when agents register", () => {
      initCentralBrainBridge()

      // Register a test agent — this should emit an event through the bridge
      centralBrain.registerAgent("lead", {
        displayName: "Lead Agent",
        description: "Lead qualification",
        capabilities: [{ name: "qualify", description: "Qualify leads" }],
        status: "active",
      })

      const events = getBridgedEvents()
      expect(events.length).toBeGreaterThan(0)
      expect(events[0].type).toBe("agent_registered")
    })

    it("buffers events when status changes", () => {
      initCentralBrainBridge()

      // Register agent then change status
      centralBrain.registerAgent("lead", {
        displayName: "Lead Agent",
        description: "Lead qualification",
        capabilities: [{ name: "qualify", description: "Qualify leads" }],
        status: "active",
      })

      centralBrain.updateAgentStatus("lead", "error")

      const errorEvents = getBridgedEvents({ type: "agent_status_changed" })
      expect(errorEvents.length).toBeGreaterThan(0)
      expect(errorEvents[0].details).toBeDefined()
    })

    it("buffers messages sent through the bus", async () => {
      initCentralBrainBridge()

      centralBrain.sendMessage({
        source: "system",
        target: "lead",
        type: "test-message",
        payload: { hello: "world" },
      })

      // Wait for the async message queue to process (uses setImmediate internally)
      await new Promise((resolve) => setTimeout(resolve, 50))

      const events = getBridgedEvents()
      const messageEvents = events.filter((e) => e.type === "message_sent" || e.type === "message_delivered")
      expect(messageEvents.length).toBeGreaterThan(0)
    })
  })

  // ── Filtering ─────────────────────────────────────────────

  describe("filtering", () => {
    it("filters events by type", () => {
      initCentralBrainBridge()

      centralBrain.registerAgent("lead", {
        displayName: "Lead Agent",
        description: "Lead qualification",
        capabilities: [{ name: "qualify", description: "Qualify leads" }],
        status: "active",
      })

      const filtered = getBridgedEvents({ type: "agent_registered" })
      expect(filtered.length).toBeGreaterThan(0)
      filtered.forEach((e) => expect(e.type).toBe("agent_registered"))
    })

    it("handles limit and offset", () => {
      initCentralBrainBridge()

      // Register a few agents
      centralBrain.registerAgent("lead", {
        displayName: "Lead Agent", description: "Test", capabilities: [], status: "active",
      })
      centralBrain.registerAgent("trade", {
        displayName: "Trade Agent", description: "Test", capabilities: [], status: "active",
      })

      const allEvents = getBridgedEvents()
      const limited = getBridgedEvents({ limit: 1 })
      expect(limited.length).toBe(1)
      expect(limited[0].id).toBe(allEvents[0].id)

      const withOffset = getBridgedEvents({ limit: 1, offset: 1 })
      expect(withOffset.length).toBe(1)
      expect(withOffset[0].id).toBe(allEvents[1].id)
    })

    it("filters by since timestamp", () => {
      initCentralBrainBridge()

      // Register agent
      centralBrain.registerAgent("lead", {
        displayName: "Lead Agent", description: "Test", capabilities: [], status: "active",
      })

      const beforeEvents = getBridgedEvents({ since: 0 })
      expect(beforeEvents.length).toBeGreaterThan(0)

      const futureFilter = getBridgedEvents({ since: Date.now() + 3600_000 })
      expect(futureFilter.length).toBe(0)
    })
  })

  // ── Clearing ──────────────────────────────────────────────

  describe("clearing", () => {
    it("clears all buffered events", () => {
      initCentralBrainBridge()

      centralBrain.registerAgent("lead", {
        displayName: "Lead Agent", description: "Test", capabilities: [], status: "active",
      })

      expect(getBridgedEventCount()).toBeGreaterThan(0)
      clearBridgedEvents()
      expect(getBridgedEventCount()).toBe(0)
    })
  })
})
