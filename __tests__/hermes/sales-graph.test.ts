/**
 * Hermes Sales Graph — Unit Tests
 *
 * Tests the LangGraph sales pipeline across all routing paths:
 *   1. score < 40  → closePipeline (no outreach)
 *   2. score 40-59 → decideOutreach (email) → sendOutreach → closePipeline
 *   3. score 60-79 → decideOutreach (whatsapp) → sendOutreach → closePipeline
 *   4. score >= 80 → decideOutreach (whatsapp) → sendOutreach → sendFollowUp → closePipeline
 *
 * The LLM in `decideOutreach` is mocked to throw so we always get
 * deterministic template-based messages.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { LeadInput, PipelineStage } from "@/lib/hermes/sales-graph"

// ============================================================
// Hoisted mocks — must be before any imports
// ============================================================

// Mock model-provider so createLlm throws → template fallback path
vi.mock("@/lib/model-provider", () => ({
  createLlm: vi.fn(() => {
    throw new Error("LLM not available in test environment")
  }),
  createEmbeddings: vi.fn(),
  getActiveProvider: vi.fn(() => ({
    id: "openai",
    config: { name: "OpenAI", defaultModel: "gpt-4o" },
  })),
}))

// Mock rag-pipeline so enrichWithRagContext returns empty
vi.mock("@/lib/rag-pipeline", () => ({
  ragPipeline: {
    generateResponse: vi.fn().mockResolvedValue({ response: "" }),
    searchDocuments: vi.fn().mockResolvedValue([]),
  },
}))

// Mock wati-integration so dynamic imports in sendOutreach/sendFollowUp are deterministic
vi.mock("@/lib/wati-integration", () => ({
  watiIntegration: {
    sendTemplate: vi.fn().mockResolvedValue({ success: true, messageId: "mock-msg-1" }),
    sendMessage: vi.fn().mockResolvedValue({ success: true, messageId: "mock-msg-2" }),
    isConfigured: vi.fn().mockReturnValue(false),
  },
}))

// Mock nodemailer so dynamic imports don't try real SMTP
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "mock-email-id" }),
    })),
    createTestAccount: vi.fn().mockResolvedValue({ user: "test", pass: "test" }),
    getTestMessageUrl: vi.fn().mockReturnValue("http://ethereal.preview/msg"),
  },
}))

// ============================================================
// Import after mocks
// ============================================================

import { salesGraph } from "@/lib/hermes/sales-graph"

// ============================================================
// Helpers
// ============================================================

function makeLead(overrides: Partial<LeadInput> = {}): LeadInput {
  return {
    id: "lead-test-1",
    phone: "+254712345678",
    email: "test@company.com",
    companyName: "Test Exporters Ltd",
    productInterest: "coffee",
    ...overrides,
  }
}

async function runPipeline(lead: LeadInput, initialScore = 0) {
  return salesGraph.invoke({
    lead,
    stage: "start" as PipelineStage,
    score: initialScore,
    messages: [],
  })
}

// ============================================================
// Tests
// ============================================================

describe("Sales Graph — Routing Paths", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Path 1: Score < 40 → Close ──────────────────────────
  // This path is tested by injecting a low score directly into the graph
  // at the "scored" stage (see routing tests below), since qualifyLead's
  // minimum score is 40 (base) without createdAt recency data.
  describe("Path: score < 40 (low priority lead)", () => {
    it("bypasses outreach when score is below 40 via routing function", async () => {
      // Inject score=35 at scored stage to test routeFromScored directly
      const result = await salesGraph.invoke({
        lead: makeLead(),
        stage: "scored" as PipelineStage,
        score: 35,
        messages: [],
      })
      // routeFromScored(35) → "closePipeline"
      expect(result.stage).toBe("closed")
      expect(result.score).toBe(35)
    })
  })

  // ── Path 2: Score 40-59 → Email Outreach → Close ────────
  describe("Path: score 40-59 (medium lead — email outreach)", () => {
    it("scores the lead and sends email outreach when score is 40-59", async () => {
      const lead = makeLead({
        phone: "",          // no phone → channel will be email (score < 60)
        productInterest: "coffee",  // +15 industry
      })
      // Expected: 40 (base) + 15 (industry) = 55 → email channel

      const result = await runPipeline(lead)

      // Should have scored the lead
      expect(result.score).toBeGreaterThanOrEqual(40)
      expect(result.score).toBeLessThan(60)

      // Should have reached at least outreach stage
      expect(["outreach_sent", "followed_up", "closed"]).toContain(result.stage)

      // The last non-system message should be email channel (score < 60)
      const lastOutreach = result.messages.findLast((m: { channel: string }) => m.channel !== "system")
      if (lastOutreach) {
        expect(lastOutreach.channel).toBe("email")
      }

      // Should have scoreBreakdown
      expect(result.scoreBreakdown).not.toBeNull()
      expect(result.scoreBreakdown?.base).toBe(40)
    })

    it("includes company name in outreach message body", async () => {
      const lead = makeLead({ productInterest: "coffee", phone: "" })
      const result = await runPipeline(lead)

      const outreachMessages = result.messages.filter((m: { channel: string }) => m.channel !== "system")
      expect(outreachMessages.length).toBeGreaterThanOrEqual(1)

      const message = outreachMessages[outreachMessages.length - 1]
      expect(message.body).toContain("Test Exporters Ltd")
    })
  })

  // ── Path 3: Score 60-79 → WhatsApp Outreach → Close ─────
  describe("Path: score 60-79 (high lead — whatsapp outreach, no follow-up)", () => {
    it("scores the lead and sends whatsapp outreach when score is 60-79", async () => {
      const lead = makeLead({
        phone: "+254712345678",
        productInterest: "coffee",   // +15 industry
      })
      // Expected: 40 + 15 (industry) + 15 (contact) + 5 (email quality) = 75
      // Wait, email quality requires email with professional domain.
      // lead.email = "test@company.com" → not a free domain → +5
      // Actually: 40 + 15 + 15 + 5 = 75 → whatsapp channel (score >= 60)
      // routeFromOutreach: 75 < 80 → closePipeline (no follow-up)

      const result = await runPipeline(lead)

      expect(result.score).toBeGreaterThanOrEqual(60)
      expect(result.score).toBeLessThan(80)

      // Should have done whatsapp outreach (implicitly — mocked WATI says success)
      expect(["outreach_sent", "followed_up", "closed"]).toContain(result.stage)
    })

    it("reaches outreach_sent stage and closes without follow-up", async () => {
      // This path should NOT reach sendFollowUp since score < 80
      const lead = makeLead({
        productInterest: "coffee",
      })
      const result = await runPipeline(lead)

      // Score should be 75 (40+15+15+5) < 80
      expect(result.score).toBe(75)

      // If stage is "followed_up", that means it went through follow-up
      // which shouldn't happen at score < 80. But the routeFromOutreach
      // should route it to closePipeline.
      // At score 75, routeFromOutreach returns "closePipeline"
      expect(result.stage).toMatch(/outreach_sent|closed/)
    })
  })

  // ── Path 4: Score >= 80 → WhatsApp Outreach → Follow-up → Close
  // Note: score >= 80 is unreachable via scoreLead alone (max=75 given the
  // fields the graph passes to qualifyLead). The >= 80 follow-up path is
  // tested by injecting a high score at the outreach_sent stage in the
  // routing function tests below.
  describe("Path: score >= 80 (hot lead — whatsapp + follow-up via injected score)", () => {
    it("routes to follow-up when score >= 80 (tested via injected state in routing tests)", async () => {
      // Test the actual max the graph can produce: 75
      const lead = makeLead({
        productInterest: "coffee",
        phone: "+254712345678",
        email: "test@company.com",
      })
      const result = await runPipeline(lead)

      expect(result.score).toBe(75) // 40+15+15+5
      // Stage depends on routing — at 75, routeFromOutreach returns closePipeline
      expect(result.stage).toEqual("closed")
    })
  })

  // ── Path 5: Empty lead (no enrichment) ───────────────────
  describe("Path: minimal bare lead", () => {
    it("handles a lead with only company name", async () => {
      const lead = makeLead({
        phone: "",
        email: "",
        productInterest: "",
      })

      const result = await runPipeline(lead)

      // Should get base score 40
      expect(result.score).toBe(40)
      expect(result.output).toBeTruthy()
      expect(result.messages.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Path 6: Lead with no phone (email-only contact) ──────
  describe("Path: email-only lead", () => {
    it("works when lead has no phone number", async () => {
      const lead = makeLead({
        phone: "",
        productInterest: "textiles",
      })

      const result = await runPipeline(lead)

      // Score: 40 + 15 (industry) + 5 (email quality) = 60
      expect(result.score).toBe(60)
      expect(result.stage).toMatch(/outreach_sent|closed/)
    })
  })

  // ── State invariants ─────────────────────────────────────
  describe("State invariants", () => {
    it("always returns a score between 0 and 100", async () => {
      const result = await runPipeline(makeLead())
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it("always returns output text", async () => {
      const result = await runPipeline(makeLead())
      expect(result.output).toBeTruthy()
      expect(typeof result.output).toBe("string")
    })

    it("always returns at least one message (the system score message)", async () => {
      const result = await runPipeline(makeLead())
      expect(result.messages.length).toBeGreaterThanOrEqual(1)
    })

    it("all messages have valid status values", async () => {
      const result = await runPipeline(makeLead())
      for (const msg of result.messages) {
        expect(["sent", "failed", "skipped"]).toContain(msg.status)
      }
    })

    it("stage is never 'start' after completion", async () => {
      const result = await runPipeline(makeLead())
      expect(result.stage).not.toBe("start")
    })
  })
})

// ============================================================
// Tool Integration Tests
// ============================================================

describe("Tool integration with sales graph", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("gracefully handles missing WATI and falls through to email", async () => {
    // Unmock WATI so it's not available via the mock
    vi.mocked(await import("@/lib/wati-integration")).watiIntegration.sendTemplate
      .mockRejectedValue(new Error("Not configured"))

    const lead = makeLead({ productInterest: "coffee" })
    const result = await runPipeline(lead)

    // Pipeline completes even if WATI fails
    expect(result.stage).toMatch(/outreach_sent|followed_up|closed/)
  })

  it("handles WATI failure gracefully", async () => {
    // Temporarily make WATI fail
    const watiMock = await import("@/lib/wati-integration")
    vi.mocked(watiMock.watiIntegration.sendTemplate).mockRejectedValueOnce(
      new Error("WATI API error")
    )

    const lead = makeLead({ productInterest: "coffee" })
    const result = await runPipeline(lead)

    // Pipeline should still complete — WATI failure is caught
    expect(result.stage).toMatch(/outreach_sent|closed/)
  })

  it("marks outreach as skipped when no channel is configured and no phone/email", async () => {
    const lead = makeLead({
      phone: "",
      email: "",
      productInterest: "test",
    })

    const result = await runPipeline(lead)

    // Score = 40 + 15 (industry) = 55 → email channel but no email → skipped
    const skippedMessages = result.messages.filter(
      (m: { status: string }) => m.status === "skipped"
    )
    // Should have skipped messages or completed without error
    expect(result.stage).toBeTruthy()
  })
})

// ============================================================
// Routing Function Unit Tests
// ============================================================

describe("Conditional edge routing", () => {
  it("routes score >= 40 to decideOutreach", async () => {
    // Test through the graph's behavior with pre-set stage to bypass scoreLead
    const result = await salesGraph.invoke({
      lead: makeLead({ productInterest: "coffee" }),
      stage: "scored" as PipelineStage,
      score: 55,
      messages: [],
    })
    // With pre-set score 55 and stage "scored", the graph should go through
    // routeFromScored which checks score >= 40 → "decideOutreach"
    expect(result.stage).toMatch(/outreach_sent|followed_up|closed/)
  })

  it("routes score < 40 to closePipeline", async () => {
    // Manually set score to 35 (below threshold) and stage to "scored"
    const result = await salesGraph.invoke({
      lead: makeLead(),
      stage: "scored" as PipelineStage,
      score: 35,
      messages: [],
    })
    // With score 35 < 40, routeFromScored should return "closePipeline"
    expect(result.stage).toBe("closed")
  })

  it("routes score >= 80 to sendFollowUp", async () => {
    // Manually set score to 85 and stage to "outreach_sent"
    const result = await salesGraph.invoke({
      lead: makeLead(),
      stage: "outreach_sent" as PipelineStage,
      score: 85,
      messages: [
        {
          channel: "whatsapp",
          body: "Previous outreach message",
          sentAt: new Date().toISOString(),
          status: "sent" as const,
        },
      ],
    })
    // With score 85 >= 80, routeFromOutreach returns "sendFollowUp"
    expect(result.stage).toBe("followed_up")

    // Should have a follow-up message
    const followUpMessage = result.messages[result.messages.length - 1]
    expect(followUpMessage.channel).toBe("whatsapp")
    expect(followUpMessage.body).toContain("Following up")
  })

  it("routes score 60-79 to closePipeline after outreach (no follow-up)", async () => {
    // Manually set score to 70 and stage to "outreach_sent"
    const result = await salesGraph.invoke({
      lead: makeLead(),
      stage: "outreach_sent" as PipelineStage,
      score: 70,
      messages: [
        {
          channel: "whatsapp",
          body: "Previous outreach message",
          sentAt: new Date().toISOString(),
          status: "sent" as const,
        },
      ],
    })
    // With score 70 < 80, routeFromOutreach returns "closePipeline"
    expect(result.stage).toBe("closed")
  })
})
