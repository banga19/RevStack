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
    user: {
      findUnique: vi.fn(),
    },
    onboardingResponse: {
      findFirst: vi.fn(),
    },
    preAuthQuestionnaire: {
      findFirst: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    clientCompliance: { findMany: vi.fn() },
    revenueEntry: { aggregate: vi.fn() },
    invoice: { findMany: vi.fn() },
    lead: { findMany: vi.fn() },
    retainer: { findMany: vi.fn() },
    followup: { findMany: vi.fn() },
    message: { findMany: vi.fn() },
    hermesRun: { findMany: vi.fn() },
    activity: { findMany: vi.fn() },
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
  revstackAgentAction,
  revstackPageDataAgentAction,
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
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    vi.mocked(prisma.client.findMany).mockResolvedValueOnce([{
      ...mockClient,
      status: "onboarding",
      user: { name: "Admin", email: "admin@mapato.app" },
      updatedAt: tenDaysAgo,
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

// ============================================================
// Tests: revstackAgentAction — Dashboard Analytics (invoices, clientHealth)
// ============================================================

describe("revstackAgentAction — invoices section", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches recent invoices with client info and computes metrics", async () => {
    // Mock all the queries revstackAgentAction runs for the 'all' section
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.client.findMany).mockResolvedValue([])
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])
    vi.mocked(prisma.followup.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    vi.mocked(prisma.hermesRun.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])

    // Mock invoices with various statuses
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      {
        id: "inv-1",
        retainerId: "ret-1",
        clientId: "client-1",
        invoiceNumber: "INV-ULTI-001",
        amountUsd: 4500,
        currency: "USD",
        status: "overdue",
        dueDate: new Date("2026-05-01"),
        issuedAt: new Date("2026-04-01"),
        paidAt: null,
        notes: null,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        client: { name: "Ultimo Trading Ltd", company: "Ultimo Trading" },
      },
      {
        id: "inv-2",
        retainerId: "ret-2",
        clientId: "client-2",
        invoiceNumber: "INV-SOKO-001",
        amountUsd: 2500,
        currency: "USD",
        status: "sent",
        dueDate: new Date("2026-06-15"),
        issuedAt: new Date("2026-06-01"),
        paidAt: null,
        notes: null,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        client: { name: "Soko Fresh Produce", company: "Soko Fresh" },
      },
      {
        id: "inv-3",
        retainerId: "ret-3",
        clientId: "client-3",
        invoiceNumber: "INV-EAST-001",
        amountUsd: 3000,
        currency: "USD",
        status: "paid",
        dueDate: new Date("2026-05-01"),
        issuedAt: new Date("2026-04-15"),
        paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago → within 30 days, counted
        notes: null,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        client: { name: "East Africa Logistics Hub", company: "EA Logistics" },
      },
    ] as any)

    // Action "invoices" triggers only the invoices section
    const result = await revstackAgentAction("invoices", mockContext)

    expect(result.success).toBe(true)

    // Parse the details JSON to check invoice data
    const data = JSON.parse(result.details!)

    // Should have 3 invoices in the list
    expect(data.invoices).toHaveLength(3)
    expect(data.invoices[0].invoiceNumber).toBe("INV-ULTI-001")
    expect(data.invoices[0].client.name).toBe("Ultimo Trading Ltd")

    // Invoice metrics
    expect(data.invoiceMetrics).toBeDefined()
    // overdue(4500) + sent(2500) = 7000 outstanding (paid 3000 excluded)
    expect(data.invoiceMetrics.totalOutstanding).toBe(7000)
    expect(data.invoiceMetrics.overdueCount).toBe(1)
    // paid 3000 within 30 days
    expect(data.invoiceMetrics.paidThisMonth).toBe(3000)
    expect(data.invoiceMetrics.totalInvoices).toBe(3)

    // Should have fetched invoices with client include
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { issuedAt: "desc" },
        take: 8,
        include: { client: { select: { name: true, company: true } } },
      })
    )
  })

  it("handles empty invoice list gracefully", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.client.findMany).mockResolvedValue([])
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])
    vi.mocked(prisma.followup.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    vi.mocked(prisma.hermesRun.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

    const result = await revstackAgentAction("invoices", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)
    expect(data.invoices).toHaveLength(0)
    expect(data.invoiceMetrics.totalOutstanding).toBe(0)
    expect(data.invoiceMetrics.overdueCount).toBe(0)
    expect(data.invoiceMetrics.paidThisMonth).toBe(0)
    expect(data.invoiceMetrics.totalInvoices).toBe(0)
  })

  it("computes paidThisMonth only for invoices paid within 30 days", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.client.findMany).mockResolvedValue([])
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])
    vi.mocked(prisma.followup.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    vi.mocked(prisma.hermesRun.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])

    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      // Paid within 30 days → counted
      {
        id: "inv-recent", invoiceNumber: "INV-RECENT", amountUsd: 1000,
        status: "paid", paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        client: { name: "Client A", company: "Co A" },
        retainerId: "r1", clientId: "c1", currency: "USD", dueDate: new Date(),
        issuedAt: new Date(), notes: null, userId: "u1", createdAt: new Date(), updatedAt: new Date(),
      },
      // Paid over 30 days ago → NOT counted
      {
        id: "inv-old", invoiceNumber: "INV-OLD", amountUsd: 2000,
        status: "paid", paidAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        client: { name: "Client B", company: "Co B" },
        retainerId: "r1", clientId: "c1", currency: "USD", dueDate: new Date(),
        issuedAt: new Date(), notes: null, userId: "u1", createdAt: new Date(), updatedAt: new Date(),
      },
      // Paid but paidAt is null → NOT counted
      {
        id: "inv-null-paid", invoiceNumber: "INV-NULL", amountUsd: 500,
        status: "paid", paidAt: null,
        client: { name: "Client C", company: "Co C" },
        retainerId: "r1", clientId: "c1", currency: "USD", dueDate: new Date(),
        issuedAt: new Date(), notes: null, userId: "u1", createdAt: new Date(), updatedAt: new Date(),
      },
    ] as any)

    const result = await revstackAgentAction("invoices", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)
    // recent(1000) + over30(2000) + nullPaid(500) = 3500 total
    expect(data.invoiceMetrics.totalOutstanding).toBe(0) // none are outstanding (all paid)
    // Only the 10-day-old paid invoice counts
    expect(data.invoiceMetrics.paidThisMonth).toBe(1000)
  })

  it("classifies draft/sent/overdue as outstanding, paid as not", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.client.findMany).mockResolvedValue([])
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])
    vi.mocked(prisma.followup.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    vi.mocked(prisma.hermesRun.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])

    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      { id: "i1", invoiceNumber: "INV-1", amountUsd: 100, status: "draft", paidAt: null, client: { name: "A", company: "A Inc" }, retainerId: "r1", clientId: "c1", currency: "USD", dueDate: new Date(), issuedAt: new Date(), notes: null, userId: "u1", createdAt: new Date(), updatedAt: new Date() },
      { id: "i2", invoiceNumber: "INV-2", amountUsd: 200, status: "sent", paidAt: null, client: { name: "B", company: "B Inc" }, retainerId: "r1", clientId: "c1", currency: "USD", dueDate: new Date(), issuedAt: new Date(), notes: null, userId: "u1", createdAt: new Date(), updatedAt: new Date() },
      { id: "i3", invoiceNumber: "INV-3", amountUsd: 300, status: "overdue", paidAt: null, client: { name: "C", company: "C Inc" }, retainerId: "r1", clientId: "c1", currency: "USD", dueDate: new Date(), issuedAt: new Date(), notes: null, userId: "u1", createdAt: new Date(), updatedAt: new Date() },
      { id: "i4", invoiceNumber: "INV-4", amountUsd: 400, status: "paid", paidAt: new Date(), client: { name: "D", company: "D Inc" }, retainerId: "r1", clientId: "c1", currency: "USD", dueDate: new Date(), issuedAt: new Date(), notes: null, userId: "u1", createdAt: new Date(), updatedAt: new Date() },
      { id: "i5", invoiceNumber: "INV-5", amountUsd: 500, status: "cancelled", paidAt: null, client: { name: "E", company: "E Inc" }, retainerId: "r1", clientId: "c1", currency: "USD", dueDate: new Date(), issuedAt: new Date(), notes: null, userId: "u1", createdAt: new Date(), updatedAt: new Date() },
    ] as any)

    const result = await revstackAgentAction("invoices", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)
    // draft(100) + sent(200) + overdue(300) = 600 outstanding
    expect(data.invoiceMetrics.totalOutstanding).toBe(600)
    // only 1 overdue
    expect(data.invoiceMetrics.overdueCount).toBe(1)
    // paid(400) within 30 days
    expect(data.invoiceMetrics.paidThisMonth).toBe(400)
  })
})

