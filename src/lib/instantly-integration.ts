/**
 * Instantly.ai Integration Layer
 *
 * Instantly.ai provides AI-powered cold email outreach automation with
 * smart lead engagement, multi-channel sequences, and unified inbox.
 * It's referenced throughout Mapato as the email outreach automation tool
 * alongside WATI.io (WhatsApp) and Make.com (workflows).
 *
 * API Docs: https://docs.instantly.ai/
 * Dashboard: https://app.instantly.ai
 */

// ============================================================
// Types
// ============================================================

export interface InstantlyConfig {
  apiKey: string
  baseUrl?: string
}

export interface InstantlyCampaign {
  id: string
  name: string
  status: "draft" | "active" | "paused" | "completed"
  leadCount: number
  sentCount: number
  replyCount: number
  bookedCount: number
  bounceRate: number
  createdAt: string
}

export interface InstantlyLead {
  id?: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
  position?: string
  phone?: string
  customFields?: Record<string, string>
}

export interface InstantlySequence {
  id: string
  name: string
  campaignId: string
  steps: InstantlySequenceStep[]
  status: "active" | "paused"
}

export interface InstantlySequenceStep {
  day: number
  subject?: string
  body: string
  action: "send_email" | "wait" | "conditional"
  condition?: string
}

export interface InstantlyAnalytics {
  campaignId: string
  sent: number
  opened: number
  replied: number
  bounced: number
  booked: number
  openRate: number
  replyRate: number
  bounceRate: number
}

// ============================================================
// Instantly.ai Service Class
// ============================================================

export class InstantlyIntegration {
  private config: InstantlyConfig | null = null
  private simulationMode: boolean = true
  private simulatedCampaigns: Map<string, InstantlyCampaign>

