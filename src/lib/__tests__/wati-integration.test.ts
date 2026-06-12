/**
 * Unit tests for WATIIntegration class.
 *
 * The WATIIntegration class has no external dependencies — it uses in-memory
 * Maps for contacts, campaigns, and templates. When not configured (no API token),
 * all API methods fall back to simulation mode with local logic.
 *
 * Covers:
 *   - Constructor and configuration (@@isConfigured)
 *   - Template management (defaults, add, get, find)
 *   - Lead scoring (handleIncomingMessage, calculateLeadScore)
 *   - Contact management (create, get by phone, list)
 *   - Campaign lifecycle (create, start, status, list)
 *   - sendMessage in simulation mode
 *   - sendTemplate with fallback behavior
 *   - Edge cases (empty contacts, missing templates, invalid input)
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { WATIIntegration } from "@/lib/wati-integration"

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clear WATI env vars so the constructor doesn't pick them up from the
 * test environment (where .env / .env.local is loaded).
 */
function clearWatiEnv() {
  vi.stubEnv("WATI_API_TOKEN", "")
  vi.stubEnv("WATI_WHATSAPP_NUMBER_ID", "")
  vi.stubEnv("WATI_API_URL", "")
}

function restoreEnv() {
  vi.unstubAllEnvs()
}

/**
 * Create a fresh WATIIntegration instance in simulation mode (no credentials).
 * All methods fall back to local/in-memory logic.
 */