describe("revstackAgentAction — clientHealth section", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Create a mock client with controllable fields for health scoring tests.
   * The 5 scoring dimensions are:
   *   revenue    0-30 (retainer value / 100, capped at 30)
   *   engagement 0-25 (days since last followup: <7=25, <14=18, <30=10, <60=5, else 0)
   *   compliance 0-20 (none=10, expiring=5, mixed=15, all good=20)
   *   status     0-15 (active=15, onboarding=8, qualified=5)
   *   tenure     0-10 (>365d=10, >180d=8, >90d=6, >30d=4, else 2)
   *   total:     0-100
   */
  function makeMockClient(overrides: Record<string, any> = {}) {
    return {
      id: "client-1",
      name: "Test Client",
      company: "Test Co",
      status: "active",
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // ~6 months
      retainers: [{ amountUsd: 2000, billingCycle: "monthly" }],
      complianceRecords: [{ status: "obtained", expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) }], // 60 days from now
      followups: [{ createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }], // 3 days ago
      ...overrides,
      email: overrides.email || "test@example.com",
      corridor: overrides.corridor || null,
      tier: overrides.tier || null,
      ersScore: overrides.ersScore || null,
      ersBreakdown: overrides.ersBreakdown || null,
      notes: overrides.notes || null,
      monthlyRetainer: overrides.monthlyRetainer || null,
      phone: overrides.phone || null,
      userId: overrides.userId || "user-1",
      updatedAt: overrides.updatedAt || new Date(),
    }
  }

  it("scores a healthy client at 70+ (all 5 factors max or near-max)", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])
    vi.mocked(prisma.followup.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    vi.mocked(prisma.hermesRun.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

    // Active client, high retainer, recent contact, all compliance, 6mo tenure
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      makeMockClient({
        name: "Healthy Client",
        company: "Health Co",
        status: "active",
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // >365 days → tenure=10
        retainers: [{ amountUsd: 3000, billingCycle: "monthly" }], // 3000/100=30 → revenue=30
        complianceRecords: [
          { status: "obtained", expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }, // not expiring
        ],
        followups: [{ createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }], // 2 days ago → engagement=25
      }),
    ] as any)

    const result = await revstackAgentAction("client-health", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    expect(data.clientHealth.totalScored).toBe(1)
    expect(data.clientHealth.healthyCount).toBe(1)
    expect(data.clientHealth.highRiskCount).toBe(0)

    const scored = data.clientHealth.scoredClients[0]
    expect(scored.name).toBe("Healthy Client")
    expect(scored.tier).toBe("healthy")
    expect(scored.score).toBeGreaterThanOrEqual(70)
    // revenue=30, engagement=25, compliance=20, status=15, tenure=10 = 100
    expect(scored.score).toBe(100)
    expect(scored.factors).toEqual({
      revenue: 30,
      engagement: 25,
      compliance: 20,
      status: 15,
      tenure: 10,
    })
  })

  it("classifies a low-engagement client as high-risk (< 45)", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])
    vi.mocked(prisma.followup.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    vi.mocked(prisma.hermesRun.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

    vi.mocked(prisma.client.findMany).mockResolvedValue([
      makeMockClient({
        name: "At-Risk Client",
        company: "Risky Co",
        status: "qualified", // status=5
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days → tenure=2 (30 is NOT > 30, so falls to >30? branch)
        retainers: [], // no retainer → revenue=0
        complianceRecords: [], // no records → compliance=10
        followups: [{ createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) }], // 100 days ago → engagement=0
      }),
    ] as any)

    const result = await revstackAgentAction("client-health", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    expect(data.clientHealth.healthyCount).toBe(0)
    expect(data.clientHealth.highRiskCount).toBe(1)

    const scored = data.clientHealth.scoredClients[0]
    expect(scored.name).toBe("At-Risk Client")
    expect(scored.tier).toBe("high-risk")
    // revenue=0, engagement=0, compliance=10, status=5, tenure=2 = 17
    expect(scored.score).toBeLessThan(45)
    expect(scored.score).toBe(17)
  })

  it("classifies a medium-risk client (45-69)", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])
    vi.mocked(prisma.followup.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    vi.mocked(prisma.hermesRun.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

    vi.mocked(prisma.client.findMany).mockResolvedValue([
      makeMockClient({
        name: "Medium Client",
        company: "Medium Co",
        status: "active", // status=15
        createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000), // 91 days → tenure=6 (> 90)
        retainers: [{ amountUsd: 1000, billingCycle: "monthly" }], // 1000/100=10 → revenue=10
        complianceRecords: [
          { status: "obtained", expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) }, // expiring → compliance=5
        ],
        followups: [{ createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) }], // 20 days → engagement=10
      }),
    ] as any)

    const result = await revstackAgentAction("client-health", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    expect(data.clientHealth.mediumRiskCount).toBe(1)
    const scored = data.clientHealth.scoredClients[0]
    expect(scored.tier).toBe("medium")
    // revenue=10, engagement=10, compliance=5, status=15, tenure=6 = 46
    expect(scored.score).toBe(46)
  })

  it("sorts clients: high-risk first, then by score ascending", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])
    vi.mocked(prisma.followup.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    vi.mocked(prisma.hermesRun.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

    const now = Date.now()
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      // Medium risk (score ~49)
      makeMockClient({
        name: "Medium Client", id: "c-medium",
        status: "active",
        createdAt: new Date(now - 200 * 24 * 60 * 60 * 1000),
        retainers: [{ amountUsd: 500, billingCycle: "monthly" }],
        complianceRecords: [{ status: "obtained", expiresAt: new Date(now + 60 * 24 * 60 * 60 * 1000) }],
        followups: [{ createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000) }],
      }),
      // Healthy (score ~100)
      makeMockClient({
        name: "Healthy Client", id: "c-healthy",
        status: "active",
        createdAt: new Date(now - 400 * 24 * 60 * 60 * 1000),
        retainers: [{ amountUsd: 3000, billingCycle: "monthly" }],
        complianceRecords: [{ status: "obtained", expiresAt: new Date(now + 90 * 24 * 60 * 60 * 1000) }],
        followups: [{ createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000) }],
      }),
      // High-risk (score ~19)
      makeMockClient({
        name: "High-Risk Client", id: "c-highrisk",
        status: "qualified",
        createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
        retainers: [],
        complianceRecords: [],
        followups: [{ createdAt: new Date(now - 100 * 24 * 60 * 60 * 1000) }],
      }),
    ] as any)

    const result = await revstackAgentAction("client-health", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    const names = data.clientHealth.scoredClients.map((c: any) => c.name)
    // High-risk first, then by score ascending
    expect(names[0]).toBe("High-Risk Client")
    expect(names[1]).toBe("Medium Client")
    expect(names[2]).toBe("Healthy Client")

    // Scores should be ascending within same tier
    expect(data.clientHealth.scoredClients[0].score).toBeLessThan(
      data.clientHealth.scoredClients[1].score
    )
  })

  it("handles empty client list gracefully", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])
    vi.mocked(prisma.followup.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    vi.mocked(prisma.hermesRun.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])
    vi.mocked(prisma.client.findMany).mockResolvedValue([])

    const result = await revstackAgentAction("client-health", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)
    expect(data.clientHealth.totalScored).toBe(0)
    expect(data.clientHealth.scoredClients).toHaveLength(0)
    expect(data.clientHealth.healthyCount).toBe(0)
    expect(data.clientHealth.mediumRiskCount).toBe(0)
    expect(data.clientHealth.highRiskCount).toBe(0)
    expect(data.clientHealth.averageScore).toBe(0)
  })

  it("applies engagement curve correctly at each threshold", async () => {
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.retainer.findMany).mockResolvedValue([])
    vi.mocked(prisma.followup.findMany).mockResolvedValue([])
    vi.mocked(prisma.message.findMany).mockResolvedValue([])
    vi.mocked(prisma.hermesRun.findMany).mockResolvedValue([])
    vi.mocked(prisma.activity.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

    const now = Date.now()
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      makeMockClient({ name: "Engaged", followups: [{ createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000) }] }), // <7 → 25
      makeMockClient({ name: "Moderate", followups: [{ createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000) }] }), // <14 → 18
      makeMockClient({ name: "Distant", followups: [{ createdAt: new Date(now - 20 * 24 * 60 * 60 * 1000) }] }), // <30 → 10
      makeMockClient({ name: "Lapsed", followups: [{ createdAt: new Date(now - 45 * 24 * 60 * 60 * 1000) }] }), // <60 → 5
      makeMockClient({ name: "Silent", followups: [{ createdAt: new Date(now - 100 * 24 * 60 * 60 * 1000) }] }), // ≥60 → 0
      makeMockClient({ name: "New", followups: [] }), // no followup → 0
    ] as any)

    const result = await revstackAgentAction("client-health", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    const getScore = (name: string) =>
      data.clientHealth.scoredClients.find((c: any) => c.name === name)!

    expect(getScore("Engaged").factors.engagement).toBe(25)
    expect(getScore("Moderate").factors.engagement).toBe(18)
    expect(getScore("Distant").factors.engagement).toBe(10)
    expect(getScore("Lapsed").factors.engagement).toBe(5)
    expect(getScore("Silent").factors.engagement).toBe(0)
    expect(getScore("New").factors.engagement).toBe(0)
  })
})

