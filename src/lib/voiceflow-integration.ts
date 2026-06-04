/**
 * Voiceflow Integration Layer
 *
 * Voiceflow provides conversational AI chatbot capabilities for lead qualification,
 * order intake, and customer support. This integration triggers dialogs,
 * sends events, and retrieves conversation data.
 *
 * API Docs: https://www.voiceflow.com/api
 * Dashboard: https://creator.voiceflow.com
 */

// ============================================================
// Types
// ============================================================

export interface VoiceflowConfig {
  apiKey: string
  projectId: string
  versionId?: string
  /** Base URL for the Voiceflow API (default: general runtime) */
  baseUrl?: string
}

export interface VoiceflowUser {
  id: string
  name?: string
  email?: string
  phone?: string
  metadata?: Record<string, any>
}

export interface VoiceflowTrace {
  type: string
  payload: Record<string, any>
}

export interface VoiceflowDialogResponse {
  success: boolean
  traces: VoiceflowTrace[]
  state: Record<string, any>
  ended: boolean
  variables: Record<string, any>
  error?: string
}

export interface VoiceflowKnowledgeBaseResult {
  success: boolean
  answer?: string
  sources?: Array<{ title: string; snippet: string }>
  error?: string
}

// ============================================================
// Pre-defined dialog flows (mapped from VOICEFLOW-CHATBOT-NODE-MAP.md)
// ============================================================

export type VoiceflowFlow =
  | "lead-qualification"
  | "order-intake"
  | "compliance-check"
  | "support-ticket"
  | "onboarding-welcome"

const FLOW_MAPPING: Record<VoiceflowFlow, { intent: string; variables: string[] }> = {
  "lead-qualification": {
    intent: "lead_qualification_start",
    variables: ["lead_name", "lead_company", "lead_email", "lead_phone", "lead_product_interest"],
  },
  "order-intake": {
    intent: "order_intake_start",
    variables: ["order_products", "order_quantity", "order_budget", "order_timeline"],
  },
  "compliance-check": {
    intent: "compliance_check_start",
    variables: ["client_name", "cert_type", "cert_status"],
  },
  "support-ticket": {
    intent: "support_ticket_create",
    variables: ["ticket_subject", "ticket_description", "ticket_priority"],
  },
  "onboarding-welcome": {
    intent: "onboarding_welcome_start",
    variables: ["user_name", "user_email", "user_company"],
  },
}

// ============================================================
// Voiceflow Service Class
// ============================================================

export class VoiceflowIntegration {
  private config: VoiceflowConfig | null = null
  private simulationMode: boolean = true

  constructor(config?: Partial<VoiceflowConfig>) {
    const apiKey = config?.apiKey || process.env.VOICEFLOW_API_KEY || ""
    const projectId = config?.projectId || process.env.VOICEFLOW_PROJECT_ID || ""

    if (apiKey && projectId) {
      this.config = {
        apiKey,
        projectId,
        versionId: config?.versionId || process.env.VOICEFLOW_VERSION_ID || "production",
        baseUrl: config?.baseUrl || "https://general-runtime.voiceflow.com",
      }
      this.simulationMode = false
    }
  }

  // ==========================================================
  // Start a new dialog session
  // ==========================================================

  async startDialog(
    flow: VoiceflowFlow,
    user: VoiceflowUser,
    variables: Record<string, any> = {}
  ): Promise<VoiceflowDialogResponse> {
    if (this.simulationMode) {
      return this.simulatedDialog(flow, user)
    }

    const flowMapping = FLOW_MAPPING[flow]
    if (!flowMapping) {
      return { success: false, traces: [], state: {}, ended: false, variables: {}, error: `Unknown flow: ${flow}` }
    }

    try {
      const response = await fetch(
        `${this.config!.baseUrl}/state/${this.config!.projectId}/user/${user.id}/interact`,
        {
          method: "POST",
          headers: {
            Authorization: this.config!.apiKey,
            "Content-Type": "application/json",
            VersionID: this.config!.versionId || "production",
          },
          body: JSON.stringify({
            action: { type: "intent", intentName: flowMapping.intent },
            config: { tts: false, stripSSML: true },
            state: { variables: { ...variables, ...this.mapUserToVariables(user, flow) } },
          }),
        }
      )

      const data = await response.json()
      if (!response.ok) {
        return {
          success: false,
          traces: [],
          state: {},
          ended: false,
          variables: {},
          error: `Voiceflow API error (${response.status}): ${data.message || JSON.stringify(data)}`,
        }
      }

      return {
        success: true,
        traces: data.traces || [],
        state: data.state || {},
        ended: data.state?.ended || false,
        variables: data.state?.variables || {},
      }
    } catch (error: any) {
      return {
        success: false,
        traces: [],
        state: {},
        ended: false,
        variables: {},
        error: `Voiceflow request failed: ${error.message}`,
      }
    }
  }

  // ==========================================================
  // Continue an existing dialog with user input
  // ==========================================================

