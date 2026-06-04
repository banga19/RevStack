/**
 * Make.com Integration Layer
 *
 * Make.com provides custom automation scenarios connecting CRM, email,
 * WhatsApp, and analytics together. This integration triggers registered
 * webhook scenarios and manages webhook registration persistence.
 *
 * API Docs: https://www.make.com/en/api-documentation
 * Webhook setup: Create a webhook module in your scenario, copy the URL.
 */

const MAKE_BASE_URL = "https://hook.eu1.make.com"

// ============================================================
// Types
// ============================================================

export interface MakeWebhookConfig {
  /** Webhook URL suffix (the unique ID part) */
  webhookId: string
  /** Optional scenario name for display */
  scenarioName?: string
  /** If true, uses eu2.make.com instead of eu1 */
  eu2?: boolean
}

export interface MakeWebhookPayload {
  /** Who triggered it */
  source: string
  /** Action type */
  event: string
  /** ISO timestamp */
  timestamp: string
  /** The data to send */
  data: Record<string, any>
}

export interface MakeWebhookResult {
  success: boolean
  statusCode: number
  responseBody?: string
  error?: string
}

export interface MakeScenario {
  id: string
  name: string
  status: "active" | "inactive" | "error"
  lastRunAt?: string
  lastRunStatus?: "success" | "error"
  webhookId?: string
}

// ============================================================
// Registered Webhook Map
// ============================================================

interface RegisteredWebhook {
  id: string
  name: string
  webhookId: string
  scenarioName: string
  scenarioId: string
  active: boolean
  registeredAt: number
}

// ============================================================
// Make.com Service Class
// ============================================================

export class MakeIntegration {
  private webhooks: Map<string, RegisteredWebhook>
  private scenarios: Map<string, MakeScenario>

  constructor() {
    this.webhooks = new Map()
    this.scenarios = new Map()

    // Pre-register common Make.com scenarios (webhook IDs from setup docs)
    this.initDefaultScenarios()
  }

  private initDefaultScenarios() {
    const defaultScenarios: MakeScenario[] = [
      {
        id: "lead-capture",
        name: "Lead Capture → WATI → CRM",
        status: "active",
        webhookId: process.env.MAKE_LEAD_CAPTURE_WEBHOOK || "",
      },
      {
        id: "followup-sequence",
        name: "Follow-up Sequence → Email + WhatsApp",
        status: "active",
        webhookId: process.env.MAKE_FOLLOWUP_WEBHOOK || "",
      },
      {
        id: "booking-confirmation",
        name: "Booking Confirmation → Calendar + Notify",
        status: "active",
        webhookId: process.env.MAKE_BOOKING_WEBHOOK || "",
      },
      {
        id: "no-show-recovery",
        name: "No-Show Recovery → Rebook Sequence",
        status: "active",
        webhookId: process.env.MAKE_NOSHOW_WEBHOOK || "",
      },
      {
        id: "reporting-daily",
        name: "Daily Reporting → Sheets + Dashboard",
        status: "active",
        webhookId: process.env.MAKE_REPORTING_WEBHOOK || "",
      },
      {
        id: "compliance-renewal",
        name: "Compliance Renewal → WATI + Email Alert",
        status: "active",
        webhookId: process.env.MAKE_COMPLIANCE_WEBHOOK || "",
      },
    ]

    for (const scenario of defaultScenarios) {
      this.scenarios.set(scenario.id, scenario)
      if (scenario.webhookId) {
        this.webhooks.set(scenario.id, {
          id: `make-${scenario.id}`,
          name: scenario.name,
          webhookId: scenario.webhookId,
          scenarioName: scenario.name,
          scenarioId: scenario.id,
          active: true,
          registeredAt: Date.now(),
        })
      }
    }
  }

  // ==========================================================
  // Trigger a Make.com webhook scenario
  // ==========================================================

