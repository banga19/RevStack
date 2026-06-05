import { describe, it, expect } from "vitest"
import { usersTable, insertUserSchema } from "../users"
import { leadsTable, insertLeadSchema } from "../leads"
import { clientsTable, insertClientSchema } from "../clients"
import { retainersTable, insertRetainerSchema } from "../retainers"
import { followupsTable, insertFollowupSchema } from "../followups"
import { messagesTable, insertMessageSchema } from "../messages"
import { activityTable, insertActivitySchema } from "../activity"
import { hermesRunsTable, insertHermesRunSchema } from "../hermes"

// ── Users Schema ──────────────────────────────────────────────
describe("users schema", () => {
  it("exports usersTable with correct columns", () => {
    expect(usersTable).toHaveProperty("id")
    expect(usersTable).toHaveProperty("clerkId")
    expect(usersTable).toHaveProperty("email")
    expect(usersTable).toHaveProperty("name")
    expect(usersTable).toHaveProperty("role")
    expect(usersTable).toHaveProperty("termsAccepted")
    expect(usersTable).toHaveProperty("createdAt")
    expect(usersTable).toHaveProperty("updatedAt")
  })

  it("exports insertUserSchema and validates correctly", () => {
    const valid = insertUserSchema.safeParse({
      clerkId: "clerk_123",
      email: "test@example.com",
      name: "Test User",
      role: "member",
      termsAccepted: true,
    })
    expect(valid.success).toBe(true)

    const invalid = insertUserSchema.safeParse({ email: "not-an-email" })
    expect(invalid.success).toBe(false)
  })

  it("exports insertUserSchema as an object", () => {
    expect(typeof insertUserSchema).toBe("object")
  })
})

// ── Leads Schema ──────────────────────────────────────────────
describe("leads schema", () => {
  it("exports leadsTable with expected columns", () => {
    expect(leadsTable).toHaveProperty("id")
    expect(leadsTable).toHaveProperty("companyName")
    expect(leadsTable).toHaveProperty("contactName")
    expect(leadsTable).toHaveProperty("email")
    expect(leadsTable).toHaveProperty("phone")
    expect(leadsTable).toHaveProperty("industry")
    expect(leadsTable).toHaveProperty("country")
    expect(leadsTable).toHaveProperty("status")
    expect(leadsTable).toHaveProperty("qualificationScore")
    expect(leadsTable).toHaveProperty("createdAt")
    expect(leadsTable).toHaveProperty("updatedAt")
  })

  it("insertLeadSchema validates a valid lead", () => {
    const result = insertLeadSchema.safeParse({
      companyName: "Acme Corp",
      contactName: "John Doe",
      email: "john@acme.com",
      status: "new",
    })
    expect(result.success).toBe(true)
  })

  it("insertLeadSchema rejects missing required fields", () => {
    const result = insertLeadSchema.safeParse({ email: "test@test.com" })
    expect(result.success).toBe(false)
  })
})

// ── Clients Schema ────────────────────────────────────────────
describe("clients schema", () => {
  it("exports clientsTable with expected columns", () => {
    expect(clientsTable).toHaveProperty("id")
    expect(clientsTable).toHaveProperty("companyName")
    expect(clientsTable).toHaveProperty("contactName")
    expect(clientsTable).toHaveProperty("email")
    expect(clientsTable).toHaveProperty("status")
    expect(clientsTable).toHaveProperty("onboardingStep")
    expect(clientsTable).toHaveProperty("createdAt")
    expect(clientsTable).toHaveProperty("updatedAt")
  })

  it("insertClientSchema validates a valid client", () => {
    const result = insertClientSchema.safeParse({
      companyName: "Global Trade Inc",
      contactName: "Jane Smith",
      email: "jane@globaltrade.com",
      status: "onboarding",
      onboardingStep: 1,
    })
    expect(result.success).toBe(true)
  })
})

// ── Retainers Schema (new) ────────────────────────────────────
describe("retainers schema", () => {
  it("exports retainersTable with expected columns", () => {
    expect(retainersTable).toHaveProperty("id")
    expect(retainersTable).toHaveProperty("clientId")
    expect(retainersTable).toHaveProperty("name")
    expect(retainersTable).toHaveProperty("amountUsd")
    expect(retainersTable).toHaveProperty("billingCycle")
    expect(retainersTable).toHaveProperty("status")
    expect(retainersTable).toHaveProperty("startDate")
    expect(retainersTable).toHaveProperty("userId")
    expect(retainersTable).toHaveProperty("createdAt")
    expect(retainersTable).toHaveProperty("updatedAt")
  })

  it("insertRetainerSchema validates valid retainer data", () => {
    const result = insertRetainerSchema.safeParse({
      clientId: 1,
      name: "Monthly Support",
      amountUsd: 500,
      billingCycle: "monthly",
      startDate: "2026-01-01",
      userId: 1,
    })
    expect(result.success).toBe(true)
  })

  it("insertRetainerSchema rejects missing required fields", () => {
    const result = insertRetainerSchema.safeParse({ name: "Test" })
    expect(result.success).toBe(false)
  })
})