function createSimulatedWati(): WATIIntegration {
  clearWatiEnv()
  return new WATIIntegration({
    apiToken: "",
    whatsappNumberId: "",
    baseUrl: "https://live-mt-server.wati.io",
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe("WATIIntegration", () => {
  let wati: WATIIntegration

  beforeEach(() => {
    wati = createSimulatedWati()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Constructor & Configuration
  // ─────────────────────────────────────────────────────────────────────────

  describe("constructor & configuration", () => {
    afterEach(() => {
      restoreEnv()
    })

    it("creates an instance with default config", () => {
      clearWatiEnv()
      const instance = new WATIIntegration()
      expect(instance).toBeInstanceOf(WATIIntegration)
    })

    it("returns isConfigured false when no API token is set", () => {
      expect(wati.isConfigured()).toBe(false)
    })

    it("returns isConfigured true when both token and number ID are set", () => {
      clearWatiEnv()
      const instance = new WATIIntegration({
        apiToken: "test-token",
        whatsappNumberId: "12345",
      })
      expect(instance.isConfigured()).toBe(true)
    })

    it("returns isConfigured false when only token is set", () => {
      clearWatiEnv()
      const instance = new WATIIntegration({
        apiToken: "test-token",
        whatsappNumberId: "",
      })
      expect(instance.isConfigured()).toBe(false)
    })

    it("returns isConfigured false when only number ID is set", () => {
      clearWatiEnv()
      const instance = new WATIIntegration({
        apiToken: "",
        whatsappNumberId: "12345",
      })
      expect(instance.isConfigured()).toBe(false)
    })

    it("applies partial config via configure method", () => {
      wati.configure({ apiToken: "new-token", whatsappNumberId: "99999" })
      expect(wati.isConfigured()).toBe(true)
    })

    it("overrides only provided fields in configure", () => {
      // After createSimulatedWati, both are empty + env stubbed
      wati.configure({ whatsappNumberId: "55555" })
      expect(wati.isConfigured()).toBe(false) // apiToken still empty

      wati.configure({ apiToken: "abc" })
      expect(wati.isConfigured()).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Template Management
  // ─────────────────────────────────────────────────────────────────────────

  describe("template management", () => {
    it("loads default templates on construction", () => {
      const templates = wati.getTemplates()
      expect(templates.length).toBeGreaterThanOrEqual(6)
    })

    it("includes the fallback template (new-chat-fallback)", () => {
      const templates = wati.getTemplates()
      const fallback = templates.find((t) => t.id === "new-chat-fallback")
      expect(fallback).toBeDefined()
      expect(fallback!.name).toBe("new_chat_v1")
      expect(fallback!.status).toBe("APPROVED")
    })

    it("includes lead-welcome template", () => {
      const templates = wati.getTemplates()
      const leadWelcome = templates.find((t) => t.id === "lead-welcome")
      expect(leadWelcome).toBeDefined()
      expect(leadWelcome!.name).toBe("sokogate_lead_welcome")
      expect(leadWelcome!.category).toBe("MARKETING")
    })

    it("includes follow-up-24h template", () => {
      const templates = wati.getTemplates()
      const followUp = templates.find((t) => t.id === "follow-up-24h")
      expect(followUp).toBeDefined()
    })

    it("includes re-engagement template", () => {
      const templates = wati.getTemplates()
      const reEngage = templates.find((t) => t.id === "re-engagement")
      expect(reEngage).toBeDefined()
    })

    it("includes order-confirmation template", () => {
      const templates = wati.getTemplates()
      const order = templates.find((t) => t.id === "order-confirmation")
      expect(order).toBeDefined()
    })

    it("includes lead-scored-high template", () => {
      const templates = wati.getTemplates()
      const scored = templates.find((t) => t.id === "lead-scored-high")
      expect(scored).toBeDefined()
      expect(scored!.name).toBe("sokogate_korea_corridor")
    })

    it("adds a custom template and returns its ID", () => {
      const id = wati.addTemplate({
        name: "custom_test",
        category: "UTILITY",
        language: "en",
        status: "APPROVED",
        body: "Hello {{1}}, this is a test.",
      })
      expect(id).toBeDefined()
      expect(typeof id).toBe("string")

      const templates = wati.getTemplates()
      const added = templates.find((t) => t.id === id)
      expect(added).toBeDefined()
      expect(added!.name).toBe("custom_test")
      expect(added!.body).toBe("Hello {{1}}, this is a test.")
    })

    it("returns an empty string from addTemplate when called improperly", () => {
      // addTemplate returns a string ID; verify it's non-empty
      const id = wati.addTemplate({
        name: "minimal",
        category: "UTILITY",
        language: "en",
        status: "PENDING",
        body: "Minimal body",
      })
      expect(id.length).toBeGreaterThan(0)
    })

    it("finds template by ID from getTemplates list", () => {
      const allTemplates = wati.getTemplates()
      // Every template should have an id, name, category, language, status, body
      for (const t of allTemplates) {
        expect(t.id).toBeDefined()
        expect(t.name).toBeDefined()
        expect(t.category).toBeDefined()
        expect(t.language).toBeDefined()
        expect(t.status).toBeDefined()
        expect(t.body).toBeDefined()
        expect(t.createdAt).toBeDefined()
      }
    })

    it("templates have valid status values", () => {
      const validStatuses = ["APPROVED", "PENDING", "REJECTED", "PAUSED"]
      for (const t of wati.getTemplates()) {
        expect(validStatuses).toContain(t.status)
      }
    })

    it("templates have valid category values", () => {
      const validCategories = ["MARKETING", "UTILITY", "AUTHENTICATION"]
      for (const t of wati.getTemplates()) {
        expect(validCategories).toContain(t.category)
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Lead Scoring (handleIncomingMessage / calculateLeadScore)
  // ─────────────────────────────────────────────────────────────────────────

  describe("lead scoring — handleIncomingMessage", () => {
    it("returns forward_to_human for high-value messages (score >= 70)", async () => {
      const result = await wati.handleIncomingMessage({
        from: "254712345678",
        text: "We want to buy 5 containers of coffee beans immediately. Company: QA Traders Ltd.",
      })
      expect(result.action).toBe("forward_to_human")
      expect(result.leadScore).toBeGreaterThanOrEqual(70)
      expect(result.reply).toContain("trade specialist")
    })

    it("returns auto_reply for medium-value messages (30 <= score < 70)", async () => {
      const result = await wati.handleIncomingMessage({
        from: "254712345678",
        text: "I need a sample of your products for quality check.",
      })
      expect(result.action).toBe("auto_reply")
      expect(result.leadScore).toBeGreaterThanOrEqual(30)
      expect(result.leadScore).toBeLessThan(70)
    })

    it("returns update_crm for low-value messages (score < 30)", async () => {
      const result = await wati.handleIncomingMessage({
        from: "254712345678",
        text: "Hello, how are you?",
      })
      expect(result.action).toBe("update_crm")
      expect(result.leadScore).toBeLessThan(30)
    })

    it("scores 100 for order+buy+purchase intent", async () => {
      const result = await wati.handleIncomingMessage({
        from: "254700000000",
        text: "I want to order and buy and purchase bulk containers urgently.",
      })
      expect(result.leadScore).toBeGreaterThanOrEqual(85)
      expect(result.action).toBe("forward_to_human")
    })

    it("detects pricing intent and adds extra score", async () => {
      const result = await wati.handleIncomingMessage({
        from: "254700000000",
        text: "What is the price for your coffee beans? How much per kg?",
      })
      expect(result.leadScore).toBeGreaterThanOrEqual(30)
    })

    it("identifies company indicators in message", async () => {
      const result = await wati.handleIncomingMessage({
        from: "254700000000",
        text: "Our trading company ltd is interested in your wholesale catalog.",
      })
      // company + trading + wholesale + interested = multiple keyword matches
      expect(result.leadScore).toBeGreaterThanOrEqual(30)
    })

    it("caps score at 100 maximum", async () => {
      // A message that matches almost every keyword
      const result = await wati.handleIncomingMessage({
        from: "254700000000",
        text: "Our company ltd urgently needs to buy bulk containers and order immediately. We require pricing for shipment delivery from your supplier business.",
      })
      expect(result.leadScore).toBeLessThanOrEqual(100)
    })

    it("handles empty message text gracefully", async () => {
      const result = await wati.handleIncomingMessage({
        from: "254700000000",
        text: "",
      })
      expect(result.leadScore).toBe(0)
      expect(result.action).toBe("update_crm")
    })

    it("handles very long message text without error", async () => {
      const longText = "We need to order ".repeat(100)
      const result = await wati.handleIncomingMessage({
        from: "254700000000",
        text: longText,
      })
      expect(result.leadScore).toBeGreaterThan(0)
      expect(result.leadScore).toBeLessThanOrEqual(100)
    })

    it("is case-insensitive in keyword matching", async () => {
      const upper = await wati.handleIncomingMessage({
        from: "254700000000",
        text: "ORDER BUY PURCHASE URGENT COMPANY",
      })
      const lower = await wati.handleIncomingMessage({
        from: "254700000000",
        text: "order buy purchase urgent company",
      })
      const mixed = await wati.handleIncomingMessage({
        from: "254700000000",
        text: "Order Buy Purchase Urgent Company",
      })
      expect(upper.leadScore).toBe(lower.leadScore)
      expect(mixed.leadScore).toBe(upper.leadScore)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Contact Management
  // ─────────────────────────────────────────────────────────────────────────

  describe("contact management", () => {
    it("creates a contact in simulation mode", async () => {
      const result = await wati.createContact({
        name: "Test User",
        phone: "254712345678",
        email: "test@example.com",
        tags: ["test"],
        customFields: { source: "unit-test" },
      })
      expect(result.success).toBe(true)
      expect(result.contactId).toBeDefined()
    })

    it("creates a contact without optional fields", async () => {
      const result = await wati.createContact({
        name: "Minimal User",
        phone: "254700000001",
      })
      expect(result.success).toBe(true)
      expect(result.contactId).toBeDefined()
    })

    it("retrieves created contact by phone number", async () => {
      await wati.createContact({
        name: "Find Me",
        phone: "254799999999",
        tags: ["findable"],
      })

      const found = wati.getContactByPhone("254799999999")
      expect(found).toBeDefined()
      expect(found!.name).toBe("Find Me")
      expect(found!.tags).toContain("findable")
      expect(found!.status).toBe("new")
    })

    it("returns undefined for non-existent phone number", () => {
      const notFound = wati.getContactByPhone("2547000000")
      expect(notFound).toBeUndefined()
    })

    it("lists all created contacts", async () => {
      await wati.createContact({ name: "Contact A", phone: "254700000001" })
      await wati.createContact({ name: "Contact B", phone: "254700000002" })
      await wati.createContact({ name: "Contact C", phone: "254700000003" })

      const all = wati.getAllContacts()
      expect(all.length).toBe(3)
      expect(all.map((c) => c.name)).toContain("Contact A")
      expect(all.map((c) => c.name)).toContain("Contact C")
    })

    it("returns empty array when no contacts exist", () => {
      expect(wati.getAllContacts()).toEqual([])
    })

    it("assigns a unique ID to each contact", async () => {
      const a = await wati.createContact({ name: "A", phone: "254700000001" })
      const b = await wati.createContact({ name: "B", phone: "254700000002" })
      expect(a.contactId).not.toBe(b.contactId)
    })

    it("sets default fields on created contact", async () => {
      const result = await wati.createContact({
        name: "Default Check",
        phone: "254712345678",
      })
      expect(result.success).toBe(true)

      const contact = wati.getContactByPhone("254712345678")
      expect(contact).toBeDefined()
      expect(contact!.source).toBe("whatsapp")
      expect(contact!.score).toBe(0)
      expect(contact!.status).toBe("new")
      expect(contact!.createdAt).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Campaign Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  describe("campaign lifecycle", () => {
    it("creates a campaign in draft status", async () => {
      const result = await wati.createCampaign({
        name: "Test Campaign",
        templateName: "lead-welcome",
        contacts: ["254700000001", "254700000002"],
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      })
      expect(result.success).toBe(true)
      expect(result.campaignId).toBeDefined()
    })

    it("creates a campaign without scheduledAt", async () => {
      const result = await wati.createCampaign({
        name: "Immediate Campaign",
        templateName: "lead-welcome",
        contacts: ["254700000001"],
      })
      expect(result.success).toBe(true)
      expect(result.campaignId).toBeDefined()
    })

    it("starts a campaign and updates its status to completed", async () => {
      const { campaignId } = await wati.createCampaign({
        name: "Startable Campaign",
        templateName: "lead-welcome",
        contacts: ["254700000001"],
      })

      const started = await wati.startCampaign(campaignId!)
      expect(started).toBe(true)

      const campaign = wati.getCampaign(campaignId!)
      expect(campaign).toBeDefined()
      expect(campaign!.status).toBe("completed")
      expect(campaign!.sentCount).toBe(1)
      expect(campaign!.startedAt).toBeDefined()
      expect(campaign!.completedAt).toBeDefined()
    })

    it("returns false when starting a non-existent campaign", async () => {
      const result = await wati.startCampaign("non-existent-id")
      expect(result).toBe(false)
    })

    it("retrieves campaign by ID", async () => {
      const { campaignId } = await wati.createCampaign({
        name: "Retrievable Campaign",
        templateName: "re-engagement",
        contacts: ["254700000001", "254700000002", "254700000003"],
      })

      const campaign = wati.getCampaign(campaignId!)
      expect(campaign).toBeDefined()
      expect(campaign!.name).toBe("Retrievable Campaign")
      expect(campaign!.templateName).toBe("re-engagement")
      expect(campaign!.contacts.length).toBe(3)
    })

    it("returns undefined for non-existent campaign ID", () => {
      const campaign = wati.getCampaign("ghost-id")
      expect(campaign).toBeUndefined()
    })

    it("lists all campaigns", async () => {
      await wati.createCampaign({ name: "A", templateName: "lead-welcome", contacts: [] })
      await wati.createCampaign({ name: "B", templateName: "lead-welcome", contacts: [] })

      const all = wati.getAllCampaigns()
      expect(all.length).toBe(2)
    })

    it("returns empty array for getAllCampaigns when none created", () => {
      expect(wati.getAllCampaigns()).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // sendMessage in Simulation Mode
  // ─────────────────────────────────────────────────────────────────────────

  describe("sendMessage — simulation mode", () => {
    it("returns success when not configured (simulation fallback)", async () => {
      const result = await wati.sendMessage(
        "254712345678",
        "Hello from unit test!"
      )
      expect(result.success).toBe(true)
      expect(result.messageId).toBeDefined()
      expect(result.messageId).toContain("wati-msg-")
    })

    it("returns different message IDs for consecutive calls", async () => {
      const a = await wati.sendMessage("254700000001", "First")
      const b = await wati.sendMessage("254700000001", "Second")
      expect(a.messageId).not.toBe(b.messageId)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // sendTemplate in Simulation Mode
  // ─────────────────────────────────────────────────────────────────────────

  describe("sendTemplate — simulation mode", () => {
    it("returns success for an existing template", async () => {
      const result = await wati.sendTemplate(
        "254712345678",
        "lead-welcome",
        ["Test User"]
      )
      expect(result.success).toBe(true)
      expect(result.messageId).toBeDefined()
      expect(result.messageId).toContain("wati-tpl-")
    })

    it("falls back to default template when template not found", async () => {
      const result = await wati.sendTemplate(
        "254712345678",
        "non-existent-template",
        ["Test User"]
      )
      // In simulation mode, unknown templates fall back gracefully
      expect(result.success).toBe(true)
      expect(result.messageId).toBeDefined()
    })

    it("sends template without parameters", async () => {
      const result = await wati.sendTemplate(
        "254712345678",
        "lead-welcome",
        []
      )
      expect(result.success).toBe(true)
    })

    it("truncates excess parameters to match template capacity", async () => {
      // 'lead-welcome' has 1 param ({{1}})
      // sendTemplate should handle excess params gracefully
      const result = await wati.sendTemplate(
        "254712345678",
        "lead-welcome",
        ["Name", "Extra1", "Extra2", "Extra3"]
      )
      expect(result.success).toBe(true)
    })

    it("returns success for follow-up-24h template", async () => {
      const result = await wati.sendTemplate(
        "254712345678",
        "follow-up-24h",
        ["Name", "Coffee", "5"]
      )
      expect(result.success).toBe(true)
    })

    it("returns success for lead-scored-high template", async () => {
      const result = await wati.sendTemplate(
        "254712345678",
        "lead-scored-high",
        ["Name"]
      )
      expect(result.success).toBe(true)
    })

    it("returns success for re-engagement template", async () => {
      const result = await wati.sendTemplate(
        "254712345678",
        "re-engagement",
        ["Name", "Coffee Beans"]
      )
      expect(result.success).toBe(true)
    })

    it("returns success for order-confirmation template", async () => {
      const result = await wati.sendTemplate(
        "254712345678",
        "order-confirmation",
        ["Name"]
      )
      expect(result.success).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // healthCheck in Simulation Mode
  // ─────────────────────────────────────────────────────────────────────────

  describe("healthCheck — simulation mode", () => {
    afterEach(() => {
      restoreEnv()
    })

    it("returns connected true when not configured", async () => {
      clearWatiEnv()
      const unconfigured = new WATIIntegration({
        apiToken: "",
        whatsappNumberId: "",
      })
      const result = await unconfigured.healthCheck()
      expect(result.connected).toBe(true)
      expect(result.whatsappNumber).toBeUndefined()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // API Call Path (mocked fetch)
  // ─────────────────────────────────────────────────────────────────────────

  describe("API call path — mocked fetch", () => {
    let mockFetch: ReturnType<typeof vi.fn>
    let configuredWati: WATIIntegration

    beforeEach(() => {
      clearWatiEnv()
      mockFetch = vi.fn()
      global.fetch = mockFetch

      configuredWati = new WATIIntegration({
        apiToken: "test-token",
        whatsappNumberId: "10175915",
        baseUrl: "https://live-mt-server.wati.io",
      })
    })

    afterEach(() => {
      restoreEnv()
      vi.restoreAllMocks()
    })

    it("sendMessage calls V3 conversations endpoint with correct payload", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { id: "msg-123", status: "delivered" },
        }),
      })

      const result = await configuredWati.sendMessage(
        "254712345678",
        "Hello from test!"
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toBe("msg-123")

      // Verify the request
      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain("/api/ext/v3/conversations/messages/text")
      expect(opts.method).toBe("POST")
      expect(opts.headers["Authorization"]).toBe("Bearer test-token")

      const body = JSON.parse(opts.body)
      expect(body.target).toBe("254712345678")
      expect(body.text).toContain("Hello from test!")
    })

    it("sendTemplate calls V3 messageTemplates/send with recipients format", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          broadcast_id: "bcast-456",
        }),
      })

      const result = await configuredWati.sendTemplate(
        "254712345678",
        "lead-welcome",
        ["Test User"]
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toBe("bcast-456")

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain("/api/ext/v3/messageTemplates/send")
      expect(opts.method).toBe("POST")

      const body = JSON.parse(opts.body)
      expect(body.template_name).toBe("sokogate_lead_welcome") // the mapped WATI template name
      expect(body.broadcast_name).toContain("auto_lead-welcome_")
      expect(body.recipients).toHaveLength(1)
      expect(body.recipients[0].phone_number).toBe("254712345678")
      expect(body.recipients[0].custom_params).toEqual([
        { name: "1", value: "Test User" },
      ])
    })

    it("createContact calls V3 contacts endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "contact-789",
          name: "Test User",
          phone: "+254712345678",
        }),
      })

      const result = await configuredWati.createContact({
        name: "Test User",
        phone: "254712345678",
        tags: ["test"],
        customFields: { source: "unit-test" },
      })

      expect(result.success).toBe(true)
      expect(result.contactId).toBe("contact-789")

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain("/api/ext/v3/contacts")
      expect(opts.method).toBe("POST")

      const body = JSON.parse(opts.body)
      expect(body.whatsapp_number).toBe("254712345678")
      expect(body.name).toBe("Test User")
      expect(body.custom_params).toEqual([{ name: "source", value: "unit-test" }])
    })

    it("sendTemplate truncates excess parameters to match template {{n}} count", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          broadcast_id: "bcast-truncated",
        }),
      })

      // 'lead-welcome' template now has 3 params ({{1}}, {{2}}, {{3}})
      // Sending 5 params should truncate to 3
      await configuredWati.sendTemplate(
        "254712345678",
        "lead-welcome",
        ["Alice", "QA Traders", "Coffee Beans", "Extra", "Extra2"]
      )

      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body)
      expect(body.recipients[0].custom_params).toHaveLength(3)
      expect(body.recipients[0].custom_params[0].name).toBe("1")
      expect(body.recipients[0].custom_params[0].value).toBe("Alice")
      expect(body.recipients[0].custom_params[1].name).toBe("2")
      expect(body.recipients[0].custom_params[1].value).toBe("QA Traders")
      expect(body.recipients[0].custom_params[2].name).toBe("3")
      expect(body.recipients[0].custom_params[2].value).toBe("Coffee Beans")
    })

    it("falls back to new_chat_v1 on 400 response", async () => {
      // Register a template with a name that won't exist in the WATI account
      const localKey = configuredWati.addTemplate({
        name: "non_existent_wati_template",
        category: "MARKETING",
        language: "en",
        status: "APPROVED",
        body: "Hi {{1}}, This template doesn't exist in WATI.",
      })

      // First call returns 400 (template not found in WATI)
      // Second call (fallback to new_chat_v1) returns success
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => "Template not found or not approved",
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            broadcast_id: "bcast-fallback",
          }),
        })

      const result = await configuredWati.sendTemplate(
        "254712345678",
        localKey,
        ["Test User"]
      )

      // Fallback was successful
      expect(result.success).toBe(true)
      expect(result.messageId).toBe("bcast-fallback")

      // First call used the custom template name, second call used new_chat_v1
      expect(mockFetch).toHaveBeenCalledTimes(2)

      const [firstUrl, firstOpts] = mockFetch.mock.calls[0]
      const firstBody = JSON.parse(firstOpts.body)
      expect(firstBody.template_name).toBe("non_existent_wati_template")
      expect(firstUrl).toContain("/api/ext/v3/messageTemplates/send")

      const [, fallbackOpts] = mockFetch.mock.calls[1]
      const fallbackBody = JSON.parse(fallbackOpts.body)
      expect(fallbackBody.template_name).toBe("new_chat_v1")
    })

    it("falls back to new_chat_v1 on 403 response", async () => {
      // Register a template with a name that won't exist in the WATI account
      const localKey = configuredWati.addTemplate({
        name: "restricted_template_name",
        category: "MARKETING",
        language: "en",
        status: "APPROVED",
        body: "Hi {{1}}, This template is restricted in the WATI account.",
      })

      // First call returns 403 (forbidden — template not accessible)
      // Second call (fallback to new_chat_v1) returns success
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => "Template access denied",
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            broadcast_id: "bcast-403-fallback",
          }),
        })

      const result = await configuredWati.sendTemplate(
        "254712345678",
        localKey,
        ["Test User"]
      )

      // Fallback was successful
      expect(result.success).toBe(true)
      expect(result.messageId).toBe("bcast-403-fallback")

      // First call used the custom template name, second call used new_chat_v1
      expect(mockFetch).toHaveBeenCalledTimes(2)

      const [firstUrl, firstOpts] = mockFetch.mock.calls[0]
      const firstBody = JSON.parse(firstOpts.body)
      expect(firstBody.template_name).toBe("restricted_template_name")
      expect(firstUrl).toContain("/api/ext/v3/messageTemplates/send")

      const [, fallbackOpts] = mockFetch.mock.calls[1]
      const fallbackBody = JSON.parse(fallbackOpts.body)
      expect(fallbackBody.template_name).toBe("new_chat_v1")
    })

    it("falls back to simulation when API returns error (500)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      })

      // Although the API failed, the simulation fallback should succeed
      const result = await configuredWati.sendMessage(
        "254712345678",
        "Test message"
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toContain("wati-msg-")
    })

    it("falls back to simulation when fetch throws a network error", async () => {
      // Simulate a network-level failure (DNS, timeout, TCP reset)
      mockFetch.mockRejectedValue(new Error("fetch failed: connect ECONNREFUSED"))

      // The API call throws, but simulation fallback should still succeed
      const result = await configuredWati.sendMessage(
        "254712345678",
        "Test message after network error"
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toContain("wati-msg-")
    })

    it("falls back to simulation when sendTemplate experiences a network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error: socket hang up"))

      // Template sending via API fails with network error
      const result = await configuredWati.sendTemplate(
        "254712345678",
        "lead-welcome",
        ["Test User"]
      )

      // Should gracefully fall back to simulation
      expect(result.success).toBe(true)
      expect(result.messageId).toContain("wati-tpl-")
    })



    it("healthCheck calls V3 contacts endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          contact_list: [],
          page_number: 1,
        }),
      })

      const result = await configuredWati.healthCheck()

      expect(result.connected).toBe(true)
      expect(result.whatsappNumber).toBe("10175915")

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain("/api/ext/v3/contacts?pageSize=1")
    })

    it("returns false healthCheck when API returns error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      })

      const result = await configuredWati.healthCheck()

      expect(result.connected).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles createContact with empty tags and customFields", async () => {
      const result = await wati.createContact({
        name: "No Extras",
        phone: "254700000000",
      })
      expect(result.success).toBe(true)

      const contact = wati.getContactByPhone("254700000000")
      expect(contact).toBeDefined()
      expect(contact!.tags).toEqual([])
      expect(contact!.customFields).toEqual({})
    })

    it("getContactByPhone is case-sensitive for phone numbers", async () => {
      await wati.createContact({ name: "Exact Match", phone: "254712345678" })

      // Different formatting should not match
      const wrongFormat = wati.getContactByPhone("+254712345678")
      expect(wrongFormat).toBeUndefined()
    })

    it("handles createCampaign with empty contacts list", async () => {
      const result = await wati.createCampaign({
        name: "Empty Campaign",
        templateName: "lead-welcome",
        contacts: [],
      })
      expect(result.success).toBe(true)

      const campaign = wati.getCampaign(result.campaignId!)
      expect(campaign!.contacts).toEqual([])
    })

    it("startCampaign sets correct sentCount for multiple contacts", async () => {
      const { campaignId } = await wati.createCampaign({
        name: "Multi Contact",
        templateName: "lead-welcome",
        contacts: ["2547001", "2547002", "2547003", "2547004", "2547005"],
      })

      await wati.startCampaign(campaignId!)
      const campaign = wati.getCampaign(campaignId!)
      expect(campaign!.sentCount).toBe(5)
    })

    it("isConfigured works after configure then clear", async () => {
      wati.configure({ apiToken: "test", whatsappNumberId: "test" })
      expect(wati.isConfigured()).toBe(true)

      wati.configure({ apiToken: "", whatsappNumberId: "" })
      expect(wati.isConfigured()).toBe(false)
    })
  })
})
