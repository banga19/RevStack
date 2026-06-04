/**
 * Zoho CRM Integration Layer
 *
 * Zoho CRM provides lead, contact, and deal management for the sales pipeline.
 * This integration allows autonomous agents to sync leads, create contacts,
 * update deal stages, and retrieve pipeline data.
 *
 * API Docs: https://www.zoho.com/crm/developer/docs/api/v7/
 * Auth: OAuth 2.0 — requires ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
 */

// ============================================================
// Types
// ============================================================

export interface ZohoContact {
  id?: string
  First_Name?: string
  Last_Name: string
  Email: string
  Phone?: string
  Company?: string
  Lead_Source?: string
  Description?: string
  /** Custom Mapato-specific fields */
  Mapato_Status?: string
  Mapato_ERS_Score?: number
  Mapato_Tier?: string
}

export interface ZohoDeal {
  id?: string
  Deal_Name: string
  Stage: string
  Amount?: number
  Contact_Id?: string
  Account_Name?: string
  Closing_Date?: string
  Probability?: number
  Description?: string
  /** Custom Mapato fields */
  Mapato_Corridor?: string
  Mapato_Agent_Score?: number
}

export interface ZohoLead {
  id?: string
  First_Name?: string
  Last_Name: string
  Company: string
  Email: string
  Phone?: string
  Lead_Source?: string
  Lead_Status?: string
  Description?: string
}

export interface ZohoApiResponse {
  success: boolean
  data?: any[]
  message?: string
  error?: string
}

export interface ZohoCrmConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  domain?: string // "com" (US/EU), "com.au", "jp", etc.
}

// ============================================================
// Zoho CRM Service Class
// ============================================================

export class ZohoCrmIntegration {
  private config: ZohoCrmConfig | null = null
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0
  private simulatedContacts: Map<string, ZohoContact>
  private simulatedDeals: Map<string, ZohoDeal>
  private simulationMode: boolean = true

  constructor(config?: Partial<ZohoCrmConfig>) {
    this.simulatedContacts = new Map()
    this.simulatedDeals = new Map()

    const clientId = config?.clientId || process.env.ZOHO_CLIENT_ID || ""
    const clientSecret = config?.clientSecret || process.env.ZOHO_CLIENT_SECRET || ""
    const refreshToken = config?.refreshToken || process.env.ZOHO_REFRESH_TOKEN || ""

    if (clientId && clientSecret && refreshToken) {
      this.config = {
        clientId,
        clientSecret,
        refreshToken,
        domain: process.env.ZOHO_DOMAIN || "com",
      }
      this.simulationMode = false
    }

    // Pre-populate simulated data for demo
    this.initSimulatedData()
  }

  private initSimulatedData() {
    // Simulated contacts for demo/fallback
    const contacts: ZohoContact[] = [
      { id: "zoho-c-1", First_Name: "James", Last_Name: "Kamau", Email: "james@kenyacoffee.co.ke", Company: "Kenya Coffee Exporters Ltd", Phone: "+254712345678", Lead_Source: "Website", Mapato_Status: "active", Mapato_ERS_Score: 78, Mapato_Tier: "growth" },
      { id: "zoho-c-2", First_Name: "Amina", Last_Name: "Mwinyi", Email: "amina@tanzaniatea.co.tz", Company: "Tanzania Tea Growers Co-op", Phone: "+255712345678", Lead_Source: "Referral", Mapato_Status: "active", Mapato_ERS_Score: 72, Mapato_Tier: "growth" },
      { id: "zoho-c-3", First_Name: "Tesfaye", Last_Name: "Abebe", Email: "tesfaye@ethiospice.com", Company: "Ethiopian Spice Traders", Phone: "+251912345678", Lead_Source: "Sokogate", Mapato_Status: "onboarding", Mapato_ERS_Score: 65, Mapato_Tier: "starter" },
    ]
    for (const c of contacts) this.simulatedContacts.set(c.id!, c)

    // Simulated deals
    const deals: ZohoDeal[] = [
      { id: "zoho-d-1", Deal_Name: "Kenya Coffee - Korea Export Deal", Stage: "Negotiation", Amount: 150000, Contact_Id: "zoho-c-1", Account_Name: "Kenya Coffee Exporters Ltd", Probability: 70, Mapato_Corridor: "korea-africa", Mapato_Agent_Score: 82 },
      { id: "zoho-d-2", Deal_Name: "Tanzania Tea - Bulk Supply Contract", Stage: "Proposal", Amount: 85000, Contact_Id: "zoho-c-2", Account_Name: "Tanzania Tea Growers Co-op", Probability: 45, Mapato_Corridor: "korea-africa", Mapato_Agent_Score: 72 },
    ]
    for (const d of deals) this.simulatedDeals.set(d.id!, d)
  }