// ============================================================
// Tests: revstackPageDataAgentAction — invoices and client-health page types
// ============================================================

describe("revstackPageDataAgentAction — invoices page type", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches invoices with client details", async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      {
        id: "inv-1", retainerId: "ret-1", clientId: "c1", invoiceNumber: "INV-001",
        amountUsd: 4500, currency: "USD", status: "overdue",
        dueDate: new Date(), issuedAt: new Date(), paidAt: null,
        notes: null, userId: "u1", createdAt: new Date(), updatedAt: new Date(),
        client: { name: "Ultimo Trading", company: "Ultimo Trading Ltd" },
      },
      {
        id: "inv-2", retainerId: "ret-2", clientId: "c2", invoiceNumber: "INV-002",
        amountUsd: 2500, currency: "USD", status: "sent",
        dueDate: new Date(), issuedAt: new Date(), paidAt: null,
        notes: null, userId: "u1", createdAt: new Date(), updatedAt: new Date(),
        client: { name: "Soko Fresh", company: "Soko Fresh Produce" },
      },
    ] as any)

    const result = await revstackPageDataAgentAction("invoices|list", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)
    expect(data).toHaveLength(2)
    expect(data[0].invoiceNumber).toBe("INV-001")
    expect(data[0].client.name).toBe("Ultimo Trading")
    expect(data[1].client.company).toBe("Soko Fresh Produce")
    expect(result.metrics?.count).toBe(2)
  })

  it("filters invoices by status", async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      {
        id: "inv-sent", retainerId: "r1", clientId: "c1", invoiceNumber: "INV-003",
        amountUsd: 1000, currency: "USD", status: "sent",
        dueDate: new Date(), issuedAt: new Date(), paidAt: null,
        notes: null, userId: "u1", createdAt: new Date(), updatedAt: new Date(),
        client: { name: "Client A", company: "Co A" },
      },
    ] as any)

    await revstackPageDataAgentAction('invoices|list|{"status":"sent"}', mockContext)

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "sent" },
        include: { client: { select: { name: true, company: true } } },
      })
    )
  })

  it("filters invoices by clientId", async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

    await revstackPageDataAgentAction('invoices|list|{"clientId":"c-123"}', mockContext)

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: "c-123" },
      })
    )
  })

  it("filters by status=all passes no status filter", async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

    await revstackPageDataAgentAction('invoices|list|{"status":"all"}', mockContext)

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    )
  })

  it("handles empty invoice list gracefully", async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

    const result = await revstackPageDataAgentAction("invoices|list", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)
    expect(data).toHaveLength(0)
    expect(result.metrics?.count).toBe(0)
  })

  it("respects custom limit parameter", async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])

    await revstackPageDataAgentAction('invoices|list|{"limit":5}', mockContext)

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    )
  })
})