  async triggerWebhook(
    scenarioId: string,
    payload: Record<string, any>
  ): Promise<MakeWebhookResult> {
    const webhook = this.webhooks.get(scenarioId)
    if (!webhook || !webhook.webhookId) {
      // No webhook registered — check if we have a URL template
      const baseUrlVar = process.env[`MAKE_${scenarioId.toUpperCase().replace(/-/g, "_")}_WEBHOOK`]
      if (!baseUrlVar) {
        return {
          success: false,
          statusCode: 0,
          error: `No webhook configured for scenario: ${scenarioId}. Set MAKE_${scenarioId.toUpperCase().replace(/-/g, "_")}_WEBHOOK in .env`,
        }
      }
      // Register dynamically
      this.registerWebhook(scenarioId, baseUrlVar, `Make.com ${scenarioId}`)
    }

    const activeWebhook = this.webhooks.get(scenarioId)!
    const url = `${MAKE_BASE_URL}/${activeWebhook.webhookId}`

    const fullPayload: MakeWebhookPayload = {
      source: "mapato-god-mode",
      event: scenarioId,
      timestamp: new Date().toISOString(),
      data: payload,
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullPayload),
        signal: AbortSignal.timeout(10000),
      })

      const body = await response.text()

      // Update scenario status
      const scenario = this.scenarios.get(scenarioId)
      if (scenario) {
        scenario.lastRunAt = new Date().toISOString()
        scenario.lastRunStatus = response.ok ? "success" : "error"
      }

      return {
        success: response.ok,
        statusCode: response.status,
        responseBody: body,
      }
    } catch (error: any) {
      return {
        success: false,
        statusCode: 0,
        error: `Make.com webhook error: ${error.message}`,
      }
    }
  }

  // ==========================================================
  // Register a webhook by scenario ID
  // ==========================================================

  registerWebhook(
    scenarioId: string,
    webhookId: string,
    scenarioName: string
  ): RegisteredWebhook {
    const webhook: RegisteredWebhook = {
      id: `make-${scenarioId}-${Date.now()}`,
      name: scenarioName,
      webhookId,
      scenarioName,
      scenarioId,
      active: true,
      registeredAt: Date.now(),
    }
    this.webhooks.set(scenarioId, webhook)
    return webhook
  }

  // ==========================================================
  // Trigger common operational scenarios
  // ==========================================================

  /** Trigger the lead capture scenario when a new lead comes in */
  async triggerLeadCapture(lead: {
    name: string
    email: string
    phone?: string
    company?: string
    source?: string
  }): Promise<MakeWebhookResult> {
    return this.triggerWebhook("lead-capture", {
      lead_name: lead.name,
      lead_email: lead.email,
      lead_phone: lead.phone || "",
      lead_company: lead.company || "",
      lead_source: lead.source || "web",
    })
  }

  /** Trigger follow-up sequence for a lead/client */
  async triggerFollowUpSequence(client: {
    name: string
    email: string
    phone?: string
    stage: string
    daysSinceLastContact: number
  }): Promise<MakeWebhookResult> {
    return this.triggerWebhook("followup-sequence", {
      client_name: client.name,
      client_email: client.email,
      client_phone: client.phone || "",
      followup_stage: client.stage,
      days_since_last: client.daysSinceLastContact,
    })
  }

  /** Trigger the daily reporting scenario */
  async triggerDailyReport(metrics: Record<string, number>): Promise<MakeWebhookResult> {
    return this.triggerWebhook("reporting-daily", {
      report_date: new Date().toISOString().split("T")[0],
      ...metrics,
    })
  }

  /** Trigger compliance renewal alert */
  async triggerComplianceAlert(details: {
    clientName: string
    certType: string
    expiresAt: string
    daysUntilExpiry: number
  }): Promise<MakeWebhookResult> {
    return this.triggerWebhook("compliance-renewal", {
      client_name: details.clientName,
      certification_type: details.certType,
      expires_at: details.expiresAt,
      days_until_expiry: details.daysUntilExpiry,
    })
  }

  // ==========================================================
  // Status & query helpers
  // ==========================================================

  getRegisteredWebhooks(): RegisteredWebhook[] {
    return Array.from(this.webhooks.values())
  }

  getScenarios(): MakeScenario[] {
    return Array.from(this.scenarios.values())
  }

  getScenario(id: string): MakeScenario | undefined {
    return this.scenarios.get(id)
  }

  summary(): string {
    const active = Array.from(this.scenarios.values()).filter((s) => s.status === "active")
    return `Make.com: ${active.length}/${this.scenarios.size} scenarios active, ${this.webhooks.size} webhooks configured`
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const makeIntegration = new MakeIntegration()
export default MakeIntegration