  // ==========================================================
  // Authentication
  // ==========================================================

  private async refreshAccessToken(): Promise<string | null> {
    if (!this.config) return null

    try {
      const response = await fetch(
        `https://accounts.zoho.${this.config.domain}/oauth/v2/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            refresh_token: this.config.refreshToken,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            grant_type: "refresh_token",
          }),
        }
      )

      const data = await response.json()
      if (data.access_token) {
        this.accessToken = data.access_token
        this.tokenExpiresAt = Date.now() + (data.expires_in_sec || 3600) * 1000
        return this.accessToken
      }
      return null
    } catch {
      return null
    }
  }

  private async getValidAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }
    return this.refreshAccessToken()
  }

  // ==========================================================
  // API Request Helper
  // ==========================================================

  private async apiRequest(
    module: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    data?: any
  ): Promise<ZohoApiResponse> {
    if (this.simulationMode) {
      return this.simulatedApiRequest(module, method, data)
    }

    const token = await this.getValidAccessToken()
    if (!token) {
      return {
        success: false,
        error: `Zoho CRM: Not authenticated. No valid access token. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN in .env`,
      }
    }

    const domain = this.config?.domain || "com"
    const url = `https://www.zohoapis.${domain}/crm/v7/${module}`

    try {
      const options: RequestInit = {
        method,
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
      }
      if (data && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify({ data: Array.isArray(data) ? data : [data] })
      }

      const response = await fetch(url, options)
      const body = await response.json()

      if (!response.ok) {
        return { success: false, error: `Zoho API error (${response.status}): ${body.message || JSON.stringify(body)}` }
      }

      return { success: true, data: body.data }
    } catch (error: any) {
      return { success: false, error: `Zoho CRM request failed: ${error.message}` }
    }
  }

  // ==========================================================
  // Simulated API (for demo / when env vars not set)
  // ==========================================================

  private simulatedApiRequest(
    module: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    data?: any
  ): ZohoApiResponse {
    const moduleLc = module.toLowerCase()

    if (moduleLc === "contacts" || moduleLc === "leads") {
      if (method === "GET") {
        return { success: true, data: Array.from(this.simulatedContacts.values()) }
      }
      if (method === "POST" && data) {
        const newId = `zoho-c-sim-${Date.now()}`
        const contact: ZohoContact = { id: newId, ...data }
        this.simulatedContacts.set(newId, contact)
        return { success: true, data: [contact] }
      }
    }

    if (moduleLc === "deals") {
      if (method === "GET") {
        return { success: true, data: Array.from(this.simulatedDeals.values()) }
      }
      if (method === "POST" && data) {
        const newId = `zoho-d-sim-${Date.now()}`
        const deal: ZohoDeal = { id: newId, ...data }
        this.simulatedDeals.set(newId, deal)
        return { success: true, data: [deal] }
      }
    }

    return { success: true, data: [] }
  }

  // ==========================================================
  // Contacts API
  // ==========================================================

  async getContacts(): Promise<ZohoApiResponse> {
    return this.apiRequest("Contacts", "GET")
  }

  async createContact(contact: ZohoContact): Promise<ZohoApiResponse> {
    return this.apiRequest("Contacts", "POST", contact)
  }

  async updateContact(contactId: string, data: Partial<ZohoContact>): Promise<ZohoApiResponse> {
    return this.apiRequest(`Contacts/${contactId}`, "PUT", data)
  }

  // ==========================================================
  // Deals API
  // ==========================================================

  async getDeals(): Promise<ZohoApiResponse> {
    return this.apiRequest("Deals", "GET")
  }

  async createDeal(deal: ZohoDeal): Promise<ZohoApiResponse> {
    return this.apiRequest("Deals", "POST", deal)
  }

  async updateDealStage(dealId: string, stage: string): Promise<ZohoApiResponse> {
    return this.apiRequest(`Deals/${dealId}`, "PUT", { Stage: stage })
  }

  // ==========================================================
  // Leads API
  // ==========================================================

  async getLeads(): Promise<ZohoApiResponse> {
    return this.apiRequest("Leads", "GET")
  }

  async createLead(lead: ZohoLead): Promise<ZohoApiResponse> {
    return this.apiRequest("Leads", "POST", lead)
  }

  // ==========================================================
  // Sync helpers — used by agent service bridge
  // ==========================================================

  /** Sync a Mapato client to Zoho as a Contact + Deal */
  async syncClientToCrm(client: {
    name: string
    email: string
    phone?: string
    company?: string
    status?: string
    ersScore?: number
    tier?: string
    corridor?: string
  }): Promise<{ contactId?: string; dealId?: string; error?: string }> {
    // Check if contact already exists
    const contactsRes = await this.getContacts()
    const existing = contactsRes.data?.find(
      (c: ZohoContact) => c.Email?.toLowerCase() === client.email.toLowerCase()
    )

    let contactId: string | undefined

    if (existing) {
      contactId = existing.id
      if (contactId) {
        await this.updateContact(contactId, {
          Mapato_Status: client.status || existing.Mapato_Status,
          Mapato_ERS_Score: client.ersScore || existing.Mapato_ERS_Score,
          Mapato_Tier: client.tier || existing.Mapato_Tier,
        })
      }
    } else {
      const nameParts = client.name.split(" ")
      const result = await this.createContact({
        First_Name: nameParts[0] || client.name,
        Last_Name: nameParts.slice(1).join(" ") || "Client",
        Email: client.email,
        Phone: client.phone,
        Company: client.company,
        Lead_Source: "Mapato God Mode",
        Mapato_Status: client.status || "lead",
        Mapato_ERS_Score: client.ersScore || 0,
        Mapato_Tier: client.tier || "starter",
      })
      if (result.success && result.data?.[0]?.id) {
        contactId = result.data[0].id
      }
    }

    // Create a deal for active or qualified clients
    if (contactId && client.status && ["active", "qualified", "onboarding"].includes(client.status)) {
      const dealResult = await this.createDeal({
        Deal_Name: `${client.company || client.name} — Trade Automation`,
        Stage: client.status === "active" ? "Closed Won" : client.status === "qualified" ? "Negotiation" : "Proposal",
        Contact_Id: contactId,
        Account_Name: client.company || client.name,
        Mapato_Corridor: client.corridor || "",
        Probability: client.status === "active" ? 100 : client.status === "qualified" ? 70 : 40,
      })
      if (dealResult.success && dealResult.data?.[0]?.id) {
        return { contactId, dealId: dealResult.data[0].id }
      }
    }

    return { contactId }
  }

  // ==========================================================
  // Status
  // ==========================================================

  isConfigured(): boolean {
    return !this.simulationMode && this.config !== null
  }

  summary(): string {
    if (this.simulationMode) {
      return `Zoho CRM: SIMULATION MODE — ${this.simulatedContacts.size} contacts, ${this.simulatedDeals.size} deals (set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN for live)`
    }
    return `Zoho CRM: LIVE MODE — configured for domain zoho.${this.config?.domain}`
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const zohoCrmIntegration = new ZohoCrmIntegration()
export default ZohoCrmIntegration