describe("revstackPageDataAgentAction — client-health page type", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Helper to create a mock client for health scoring tests.
   * The 5 scoring dimensions:
   *   revenue    0-30 (retainer value / 100, capped at 30)
   *   engagement 0-25 (days since last followup: <7=25, <14=18, <30=10, <60=5, else 0)
   *   compliance 0-20 (none=10, expiring=5, mixed=15, all good=20)
   *   status     0-15 (active=15, onboarding=8, qualified=5)
   *   tenure     0-10 (>365d=10, >180d=8, >90d=6, >30d=4, else 2)
   *   total:     0-100
   */
  function makeMockClient(overrides: Record<string, any> = {}) {
    return {
      id: "client-1",
      name: "Test Client",
      company: "Test Co",
      status: "active",
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      retainers: [{ amountUsd: 2000, billingCycle: "monthly" }],
      complianceRecords: [{ status: "obtained", expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) }],
      followups: [{ createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }],
      ...overrides,
      email: overrides.email || "test@example.com",
      corridor: overrides.corridor || null,
      tier: overrides.tier || null,
      ersScore: overrides.ersScore || null,
      ersBreakdown: overrides.ersBreakdown || null,
      notes: overrides.notes || null,
      monthlyRetainer: overrides.monthlyRetainer || null,
      phone: overrides.phone || null,
      userId: overrides.userId || "user-1",
      updatedAt: overrides.updatedAt || new Date(),
    }
  }

  it("scores a healthy client at 70+ (max factors)", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      makeMockClient({
        name: "Healthy Client",
        status: "active",
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // >365d → tenure=10
        retainers: [{ amountUsd: 3000, billingCycle: "monthly" }], // 3000/100=30 → revenue=30
        complianceRecords: [
          { status: "obtained", expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }, // not expiring
        ],
        followups: [{ createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }], // 2d → engagement=25
      }),
    ] as any)

    const result = await revstackPageDataAgentAction("client-health|list", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    expect(data.totalScored).toBe(1)
    expect(data.healthyCount).toBe(1)
    expect(data.highRiskCount).toBe(0)

    const scored = data.scoredClients[0]
    expect(scored.name).toBe("Healthy Client")
    expect(scored.tier).toBe("healthy")
    expect(scored.score).toBe(100)
    expect(scored.factors).toEqual({
      revenue: 30, engagement: 25, compliance: 20, status: 15, tenure: 10,
    })
  })

  it("classifies low-engagement client as high-risk (< 45)", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      makeMockClient({
        name: "At-Risk Client",
        status: "qualified", // status=5
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30d → tenure=2 (30 is NOT > 30)
        retainers: [], // revenue=0
        complianceRecords: [], // compliance=10
        followups: [{ createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) }], // 100d → engagement=0
      }),
    ] as any)

    const result = await revstackPageDataAgentAction("client-health|list", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    expect(data.healthyCount).toBe(0)
    expect(data.highRiskCount).toBe(1)

    const scored = data.scoredClients[0]
    expect(scored.tier).toBe("high-risk")
    // revenue=0, engagement=0, compliance=10, status=5, tenure=2 = 17
    expect(scored.score).toBe(17)
  })

  it("classifies a medium-risk client (45-69)", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      makeMockClient({
        name: "Medium Client",
        status: "active", // status=15
        createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000), // 91d → tenure=6 (> 90)
        retainers: [{ amountUsd: 1000, billingCycle: "monthly" }], // 1000/100=10 → revenue=10
        complianceRecords: [
          { status: "obtained", expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) }, // expiring → compliance=5
        ],
        followups: [{ createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) }], // 20d → engagement=10
      }),
    ] as any)

    const result = await revstackPageDataAgentAction("client-health|list", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    expect(data.mediumRiskCount).toBe(1)
    const scored = data.scoredClients[0]
    expect(scored.tier).toBe("medium")
    // revenue=10, engagement=10, compliance=5, status=15, tenure=6 = 46
    expect(scored.score).toBe(46)
  })

  it("sorts clients: high-risk first, then by score ascending", async () => {
    const now = Date.now()
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      // Medium risk
      makeMockClient({
        name: "Medium Client", id: "c-medium",
        status: "active",
        createdAt: new Date(now - 200 * 24 * 60 * 60 * 1000),
        retainers: [{ amountUsd: 500, billingCycle: "monthly" }],
        complianceRecords: [{ status: "obtained", expiresAt: new Date(now + 60 * 24 * 60 * 60 * 1000) }],
        followups: [{ createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000) }],
      }),
      // Healthy
      makeMockClient({
        name: "Healthy Client", id: "c-healthy",
        status: "active",
        createdAt: new Date(now - 400 * 24 * 60 * 60 * 1000),
        retainers: [{ amountUsd: 3000, billingCycle: "monthly" }],
        complianceRecords: [{ status: "obtained", expiresAt: new Date(now + 90 * 24 * 60 * 60 * 1000) }],
        followups: [{ createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000) }],
      }),
      // High-risk
      makeMockClient({
        name: "High-Risk Client", id: "c-highrisk",
        status: "qualified",
        createdAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
        retainers: [],
        complianceRecords: [],
        followups: [{ createdAt: new Date(now - 100 * 24 * 60 * 60 * 1000) }],
      }),
    ] as any)

    const result = await revstackPageDataAgentAction("client-health|list", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    const names = data.scoredClients.map((c: any) => c.name)
    expect(names[0]).toBe("High-Risk Client")
    expect(names[1]).toBe("Medium Client")
    expect(names[2]).toBe("Healthy Client")
    expect(data.scoredClients[0].score).toBeLessThan(data.scoredClients[1].score)
  })

  it("handles empty client list gracefully", async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([])

    const result = await revstackPageDataAgentAction("client-health|list", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)
    expect(data.totalScored).toBe(0)
    expect(data.scoredClients).toHaveLength(0)
    expect(data.healthyCount).toBe(0)
    expect(data.mediumRiskCount).toBe(0)
    expect(data.highRiskCount).toBe(0)
    expect(data.averageScore).toBe(0)
  })

  it("applies engagement curve correctly at each threshold", async () => {
    const now = Date.now()
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      makeMockClient({ name: "Engaged", followups: [{ createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000) }] }),
      makeMockClient({ name: "Moderate", followups: [{ createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000) }] }),
      makeMockClient({ name: "Distant", followups: [{ createdAt: new Date(now - 20 * 24 * 60 * 60 * 1000) }] }),
      makeMockClient({ name: "Lapsed", followups: [{ createdAt: new Date(now - 45 * 24 * 60 * 60 * 1000) }] }),
      makeMockClient({ name: "Silent", followups: [{ createdAt: new Date(now - 100 * 24 * 60 * 60 * 1000) }] }),
      makeMockClient({ name: "New", followups: [] }),
    ] as any)

    const result = await revstackPageDataAgentAction("client-health|list", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    const getScore = (name: string) =>
      data.scoredClients.find((c: any) => c.name === name)!.factors.engagement

    expect(getScore("Engaged")).toBe(25)
    expect(getScore("Moderate")).toBe(18)
    expect(getScore("Distant")).toBe(10)
    expect(getScore("Lapsed")).toBe(5)
    expect(getScore("Silent")).toBe(0)
    expect(getScore("New")).toBe(0)
  })

  it("applies compliance score correctly: no records=10, expiring=5, mixed=15, good=20", async () => {
    const now = Date.now()
    vi.mocked(prisma.client.findMany).mockResolvedValue([
      makeMockClient({ name: "No Compliance", complianceRecords: [] }),
      makeMockClient({
        name: "Good Compliance",
        complianceRecords: [{ status: "obtained", expiresAt: new Date(now + 90 * 24 * 60 * 60 * 1000) }],
      }),
      makeMockClient({
        name: "Mixed Compliance",
        complianceRecords: [
          { status: "obtained", expiresAt: new Date(now + 60 * 24 * 60 * 60 * 1000) },
          { status: "obtained", expiresAt: new Date(now + 10 * 24 * 60 * 60 * 1000) },
        ],
      }),
      makeMockClient({
        name: "Expiring Compliance",
        complianceRecords: [
          { status: "obtained", expiresAt: new Date(now + 5 * 24 * 60 * 60 * 1000) },
          { status: "obtained", expiresAt: new Date(now + 10 * 24 * 60 * 60 * 1000) },
        ],
      }),
    ] as any)

    const result = await revstackPageDataAgentAction("client-health|list", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    const getScore = (name: string) =>
      data.scoredClients.find((c: any) => c.name === name)!.factors.compliance

    expect(getScore("No Compliance")).toBe(10)
    expect(getScore("Good Compliance")).toBe(20)
    expect(getScore("Mixed Compliance")).toBe(15)
    expect(getScore("Expiring Compliance")).toBe(5)
  })

  it("limits scored clients to 12", async () => {
    // Create 15 mock clients
    const manyClients = Array.from({ length: 15 }, (_, i) =>
      makeMockClient({
        name: `Client ${i + 1}`,
        id: `c-${i}`,
        status: "active",
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      })
    )
    vi.mocked(prisma.client.findMany).mockResolvedValue(manyClients as any)

    const result = await revstackPageDataAgentAction("client-health|list", mockContext)

    expect(result.success).toBe(true)
    const data = JSON.parse(result.details!)

    expect(data.totalScored).toBe(15)
    expect(data.scoredClients).toHaveLength(12)
  })
})

