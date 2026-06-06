/**
 * Agent Service Bridge Tests
 *
 * Tests each agent function (lead, trade, compliance, onboarding, revenue)
 * with mocked integrations to verify the wiring between agents and plugins.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================
// Mock all external dependencies
// ============================================================

vi.mock("./db", () => ({
  prisma: {
    client: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    clientCompliance: { findMany: vi.fn() },
    revenueEntry: { aggregate: vi.fn() },
  },
}))

vi.mock("./wati-integration", () => ({
  watiIntegration: {
    isConfigured: vi.fn().mockReturnValue(true),
    handleIncomingMessage: vi.fn(),
    sendTemplate: vi.fn(),
    sendMessage: vi.fn(),
  },
}))

vi.mock("./qme-integration", () => ({
  qmeIntegration: {
    processDocument: vi.fn(),
    addWorkflowTrigger: vi.fn(),
  },
}))

vi.mock("./make-integration", () => ({
  makeIntegration: {
    triggerLeadCapture: vi.fn(),
    triggerDailyReport: vi.fn(),
    triggerComplianceAlert: vi.fn(),
    triggerFollowUpSequence: vi.fn(),
  },
}))

vi.mock("./zoho-crm-integration", () => ({
  zohoCrmIntegration: {
    isConfigured: vi.fn().mockReturnValue(true),
    syncClientToCrm: vi.fn(),
  },
}))

vi.mock("./voiceflow-integration", () => ({
  voiceflowIntegration: {
    isConfigured: vi.fn().mockReturnValue(true),
    qualifyLead: vi.fn(),
    startDialog: vi.fn(),
  },
}))

vi.mock("./sokogate-integration", () => ({
  sokogateIntegration: {
    isConfigured: vi.fn().mockReturnValue(true),
    getSuppliers: vi.fn(),
    getBuyers: vi.fn(),
  },
}))

vi.mock("./instantly-integration", () => ({
  instantlyIntegration: {
    isConfigured: vi.fn().mockReturnValue(true),
    launchOutreachCampaign: vi.fn(),
  },
}))

vi.mock("./supplier-matching", () => ({
  matchSuppliers: vi.fn(),
  KOREAN_BUYER_PROFILES: {
    "Busan Food Processors": {
      name: "Busan Food Processors",
      procurementFocus: ["coffee", "cocoa"],
      requiredCertifications: ["haccp"],
    },
    "Seoul Trading Corp": {
      name: "Seoul Trading Corp",
      procurementFocus: ["minerals"],
      requiredCertifications: ["iso 9001"],
    },
  },
}))

vi.mock("./email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("./rag-pipeline", () => ({
  ragPipeline: {
    processDocument: vi.fn().mockResolvedValue({ id: "doc-1" }),
  },
}))

vi.mock("./agent-memory", () => ({
  agentMemory: {
    addInsight: vi.fn().mockResolvedValue({ id: "insight-1" }),
    analyzePattern: vi.fn().mockResolvedValue(null),
  },
}))

// Build mock chain with vi.hoisted so it's available during vi.mock factory execution
const { mockChatOpenAI, mockStringParser, mockChatPromptTemplate } = vi.hoisted(() => {
  // A chain object where .pipe() returns self and .invoke() resolves
  const chain = {
    pipe: () => chain,
    invoke: () => Promise.resolve("Mock LLM analysis response"),
  } as any

  // LLM that responds to .pipe() — regular function so it works with new
  const LlmMock: any = function() {
    return {
      pipe: () => chain,
      withStructuredOutput: () => chain,
    }
  }

  return {
    mockChatOpenAI: LlmMock,
    mockStringParser: function() { return {} },
    mockChatPromptTemplate: {
      fromMessages: vi.fn(() => chain),
    },
  }
})

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: mockChatOpenAI,
}))

vi.mock("@langchain/core/output_parsers", () => ({
  StringOutputParser: mockStringParser,
}))

vi.mock("@langchain/core/prompts", () => ({
  ChatPromptTemplate: mockChatPromptTemplate,
}))

// ============================================================
// Import the modules under test (after mocks are set up)
// ============================================================

import { prisma } from "./db"
import { watiIntegration } from "./wati-integration"
import { qmeIntegration } from "./qme-integration"
import { makeIntegration } from "./make-integration"
import { zohoCrmIntegration } from "./zoho-crm-integration"
import { voiceflowIntegration } from "./voiceflow-integration"
import { sokogateIntegration } from "./sokogate-integration"
import { instantlyIntegration } from "./instantly-integration"
import { sendWelcomeEmail } from "./email"
import { matchSuppliers } from "./supplier-matching"
import {
  executeAgentServiceAction,
  leadAgentAction,
  tradeAgentAction,
  complianceAgentAction,
  onboardingAgentAction,
  revenueAgentAction,
} from "./agent-service-bridge"

// ============================================================
// Test Context
// ============================================================

const mockContext = {
  sessionId: "test-session-1",
  objective: "Test autonomous operations end-to-end",
  startTime: Date.now(),
}

const mockLead: any = {
  id: "lead-1",
  name: "John Kamau",
  email: "john@example.com",
  phone: "+254712345678",
  company: "Nairobi Traders Ltd",
  status: "lead",
  notes: "Interested in coffee exports",
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: "user-1",
  tier: null,
  monthlyRetainer: null,
  corridor: null,
  ersScore: null,
  ersBreakdown: null,
}

const mockClient: any = {
  id: "client-1",
  name: "Jane Wanjiku",
  email: "jane@example.com",
  phone: "+254798765432",
  company: "Mombasa Exports Co",
  status: "active",
  tier: "growth",
  corridor: "korea-africa",
  monthlyRetainer: 200,
  ersScore: 72,
  ersBreakdown: JSON.stringify({ documentation: 18, compliance: 20, exportHistory: 17, capacityVerified: 17 }),
  notes: "Key client",
  userId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ============================================================
// Tests: executeAgentServiceAction (Router)
// ============================================================

describe("executeAgentServiceAction (Router)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("routes to lead agent when agentType is 'lead'", async () => {
    // Mock prisma to return leads
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([mockLead])
    vi.mocked(watiIntegration.handleIncomingMessage).mockResolvedValue({
      action: "forward_to_human",
      leadScore: 85,
    })
    vi.mocked(watiIntegration.sendTemplate).mockResolvedValue({ success: true })
    vi.mocked(voiceflowIntegration.qualifyLead).mockResolvedValue({
      score: 85,
      qualified: true,
      summary: "High value lead",
    })
    vi.mocked(zohoCrmIntegration.syncClientToCrm).mockResolvedValue({
      contactId: "zoho-contact-1",
      dealId: "zoho-deal-1",
    })
    vi.mocked(makeIntegration.triggerLeadCapture).mockResolvedValue({
      success: true, statusCode: 200,
    })
    vi.mocked(instantlyIntegration.launchOutreachCampaign).mockResolvedValue({
      campaignId: "inst-camp-1",
    })

    const result = await executeAgentServiceAction("lead", "Qualify all leads", mockContext)

    expect(result.success).toBe(true)
    expect(result.summary).toContain("Lead Agent")
    expect(result.metrics?.leads_found).toBe(1)
    expect(result.metrics?.leads_qualified).toBe(1)
    expect(watiIntegration.handleIncomingMessage).toHaveBeenCalled()
    expect(voiceflowIntegration.qualifyLead).toHaveBeenCalled()
    expect(zohoCrmIntegration.syncClientToCrm).toHaveBeenCalled()
    expect(makeIntegration.triggerLeadCapture).toHaveBeenCalled()
  })

  it("routes to trade agent when agentType is 'trade'", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([{
      ...mockClient,
      status: "active",
      products: [{ id: "prod-1", clientId: "client-1", name: "Coffee", category: "agriculture", description: "Kenyan coffee", certifications: "HACCP", exportVolume: "2000 kg/month", unit: "kg", pricing: "$8.50/kg", createdAt: new Date(), updatedAt: new Date() }],
      complianceRecords: [{ id: "cr-1", clientId: "client-1", productId: "prod-1", certificationType: "HACCP", status: "obtained", issuer: "KEBS", notes: null, appliedAt: null, obtainedAt: new Date(), expiresAt: null, createdAt: new Date(), updatedAt: new Date() }],
    } as any])
    vi.mocked(matchSuppliers).mockReturnValue([
      {
        supplierId: "client-1",
        supplierName: "Jane Wanjiku",
        supplierCountry: "Kenya",
        buyerName: "Busan Food Processors",
        matchScore: 82,
        productFitScore: 30,
        complianceScore: 28,
        capacityScore: 24,
        matchedCommodities: ["coffee"],
        matchedCertifications: ["haccp"],
        gapCertifications: [],
        reasoning: ["Strong match on product and compliance"],
      },
    ])
    vi.mocked(sokogateIntegration.getSuppliers).mockResolvedValue({
      suppliers: [{ id: "soko-1", companyName: "Kenya Coffee Exporters", contactName: "James Kamau", email: "james@kenyacoffee.co.ke", country: "Kenya", commodities: ["Coffee"], certifications: ["HACCP"], exportReadinessScore: 78, status: "active" }],
    })
    vi.mocked(sokogateIntegration.getBuyers).mockResolvedValue({
      buyers: [{ id: "buyer-1", companyName: "Seoul Food Corp", contactName: "Ji-Yeon Kim", email: "jykim@seoulfood.kr", country: "South Korea", procurementInterests: ["Coffee"], requiredCertifications: ["HACCP"], status: "active" }],
    })
    vi.mocked(makeIntegration.triggerDailyReport).mockResolvedValue({
      success: true, statusCode: 200,
    })

    const result = await executeAgentServiceAction("trade", "Scan for corridor matches", mockContext)

    expect(result.success).toBe(true)
    expect(result.summary).toContain("Trade Agent")
    expect(sokogateIntegration.getSuppliers).toHaveBeenCalled()
    expect(sokogateIntegration.getBuyers).toHaveBeenCalled()
    expect(makeIntegration.triggerDailyReport).toHaveBeenCalled()
  })

  it("routes to compliance agent when agentType is 'compliance'", async () => {
    vi.mocked(prisma.clientCompliance.findMany).mockResolvedValueOnce([{
      id: "comp-1",
      clientId: "client-1",
      productId: null,
      certificationType: "HACCP",
      status: "obtained",
      issuer: "KEBS",
      notes: "Annual renewal needed",
      appliedAt: null,
      obtainedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      client: { name: "Jane Wanjiku", email: "jane@example.com" },
    } as any])
    vi.mocked(qmeIntegration.processDocument).mockResolvedValue({
      documentId: "qme-doc-1",
      extractedEntities: [],
      summary: "Compliance document reviewed successfully",
      categories: ["compliance"],
      keywords: ["HACCP", "certification"],
      sentiment: "neutral",
      processingTimeMs: 100,
    })
    vi.mocked(makeIntegration.triggerComplianceAlert).mockResolvedValue({
      success: true, statusCode: 200,
    })
    vi.mocked(voiceflowIntegration.startDialog).mockResolvedValue({
      success: true, traces: [], state: {}, ended: false, variables: {},
    })

    const result = await executeAgentServiceAction("compliance", "Check expiring certs", mockContext)

    expect(result.success).toBe(true)
    expect(result.summary).toContain("Compliance Agent")
    expect(qmeIntegration.processDocument).toHaveBeenCalled()
    expect(makeIntegration.triggerComplianceAlert).toHaveBeenCalled()
    expect(voiceflowIntegration.startDialog).toHaveBeenCalled()
  })

  it("routes to onboarding agent when agentType is 'onboarding'", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([{
      ...mockClient,
      status: "onboarding",
      user: { name: "Admin", email: "admin@mapato.app" },
    } as any])
    vi.mocked(qmeIntegration.addWorkflowTrigger).mockReturnValue("trigger-1")
    vi.mocked(voiceflowIntegration.startDialog).mockResolvedValue({
      success: true, traces: [], state: {}, ended: false, variables: {},
    })
    vi.mocked(zohoCrmIntegration.syncClientToCrm).mockResolvedValue({
      contactId: "zoho-contact-2",
    })
    vi.mocked(makeIntegration.triggerFollowUpSequence).mockResolvedValue({
      success: true, statusCode: 200,
    })

    const result = await executeAgentServiceAction("onboarding", "Follow up with stuck clients", mockContext)

    expect(result.success).toBe(true)
    expect(result.summary).toContain("Onboarding Agent")
    expect(sendWelcomeEmail).toHaveBeenCalled()
    expect(voiceflowIntegration.startDialog).toHaveBeenCalled()
    expect(zohoCrmIntegration.syncClientToCrm).toHaveBeenCalled()
    expect(makeIntegration.triggerFollowUpSequence).toHaveBeenCalled()
  })

  it("routes to revenue agent when agentType is 'revenue'", async () => {
    // First call: total revenue
    vi.mocked(prisma.revenueEntry.aggregate).mockResolvedValueOnce({
      _sum: { amount: 50000 },
      _avg: null as any,
      _max: null as any,
      _min: null as any,
      _count: 1 as any,
    })
    // Second call: monthly revenue (30-day window)
    vi.mocked(prisma.revenueEntry.aggregate).mockResolvedValueOnce({
      _sum: { amount: 15000 },
      _avg: null as any,
      _max: null as any,
      _min: null as any,
      _count: 1 as any,
    })
    vi.mocked(prisma.client.count).mockResolvedValueOnce(3)
    vi.mocked(prisma.client.aggregate).mockResolvedValueOnce({
      _sum: { monthlyRetainer: 1200 },
      _avg: null as any,
      _max: null as any,
      _min: null as any,
      _count: 1 as any,
    })
    vi.mocked(makeIntegration.triggerDailyReport).mockResolvedValueOnce({
      success: true, statusCode: 200,
    })
    vi.mocked(zohoCrmIntegration.syncClientToCrm).mockResolvedValue({
      contactId: "zoho-contact-3", dealId: "zoho-deal-3",
    })
    // Revenue agent also calls client.findMany for active client list
    vi.mocked(prisma.client.findMany).mockResolvedValue([mockClient])

    const result = await executeAgentServiceAction("revenue", "Generate financial report", mockContext)

    expect(result.success).toBe(true)
    expect(result.summary).toContain("Revenue Agent")
    expect(result.metrics?.total_revenue).toBe(50000)
    expect(result.metrics?.active_clients).toBe(3)
    expect(makeIntegration.triggerDailyReport).toHaveBeenCalled()
    expect(zohoCrmIntegration.syncClientToCrm).toHaveBeenCalled()
  })

  it("returns error for unknown agent type", async () => {
    const result = await executeAgentServiceAction("unknown-agent", "do something", mockContext)

    expect(result.success).toBe(false)
    expect(result.summary).toContain("No service bridge available")
    expect(result.errors).toBeDefined()
    expect(result.errors![0]).toContain("unknown-agent")
  })

  it("handles service failures gracefully without crashing", async () => {
    vi.mocked(prisma.client.findMany).mockRejectedValueOnce(new Error("DB connection failed"))

    const result = await executeAgentServiceAction("lead", "Qualify leads", mockContext)

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errors![0]).toContain("DB connection failed")
  })
})

// ============================================================
// Tests: Individual Agent Functions (isolated)
// ============================================================

describe("leadAgentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("processes leads and calls WATI, Voiceflow, Zoho, Make, Instantly", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([mockLead])
    vi.mocked(watiIntegration.handleIncomingMessage).mockResolvedValue({
      action: "forward_to_human", leadScore: 85,
    })
    vi.mocked(watiIntegration.sendTemplate).mockResolvedValue({ success: true })
    vi.mocked(voiceflowIntegration.qualifyLead).mockResolvedValue({
      score: 85, qualified: true, summary: "High value lead",
    })
    vi.mocked(zohoCrmIntegration.syncClientToCrm).mockResolvedValue({
      contactId: "zoho-contact-1",
    })
    vi.mocked(makeIntegration.triggerLeadCapture).mockResolvedValue({
      success: true, statusCode: 200,
    })
    vi.mocked(instantlyIntegration.launchOutreachCampaign).mockResolvedValue({
      campaignId: "inst-camp-1",
    })

    const result = await leadAgentAction("Qualify all new leads", mockContext)

    expect(result.success).toBe(true)
    expect(watiIntegration.handleIncomingMessage).toHaveBeenCalledWith({
      from: mockLead.phone,
      text: expect.stringContaining(mockLead.company),
    })
    expect(voiceflowIntegration.qualifyLead).toHaveBeenCalledWith(
      expect.objectContaining({ name: mockLead.name, email: mockLead.email })
    )
    expect(zohoCrmIntegration.syncClientToCrm).toHaveBeenCalled()
    expect(makeIntegration.triggerLeadCapture).toHaveBeenCalled()
    expect(instantlyIntegration.launchOutreachCampaign).toHaveBeenCalled()
  })
})

describe("tradeAgentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("scans suppliers, matches with Korean buyers, checks Sokogate", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([{
      ...mockClient,
      status: "active",
      products: [{
        id: "prod-1",
        clientId: "client-1",
        name: "Specialty Arabica Coffee",
        category: "agriculture",
        description: "High-grade Kenyan coffee",
        certifications: "HACCP, Organic",
        exportVolume: "2000 kg/month",
        unit: "kg",
        pricing: "$8.50/kg FOB Mombasa",
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      complianceRecords: [{
        id: "cr-1",
        clientId: "client-1",
        productId: "prod-1",
        certificationType: "HACCP",
        status: "obtained",
        issuer: "KEBS",
        notes: null,
        appliedAt: null,
        obtainedAt: new Date(),
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
    } as any])
    vi.mocked(matchSuppliers).mockReturnValue([])
    vi.mocked(sokogateIntegration.getSuppliers).mockResolvedValue({
      suppliers: [],
    })
    vi.mocked(sokogateIntegration.getBuyers).mockResolvedValue({
      buyers: [],
    })
    vi.mocked(makeIntegration.triggerDailyReport).mockResolvedValue({
      success: true, statusCode: 200,
    })

    const result = await tradeAgentAction("Scan corridors", mockContext)

    expect(result.success).toBe(true)
    expect(result.summary).toContain("Trade Agent")
    expect(prisma.client.findMany).toHaveBeenCalled()
    expect(sokogateIntegration.getSuppliers).toHaveBeenCalled()
    expect(sokogateIntegration.getBuyers).toHaveBeenCalled()
  })
})

describe("complianceAgentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("checks expiring certs and processes via QMe", async () => {
    vi.mocked(prisma.clientCompliance.findMany).mockResolvedValueOnce([])

    const result = await complianceAgentAction("Check certifications", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.expiring_certs).toBe(0)
    expect(prisma.clientCompliance.findMany).toHaveBeenCalled()
  })
})

describe("onboardingAgentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("follows up with stuck onboarding clients", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([])

    const result = await onboardingAgentAction("Follow up stuck clients", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.onboarding_stuck).toBe(0)
    expect(prisma.client.findMany).toHaveBeenCalled()
  })
})

describe("revenueAgentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("gathers revenue data and sends reports", async () => {
    // First call: total revenue
    vi.mocked(prisma.revenueEntry.aggregate).mockResolvedValueOnce({
      _sum: { amount: 75000 },
      _avg: null as any,
      _max: null as any,
      _min: null as any,
      _count: 1 as any,
    })
    // Second call: monthly revenue
    vi.mocked(prisma.revenueEntry.aggregate).mockResolvedValueOnce({
      _sum: { amount: 18000 },
      _avg: null as any,
      _max: null as any,
      _min: null as any,
      _count: 1 as any,
    })
    vi.mocked(prisma.client.count).mockResolvedValueOnce(5)
    vi.mocked(prisma.client.aggregate).mockResolvedValueOnce({
      _sum: { monthlyRetainer: 2500 },
      _avg: null as any,
      _max: null as any,
      _min: null as any,
      _count: 1 as any,
    })
    vi.mocked(makeIntegration.triggerDailyReport).mockResolvedValueOnce({
      success: true, statusCode: 200,
    })
    // Revenue agent also calls client.findMany for active client list
    vi.mocked(prisma.client.findMany).mockResolvedValue([])

    const result = await revenueAgentAction("Report revenue", mockContext)

    expect(result.success).toBe(true)
    expect(result.metrics?.total_revenue).toBe(75000)
    expect(result.metrics?.active_clients).toBe(5)
    expect(makeIntegration.triggerDailyReport).toHaveBeenCalled()
  })
})