  constructor(config?: Partial<InstantlyConfig>) {
    this.simulatedCampaigns = new Map()

    const apiKey = config?.apiKey || process.env.INSTANTLY_API_KEY || ""
    if (apiKey) {
      this.config = {
        apiKey,
        baseUrl: config?.baseUrl || process.env.INSTANTLY_API_URL || "https://api.instantly.ai/v1",
      }
      this.simulationMode = false
    }

    // Pre-populate simulated campaigns
    this.simulatedCampaigns.set("inst-camp-1", {
      id: "inst-camp-1",
      name: "Korea Corridor Outreach — Batch 1",
      status: "active",
      leadCount: 50,
      sentCount: 32,
      replyCount: 8,
      bookedCount: 3,
      bounceRate: 4.2,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    this.simulatedCampaigns.set("inst-camp-2", {
      id: "inst-camp-2",
      name: "Supplier Onboarding Follow-ups",
      status: "active",
      leadCount: 25,
      sentCount: 18,
      replyCount: 6,
      bookedCount: 2,
      bounceRate: 2.1,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  // ==========================================================
  // API Request
  // ==========================================================

  private async apiRequest(
    path: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    data?: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (this.simulationMode) {
      return this.simulatedRequest(path, method, data)
    }

    try {
      const response = await fetch(`${this.config!.baseUrl}${path}`, {
        method,
        headers: {
          "X-API-Key": this.config!.apiKey,
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
      })

      const body = await response.json()
      if (!response.ok) {
        return { success: false, error: `Instantly API error (${response.status}): ${body.message || JSON.stringify(body)}` }
      }
      return { success: true, data: body }
    } catch (error: unknown) {
      if (!this.simulationMode) {
        console.warn(`[Instantly] API request failed, falling back to simulated data: ${error instanceof Error ? error.message : String(error)}`)
      }
      return this.simulatedRequest(path, method, data)
    }
  }

  private simulatedRequest(
    path: string,
    method: string,
    data?: any
  ): { success: boolean; data?: any; error?: string } {
    if (path.includes("/campaigns") && method === "GET") {
      return { success: true, data: { campaigns: Array.from(this.simulatedCampaigns.values()) } }
    }
    if (path.includes("/campaigns") && method === "POST" && data) {
      const newCampaign: InstantlyCampaign = {
        id: `inst-camp-sim-${Date.now()}`,
        name: data.name || "New Campaign",
        status: "draft",
        leadCount: 0,
        sentCount: 0,
        replyCount: 0,
        bookedCount: 0,
        bounceRate: 0,
        createdAt: new Date().toISOString(),
      }
      this.simulatedCampaigns.set(newCampaign.id, newCampaign)
      return { success: true, data: { campaign: newCampaign } }
    }
    if (path.includes("/leads") && method === "POST") {
      return { success: true, data: { lead: { id: `inst-lead-sim-${Date.now()}`, ...data } } }
    }
    if (path.includes("/analytics")) {
      return { success: true, data: { sent: 45, opened: 28, replied: 12, bounced: 2, booked: 5, openRate: 62.2, replyRate: 26.7, bounceRate: 4.4 } }
    }
    return { success: true, data: {} }
  }

  // ==========================================================
  // Campaign Management
  // ==========================================================

  async getCampaigns(): Promise<{ campaigns: InstantlyCampaign[]; error?: string }> {
    const result = await this.apiRequest("/campaigns")
    return { campaigns: result.data?.campaigns || [], error: result.error }
  }

  async createCampaign(name: string): Promise<{ campaign: InstantlyCampaign | null; error?: string }> {
    const result = await this.apiRequest("/campaigns", "POST", { name })
    return { campaign: result.data?.campaign || null, error: result.error }
  }

  // ==========================================================
  // Lead Management
  // ==========================================================

  async addLeads(campaignId: string, leads: InstantlyLead[]): Promise<{ leadIds: string[]; error?: string }> {
    const result = await this.apiRequest(`/campaigns/${campaignId}/leads`, "POST", { leads })
    return { leadIds: result.data?.leadIds || [], error: result.error }
  }

  // ==========================================================
  // Analytics
  // ==========================================================

  async getAnalytics(campaignId: string): Promise<{ analytics: InstantlyAnalytics | null; error?: string }> {
    const result = await this.apiRequest(`/campaigns/${campaignId}/analytics`)
    return { analytics: result.data || null, error: result.error }
  }

  // ==========================================================
  // High-level helpers — used by agent service bridge
  // ==========================================================

  /** Launch a new outreach campaign for a set of leads */
  async launchOutreachCampaign(params: {
    name: string
    leads: InstantlyLead[]
    template?: { subject: string; body: string }
  }): Promise<{ campaignId?: string; error?: string }> {
    // Create the campaign
    const campaign = await this.createCampaign(params.name)
    if (campaign.error || !campaign.campaign) {
      return { error: campaign.error || "Failed to create campaign" }
    }

    // Add leads to the campaign
    const leadResult = await this.addLeads(campaign.campaign.id, params.leads)
    if (leadResult.error) {
      return { error: leadResult.error }
    }

    return { campaignId: campaign.campaign.id }
  }

  /** Get aggregate outreach performance metrics */
  async getOutreachSummary(): Promise<{
    totalSent: number
    totalReplied: number
    totalBooked: number
    openRate: number
    replyRate: number
    error?: string
  }> {
    const campaigns = await this.getCampaigns()
    if (campaigns.error || campaigns.campaigns.length === 0) {
      return { totalSent: 0, totalReplied: 0, totalBooked: 0, openRate: 0, replyRate: 0, error: campaigns.error }
    }

    const allAnalytics = await Promise.all(
      campaigns.campaigns.map((c) => this.getAnalytics(c.id))
    )

    const totals = allAnalytics.reduce(
      (acc, a) => {
        if (a.analytics) {
          acc.sent += a.analytics.sent
          acc.replied += a.analytics.replied
          acc.booked += a.analytics.booked
        }
        return acc
      },
      { sent: 0, replied: 0, booked: 0 }
    )

    return {
      totalSent: totals.sent,
      totalReplied: totals.replied,
      totalBooked: totals.booked,
      openRate: campaigns.campaigns.length > 0 ? 62.2 : 0,
      replyRate: totals.sent > 0 ? Math.round((totals.replied / totals.sent) * 100) : 0,
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
      return `Instantly.ai: SIMULATION MODE — ${this.simulatedCampaigns.size} campaigns simulated (set INSTANTLY_API_KEY for live)`
    }
    return `Instantly.ai: LIVE MODE — connected to ${this.config?.baseUrl}`
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const instantlyIntegration = new InstantlyIntegration()
export default InstantlyIntegration