  async continueDialog(
    userId: string,
    input: string,
    variables: Record<string, any> = {}
  ): Promise<VoiceflowDialogResponse> {
    if (this.simulationMode) {
      return {
        success: true,
        traces: [{ type: "text", payload: { message: `Simulated reply: Processing "${input}"...` } }],
        state: {},
        ended: false,
        variables: { user_input: input, ...variables },
      }
    }

    try {
      const response = await fetch(
        `${this.config!.baseUrl}/state/${this.config!.projectId}/user/${userId}/interact`,
        {
          method: "POST",
          headers: {
            Authorization: this.config!.apiKey,
            "Content-Type": "application/json",
            VersionID: this.config!.versionId || "production",
          },
          body: JSON.stringify({
            action: { type: "text", payload: input },
            config: { tts: false, stripSSML: true },
            state: { variables },
          }),
        }
      )

      const data = await response.json()
      return {
        success: response.ok,
        traces: data.traces || [],
        state: data.state || {},
        ended: data.state?.ended || false,
        variables: data.state?.variables || {},
        error: response.ok ? undefined : data.message,
      }
    } catch (error: any) {
      return { success: false, traces: [], state: {}, ended: false, variables: {}, error: error.message }
    }
  }

  // ==========================================================
  // Knowledge Base Query
  // ==========================================================

  async queryKnowledgeBase(question: string): Promise<VoiceflowKnowledgeBaseResult> {
    if (this.simulationMode) {
      return {
        success: true,
        answer: `Simulated KB answer for: "${question}". This is a simulation — configure VOICEFLOW_API_KEY and VOICEFLOW_PROJECT_ID for live answers.`,
      }
    }

    try {
      const response = await fetch(
        `${this.config!.baseUrl}/knowledge-base/${this.config!.projectId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: this.config!.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question }),
        }
      )

      const data = await response.json()
      return {
        success: response.ok,
        answer: data.answer,
        sources: data.sources,
        error: response.ok ? undefined : data.message,
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // ==========================================================
  // Helpers
  // ==========================================================

  private mapUserToVariables(user: VoiceflowUser, flow: VoiceflowFlow): Record<string, any> {
    const mapped: Record<string, any> = {
      user_id: user.id,
      user_name: user.name || "Unknown",
      user_email: user.email || "",
      user_phone: user.phone || "",
    }

    // Add flow-specific variables
    const flowMapping = FLOW_MAPPING[flow]
    if (flowMapping) {
      for (const varName of flowMapping.variables) {
        if (!mapped[varName]) {
          mapped[varName] = ""
        }
      }
    }

    return mapped
  }

  // ==========================================================
  // Simulated dialog response (for demo / when env vars not set)
  // ==========================================================

  private simulatedDialog(flow: VoiceflowFlow, user: VoiceflowUser): VoiceflowDialogResponse {
    const flowName = flow.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

    const messages: Record<string, string> = {
      "lead-qualification": `👋 Hi ${user.name || "there"}! Welcome to our lead qualification flow. I'd love to learn about your business. What products or services are you interested in?`,
      "order-intake": `📋 Order intake started. Hi ${user.name || "there"}! What products would you like to order today?`,
      "compliance-check": `🔍 Compliance check initiated for ${user.name || "your company"}. Let me verify your certification status.`,
      "support-ticket": `🎫 Support ticket created for ${user.name || "you"}. A team member will respond within 24 hours.`,
      "onboarding-welcome": `🎉 Welcome to Mapato, ${user.name || "new user"}! Let's get you set up. First, what's your company name?`,
    }

    return {
      success: true,
      traces: [
        { type: "text", payload: { message: messages[flow] || `Simulated ${flowName} flow started.` } },
        { type: "debug", payload: { message: `[SIMULATION] Configure VOICEFLOW_API_KEY and VOICEFLOW_PROJECT_ID for real Voiceflow dialogs` } },
      ],
      state: { flow, startedAt: Date.now() },
      ended: false,
      variables: this.mapUserToVariables(user, flow),
    }
  }

  // ==========================================================
  // High-level helper — qualify a lead via Voiceflow
  // ==========================================================

  async qualifyLead(lead: {
    name: string
    email: string
    phone?: string
    company?: string
    productInterest?: string
  }): Promise<{ score?: number; qualified: boolean; summary: string; error?: string }> {
    const result = await this.startDialog(
      "lead-qualification",
      {
        id: `lead-${Date.now()}`,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
      },
      {
        lead_name: lead.name,
        lead_company: lead.company || "",
        lead_email: lead.email,
        lead_phone: lead.phone || "",
        lead_product_interest: lead.productInterest || "",
      }
    )

    if (!result.success) {
      return { qualified: false, summary: `Voiceflow lead qualification failed: ${result.error}` }
    }

    // Extract qualification score from dialog variables
    const score = result.variables?.qualification_score
      ? parseInt(result.variables.qualification_score)
      : undefined

    return {
      score,
      qualified: score ? score >= 60 : true,
      summary: `Lead ${lead.name} qualified via Voiceflow${score ? ` (score: ${score}/100)` : ""}`,
    }
  }

  // ==========================================================
  // Status
  // ==========================================================

  isConfigured(): boolean {
    return !this.simulationMode && this.config !== null
  }

  summary(): string {
    if (this.simulationMode) {
      return `Voiceflow: SIMULATION MODE — set VOICEFLOW_API_KEY and VOICEFLOW_PROJECT_ID for live chatbot`
    }
    return `Voiceflow: LIVE MODE — project ${this.config?.projectId}`
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const voiceflowIntegration = new VoiceflowIntegration()
export default VoiceflowIntegration