// ============================================================
// Personalization: getUserPersonalizationContext + cache
// ============================================================

describe("User Personalization", () => {
  let personalizationCacheClear: () => void

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import("./agent-service-bridge")
    personalizationCacheClear = () => mod.personalizationCache.clear()
    personalizationCacheClear()
  })

  it("loads context from DB and merges onboarding + questionnaire data", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "u-1",
      name: "Alice",
      email: "alice@example.com",
      subscriptionTier: "starter",
      subscriptionStatus: "active",
    } as any)
    vi.mocked(prisma.onboardingResponse.findFirst).mockResolvedValueOnce({
      id: "o-1",
      userId: "u-1",
      businessName: "Acme",
      industry: "trading-wholesale",
      companySize: "small-agency",
      primaryGoal: "korea-export",
      secondaryGoals: "compliance",
      currentChallenges: "certification",
      targetAudience: "enterprise",
      servicesNeeded: "trade-finance",
      budgetRange: "1000-2500",
      timeline: "1-3-months",
      referralSource: "linkedin",
    } as any)
    vi.mocked(prisma.preAuthQuestionnaire.findFirst).mockResolvedValue(null as any)

    const { getUserPersonalizationContext } = await import("./agent-service-bridge")
    const result = await getUserPersonalizationContext("u-1")

    expect(result).not.toBeNull()
    expect(result!.businessName).toBe("Acme")
    expect(result!.industry).toBe("trading-wholesale")
    expect(result!.primaryGoal).toBe("korea-export")
    expect(result!.subscriptionTier).toBe("starter")
  })

  it("calls DB once within TTL, then uses cache", async () => {
    const mockUser = { id: "u-1", name: "Bob", email: "b@b.com", subscriptionTier: "growth", subscriptionStatus: "active" }
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any)
    vi.mocked(prisma.onboardingResponse.findFirst).mockResolvedValueOnce({
      id: "o-1", userId: "u-1", businessName: "BobCo", industry: "ecommerce", primaryGoal: "generate-leads", companySize: "small-agency", budgetRange: "under-1000", timeline: "asap",
    } as any)
    vi.mocked(prisma.preAuthQuestionnaire.findFirst).mockResolvedValue(null as any)

    const { getCachedUserPersonalization } = await import("./agent-service-bridge")
    const first = await getCachedUserPersonalization("u-1", 60_000)
    expect(first?.businessName).toBe("BobCo")
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1)

    const second = await getCachedUserPersonalization("u-1", 60_000)
    expect(second?.businessName).toBe("BobCo")
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1) // still 1 — served from cache
  })

  it("invalidates and reloads after invalidation", async () => {
    const mockUser = { id: "u-1", name: "Carol", email: "c@c.com", subscriptionTier: "trial", subscriptionStatus: "trial" }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(prisma.onboardingResponse.findFirst).mockResolvedValue({
      id: "o-1", userId: "u-1", businessName: "CarolCo", industry: "agriculture", primaryGoal: "afcfta",
    } as any)
    vi.mocked(prisma.preAuthQuestionnaire.findFirst).mockResolvedValue(null as any)

    const { getCachedUserPersonalization, invalidatePersonalizationCache } = await import("./agent-service-bridge")
    const first = await getCachedUserPersonalization("u-1", 60_000)
    expect(first?.businessName).toBe("CarolCo")

    // Invalidate
    invalidatePersonalizationCache("u-1")

    // Next call should reload from DB
    const second = await getCachedUserPersonalization("u-1", 60_000)
    expect(second?.businessName).toBe("CarolCo")
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2)
  })
})