// ── Followups Schema (new) ────────────────────────────────────
describe("followups schema", () => {
  it("exports followupsTable with expected columns", () => {
    expect(followupsTable).toHaveProperty("id")
    expect(followupsTable).toHaveProperty("leadId")
    expect(followupsTable).toHaveProperty("channel")
    expect(followupsTable).toHaveProperty("messageBody")
    expect(followupsTable).toHaveProperty("status")
    expect(followupsTable).toHaveProperty("scheduledAt")
    expect(followupsTable).toHaveProperty("createdAt")
  })

  it("insertFollowupSchema validates valid followup data", () => {
    const result = insertFollowupSchema.safeParse({
      messageBody: "Follow up message",
      channel: "whatsapp",
      status: "pending",
    })
    expect(result.success).toBe(true)
  })

  it("insertFollowupSchema rejects invalid data", () => {
    const result = insertFollowupSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ── Messages Schema (new) ────────────────────────────────────
describe("messages schema", () => {
  it("exports messagesTable with expected columns", () => {
    expect(messagesTable).toHaveProperty("id")
    expect(messagesTable).toHaveProperty("channel")
    expect(messagesTable).toHaveProperty("to")
    expect(messagesTable).toHaveProperty("body")
    expect(messagesTable).toHaveProperty("status")
    expect(messagesTable).toHaveProperty("createdAt")
  })

  it("insertMessageSchema validates valid message data", () => {
    const result = insertMessageSchema.safeParse({
      channel: "whatsapp",
      to: "+254700000000",
      body: "Hello, this is a test message",
    })
    expect(result.success).toBe(true)
  })

  it("insertMessageSchema rejects missing required fields", () => {
    const result = insertMessageSchema.safeParse({ channel: "email" })
    expect(result.success).toBe(false)
  })
})

// ── Activity Schema (new) ────────────────────────────────────
describe("activity schema", () => {
  it("exports activityTable with expected columns", () => {
    expect(activityTable).toHaveProperty("id")
    expect(activityTable).toHaveProperty("type")
    expect(activityTable).toHaveProperty("description")
    expect(activityTable).toHaveProperty("entityType")
    expect(activityTable).toHaveProperty("entityId")
    expect(activityTable).toHaveProperty("userId")
    expect(activityTable).toHaveProperty("createdAt")
  })

  it("insertActivitySchema validates valid activity data", () => {
    const result = insertActivitySchema.safeParse({
      type: "lead_created",
      description: "New lead created",
    })
    expect(result.success).toBe(true)
  })
})

// ── Hermes Runs Schema (new) ─────────────────────────────────
describe("hermes runs schema", () => {
  it("exports hermesRunsTable with expected columns", () => {
    expect(hermesRunsTable).toHaveProperty("id")
    expect(hermesRunsTable).toHaveProperty("taskType")
    expect(hermesRunsTable).toHaveProperty("status")
    expect(hermesRunsTable).toHaveProperty("input")
    expect(hermesRunsTable).toHaveProperty("output")
    expect(hermesRunsTable).toHaveProperty("createdAt")
    expect(hermesRunsTable).toHaveProperty("completedAt")
  })

  it("insertHermesRunSchema validates valid run data", () => {
    const result = insertHermesRunSchema.safeParse({
      taskType: "qualify_leads",
      status: "pending",
    })
    expect(result.success).toBe(true)
  })
})

// ── Schema Index Export ───────────────────────────────────────
describe("schema index", () => {
  it("re-exports all table definitions", async () => {
    const mod = await import("../index")
    expect(mod.usersTable).toBeDefined()
    expect(mod.leadsTable).toBeDefined()
    expect(mod.clientsTable).toBeDefined()
    expect(mod.retainersTable).toBeDefined()
    expect(mod.followupsTable).toBeDefined()
    expect(mod.messagesTable).toBeDefined()
    expect(mod.activityTable).toBeDefined()
    expect(mod.hermesRunsTable).toBeDefined()
  })
})
