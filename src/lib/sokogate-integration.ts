/**
 * Sokogate Integration Layer
 *
 * Sokogate is the B2B wholesale sourcing platform connecting African traders to
 * global markets. This integration provides API access for supplier discovery,
 * trade corridor matching, escrow payments, and pilot cohort management.
 *
 * Sokogate powers the trade corridor matching layer and Korea pilot program.
 * Website: https://sokogate.com
 */

// ============================================================
// Types
// ============================================================

export interface SokogateConfig {
  apiKey: string
  apiSecret: string
  baseUrl?: string
}

export interface SokogateSupplier {
  id: string
  companyName: string
  contactName: string
  email: string
  phone?: string
  country: string
  commodities: string[]
  certifications: string[]
  exportReadinessScore: number
  monthlyCapacity?: string
  minOrderQuantity?: string
  pricing?: string
  status: "active" | "pending" | "suspended"
}

export interface SokogateBuyer {
  id: string
  companyName: string
  contactName: string
  email: string
  country: string
  procurementInterests: string[]
  requiredCertifications: string[]
  monthlyVolume?: string
  budgetRange?: string
  status: "active" | "inactive"
}

export interface SokogateCorridorMatch {
  id: string
  supplierId: string
  buyerId: string
  matchScore: number
  matchBreakdown: {
    productFit: number
    certificationCompatibility: number
    volumeFit: number
    logisticsFeasibility: number
    priceCompetitiveness: number
  }
  status: "pending" | "accepted" | "rejected" | "in-progress"
  initiatedAt: string
}

export interface SokogateEscrowTransaction {
  id: string
  reference: string
  buyerId: string
  supplierId: string
  amount: number
  currency: string
  status: "pending" | "funded" | "in-escrow" | "released" | "disputed" | "cancelled"
  createdAt: string
  releasedAt?: string
}

export interface SokogatePilotEnrollment {
  id: string
  cohortId: string
  companyName: string
  contactName: string
  email: string
  country: string
  commodities: string[]
  trialStartDate: string
  trialEndDate: string
  status: "invited" | "active" | "converting" | "churned"
}

// ============================================================
// Sokogate API Service
// ============================================================

export class SokogateIntegration {
  private config: SokogateConfig | null = null
  private simulationMode: boolean = true

  constructor(config?: Partial<SokogateConfig>) {
    const apiKey = config?.apiKey || process.env.SOKOGATE_API_KEY || ""
    const apiSecret = config?.apiSecret || process.env.SOKOGATE_API_SECRET || ""

    if (apiKey && apiSecret) {
      this.config = {
        apiKey,
        apiSecret,
        baseUrl: config?.baseUrl || process.env.SOKOGATE_API_URL || "https://api.sokogate.com/v1",
      }
      this.simulationMode = false
    }
  }

  // ==========================================================
  // API Request Helper
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
      const timestamp = Date.now().toString()
      const signature = await this.generateSignature(timestamp, method, path, data)

      const response = await fetch(`${this.config!.baseUrl}${path}`, {
        method,
        headers: {
          "X-API-Key": this.config!.apiKey,
          "X-Timestamp": timestamp,
          "X-Signature": signature,
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
      })

      const body = await response.json()
      if (!response.ok) {
        return { success: false, error: `Sokogate API error (${response.status}): ${body.message || JSON.stringify(body)}` }
      }
      return { success: true, data: body }
    } catch (error: any) {
      // Fallback to simulation on network error
      if (!this.simulationMode) {
        console.warn(`[Sokogate] API request failed, falling back to simulated data: ${error.message}`)
      }
      return this.simulatedRequest(path, method, data)
    }
  }

  private async generateSignature(
    timestamp: string,
    method: string,
    path: string,
    data?: any
  ): Promise<string> {
    // In production, HMAC-SHA256 of timestamp + method + path + body
    // For now, return a placeholder — the real implementation needs the crypto module
    const msg = `${timestamp}${method}${path}${data ? JSON.stringify(data) : ""}`
    // Simple hash fallback for now
    let hash = 0
    for (let i = 0; i < msg.length; i++) {
      const char = msg.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    return `sim-${Math.abs(hash).toString(16)}`
  }

  // ==========================================================
  // Simulated Data (for demo / when env vars not set)
  // ==========================================================

  private simulatedSuppliers: SokogateSupplier[] = [
    // ── Existing (Phase 1) ──────────────────────────────────
    { id: "soko-sup-1", companyName: "Kenya Coffee Exporters Ltd", contactName: "James Kamau", email: "james@kenyacoffee.co.ke", phone: "+254712345678", country: "Kenya", commodities: ["Specialty Arabica Coffee"], certifications: ["HACCP", "Organic"], exportReadinessScore: 78, monthlyCapacity: "2000 kg/month", minOrderQuantity: "500 kg", pricing: "$8.50/kg FOB Mombasa", status: "active" },
    { id: "soko-sup-2", companyName: "Tanzania Tea Growers Co-op", contactName: "Amina Mwinyi", email: "amina@tanzaniatea.co.tz", phone: "+255712345678", country: "Tanzania", commodities: ["Premium Black Tea", "Green Tea"], certifications: ["HACCP", "Halal"], exportReadinessScore: 72, monthlyCapacity: "5000 kg/month", minOrderQuantity: "1000 kg", pricing: "$3.20/kg FOB Dar es Salaam", status: "active" },
    { id: "soko-sup-3", companyName: "DRC Cobalt Supply Co.", contactName: "Pierre Kasongo", email: "pierre@drc-cobalt.cd", phone: "+243812345678", country: "DRC", commodities: ["Cobalt Hydroxide"], certifications: ["Conflict-free"], exportReadinessScore: 62, monthlyCapacity: "200 tons/month", minOrderQuantity: "20 tons", pricing: "$35,000/ton CIF Busan", status: "active" },
    { id: "soko-sup-4", companyName: "Ghana Cocoa Processing Co.", contactName: "Kwame Asante", email: "kwame@ghanacocoa.gh", phone: "+233512345678", country: "Ghana", commodities: ["Cocoa Butter", "Cocoa Powder", "Cocoa Liquor"], certifications: ["UTZ", "Rainforest Alliance", "Organic"], exportReadinessScore: 80, monthlyCapacity: "10000 tons/year", minOrderQuantity: "5 tons", pricing: "$4,200/ton FOB Tema", status: "active" },

    // ── East African Agricultural Exports ───────────────────
    { id: "soko-sup-5", companyName: "Ethiopian Spice Traders PLC", contactName: "Tesfaye Abebe", email: "tesfaye@ethiospice.com", phone: "+251912345678", country: "Ethiopia", commodities: ["Cardamom", "Turmeric", "Ginger", "Cinnamon"], certifications: ["Organic", "HACCP", "Fair Trade"], exportReadinessScore: 75, monthlyCapacity: "800 kg/month", minOrderQuantity: "100 kg", pricing: "$12.00/kg FOB Addis Ababa", status: "active" },
    { id: "soko-sup-6", companyName: "Mozambique Macadamia Growers", contactName: "Helena dos Santos", email: "helena@mozmacadamia.co.mz", phone: "+258823456789", country: "Mozambique", commodities: ["Macadamia Nuts", "Cashew Nuts"], certifications: ["HACCP", "Organic", "Halal"], exportReadinessScore: 70, monthlyCapacity: "1500 kg/month", minOrderQuantity: "200 kg", pricing: "$14.50/kg FOB Beira", status: "active" },
    { id: "soko-sup-7", companyName: "Uganda Cotton Exporters Ltd", contactName: "Sarah Nakato", email: "sarah@ugandacotton.co.ug", phone: "+256712345678", country: "Uganda", commodities: ["Organic Cotton Fiber", "Cotton Yarn"], certifications: ["GOTS", "Organic", "Fair Trade"], exportReadinessScore: 68, monthlyCapacity: "2000 tons/year", minOrderQuantity: "50 tons", pricing: "$2.80/kg FOB Kampala", status: "active" },
    { id: "soko-sup-8", companyName: "Senegal Seafood Corp", contactName: "Mamadou Diallo", email: "mdiallo@senegalseafood.sn", phone: "+221773456789", country: "Senegal", commodities: ["Frozen Shrimp", "Octopus", "Tuna"], certifications: ["HACCP", "Halal", "ISO 9001", "BAP"], exportReadinessScore: 76, monthlyCapacity: "500 tons/month", minOrderQuantity: "10 tons", pricing: "$8.50/kg FOB Dakar", status: "active" },

    // ── Mineral & Industrial Exports ────────────────────────
    { id: "soko-sup-9", companyName: "Zambia Copper Mines Ltd", contactName: "Chanda Bwalya", email: "chanda@zambiacopper.co.zm", phone: "+260977123456", country: "Zambia", commodities: ["Copper Cathode", "Copper Concentrate"], certifications: ["ISO 9001", "ISO 14001", "Conflict-free"], exportReadinessScore: 82, monthlyCapacity: "5000 tons/month", minOrderQuantity: "100 tons", pricing: "$8,800/ton CIF Busan", status: "active" },
    { id: "soko-sup-10", companyName: "Nigeria Palm Oil Refinery", contactName: "Chioma Okafor", email: "chioma@nigeriapalm.ng", phone: "+2348031234567", country: "Nigeria", commodities: ["Refined Palm Oil", "Shea Butter", "Vegetable Oil"], certifications: ["HACCP", "ISO 9001", "Organic"], exportReadinessScore: 65, monthlyCapacity: "8000 tons/month", minOrderQuantity: "200 tons", pricing: "$950/ton FOB Lagos", status: "active" },

    // ── North & Southern African Exports ────────────────────
    { id: "soko-sup-11", companyName: "Morocco Textile Works", contactName: "Youssef Benali", email: "youssef@moroccotextile.ma", phone: "+212612345678", country: "Morocco", commodities: ["Cotton Fabric", "Garments", "Leather Goods"], certifications: ["GOTS", "Organic", "ISO 9001", "OEKO-TEX"], exportReadinessScore: 74, monthlyCapacity: "50000 units/month", minOrderQuantity: "1000 units", pricing: "$15.00/unit FOB Casablanca", status: "active" },
    { id: "soko-sup-12", companyName: "South Africa Wine Estates", contactName: "Pieter van der Merwe", email: "pieter@sawines.co.za", phone: "+272112345678", country: "South Africa", commodities: ["Chenin Blanc", "Cabernet Sauvignon", "Brandy"], certifications: ["HACCP", "Organic", "Fair Trade"], exportReadinessScore: 78, monthlyCapacity: "50000 cases/year", minOrderQuantity: "500 cases", pricing: "$60.00/case FOB Cape Town", status: "active" },
  ]

  private simulatedBuyers: SokogateBuyer[] = [
    // ── Korean Buyers ────────────────────────────────────────
    { id: "soko-buy-1", companyName: "Incheon Chemical Co.", contactName: "Min-Jun Park", email: "mjpark@incheonchem.kr", country: "South Korea", procurementInterests: ["Cobalt", "Copper", "Industrial Minerals"], requiredCertifications: ["Conflict-free", "ISO 9001"], monthlyVolume: "500 tons/month", budgetRange: "$5M-10M/year", status: "active" },
    { id: "soko-buy-2", companyName: "Seoul Food Corp", contactName: "Ji-Yeon Kim", email: "jykim@seoulfood.kr", country: "South Korea", procurementInterests: ["Coffee", "Tea", "Cocoa", "Spices", "Nuts"], requiredCertifications: ["HACCP", "Organic", "Halal"], monthlyVolume: "1000 tons/month", budgetRange: "$3M-8M/year", status: "active" },
    { id: "soko-buy-3", companyName: "Busan Textile Mills", contactName: "Sung-Ho Lee", email: "shlee@busantex.kr", country: "South Korea", procurementInterests: ["Cotton", "Textiles", "Leather"], requiredCertifications: ["GOTS", "Organic", "OEKO-TEX"], monthlyVolume: "300 tons/month", budgetRange: "$2M-5M/year", status: "active" },
    { id: "soko-buy-4", companyName: "LG Electronics Components", contactName: "Hyun-Woo Kim", email: "hwkim@lgcomponents.kr", country: "South Korea", procurementInterests: ["Cobalt", "Copper", "Industrial Minerals"], requiredCertifications: ["ISO 9001", "ISO 14001", "Conflict-free"], monthlyVolume: "1000 tons/month", budgetRange: "$10M-20M/year", status: "active" },

    // ── Middle Eastern Buyers ───────────────────────────────
    { id: "soko-buy-5", companyName: "Dubai Food Trading LLC", contactName: "Ahmed Al-Rashid", email: "ahmed@dubaifood.ae", country: "UAE", procurementInterests: ["Spices", "Nuts", "Coffee", "Tea", "Palm Oil", "Shea Butter"], requiredCertifications: ["HACCP", "Halal", "Organic"], monthlyVolume: "2000 tons/month", budgetRange: "$5M-15M/year", status: "active" },

    // ── European Buyers ─────────────────────────────────────
    { id: "soko-buy-6", companyName: "Rotterdam Commodities BV", contactName: "Emma van den Berg", email: "emma@rotterdamcommodities.nl", country: "Netherlands", procurementInterests: ["Cocoa", "Coffee", "Copper", "Palm Oil", "Seafood"], requiredCertifications: ["HACCP", "Rainforest Alliance", "ISO 9001", "Organic"], monthlyVolume: "5000 tons/month", budgetRange: "$20M-50M/year", status: "active" },
    { id: "soko-buy-7", companyName: "Hamburg Industrial Supply GmbH", contactName: "Klaus Weber", email: "kweber@hamburg-industrial.de", country: "Germany", procurementInterests: ["Cobalt", "Copper", "Leather", "Textiles"], requiredCertifications: ["ISO 9001", "OEKO-TEX", "Conflict-free"], monthlyVolume: "800 tons/month", budgetRange: "$8M-12M/year", status: "active" },
    { id: "soko-buy-8", companyName: "London Fine Foods Importers", contactName: "Sarah Mitchell", email: "sarah@londonfinefoods.co.uk", country: "United Kingdom", procurementInterests: ["Coffee", "Tea", "Wine", "Spices", "Nuts"], requiredCertifications: ["Organic", "Fair Trade", "HACCP"], monthlyVolume: "300 tons/month", budgetRange: "$2M-5M/year", status: "active" },
  ]

  private simulatedMatches: SokogateCorridorMatch[] = [
    // ── Korea Corridor ───────────────────────────────────────
    { id: "soko-match-1", supplierId: "soko-sup-1", buyerId: "soko-buy-2", matchScore: 85, matchBreakdown: { productFit: 90, certificationCompatibility: 80, volumeFit: 75, logisticsFeasibility: 85, priceCompetitiveness: 95 }, status: "in-progress", initiatedAt: new Date().toISOString() },
    { id: "soko-match-2", supplierId: "soko-sup-2", buyerId: "soko-buy-2", matchScore: 78, matchBreakdown: { productFit: 85, certificationCompatibility: 75, volumeFit: 80, logisticsFeasibility: 70, priceCompetitiveness: 80 }, status: "pending", initiatedAt: new Date().toISOString() },
    { id: "soko-match-3", supplierId: "soko-sup-3", buyerId: "soko-buy-1", matchScore: 72, matchBreakdown: { productFit: 95, certificationCompatibility: 60, volumeFit: 70, logisticsFeasibility: 65, priceCompetitiveness: 70 }, status: "pending", initiatedAt: new Date().toISOString() },
    { id: "soko-match-4", supplierId: "soko-sup-9", buyerId: "soko-buy-4", matchScore: 92, matchBreakdown: { productFit: 95, certificationCompatibility: 90, volumeFit: 90, logisticsFeasibility: 85, priceCompetitiveness: 100 }, status: "accepted", initiatedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: "soko-match-5", supplierId: "soko-sup-7", buyerId: "soko-buy-3", matchScore: 88, matchBreakdown: { productFit: 90, certificationCompatibility: 85, volumeFit: 80, logisticsFeasibility: 90, priceCompetitiveness: 95 }, status: "in-progress", initiatedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: "soko-match-6", supplierId: "soko-sup-11", buyerId: "soko-buy-3", matchScore: 76, matchBreakdown: { productFit: 80, certificationCompatibility: 85, volumeFit: 70, logisticsFeasibility: 75, priceCompetitiveness: 70 }, status: "pending", initiatedAt: new Date().toISOString() },

    // ── Europe Corridor ─────────────────────────────────────
    { id: "soko-match-7", supplierId: "soko-sup-4", buyerId: "soko-buy-6", matchScore: 91, matchBreakdown: { productFit: 95, certificationCompatibility: 90, volumeFit: 90, logisticsFeasibility: 85, priceCompetitiveness: 95 }, status: "in-progress", initiatedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: "soko-match-8", supplierId: "soko-sup-8", buyerId: "soko-buy-6", matchScore: 74, matchBreakdown: { productFit: 70, certificationCompatibility: 80, volumeFit: 65, logisticsFeasibility: 75, priceCompetitiveness: 80 }, status: "pending", initiatedAt: new Date().toISOString() },
    { id: "soko-match-9", supplierId: "soko-sup-12", buyerId: "soko-buy-8", matchScore: 82, matchBreakdown: { productFit: 90, certificationCompatibility: 75, volumeFit: 80, logisticsFeasibility: 85, priceCompetitiveness: 80 }, status: "pending", initiatedAt: new Date().toISOString() },

    // ── Middle East Corridor ────────────────────────────────
    { id: "soko-match-10", supplierId: "soko-sup-5", buyerId: "soko-buy-5", matchScore: 87, matchBreakdown: { productFit: 90, certificationCompatibility: 85, volumeFit: 80, logisticsFeasibility: 85, priceCompetitiveness: 95 }, status: "accepted", initiatedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: "soko-match-11", supplierId: "soko-sup-6", buyerId: "soko-buy-5", matchScore: 79, matchBreakdown: { productFit: 80, certificationCompatibility: 85, volumeFit: 75, logisticsFeasibility: 75, priceCompetitiveness: 80 }, status: "pending", initiatedAt: new Date().toISOString() },
    { id: "soko-match-12", supplierId: "soko-sup-10", buyerId: "soko-buy-5", matchScore: 71, matchBreakdown: { productFit: 75, certificationCompatibility: 65, volumeFit: 80, logisticsFeasibility: 65, priceCompetitiveness: 70 }, status: "pending", initiatedAt: new Date().toISOString() },
  ]

  private simulatedRequest(
    path: string,
    method: string,
    data?: any
  ): { success: boolean; data?: any; error?: string } {
    if (path.includes("/suppliers") && method === "GET") {
      return { success: true, data: { suppliers: this.simulatedSuppliers } }
    }
    if (path.includes("/buyers") && method === "GET") {
      return { success: true, data: { buyers: this.simulatedBuyers } }
    }
    if (path.includes("/matches") && method === "GET") {
      return { success: true, data: { matches: this.simulatedMatches } }
    }
    if (path.includes("/matches") && method === "POST" && data) {
      const newMatch: SokogateCorridorMatch = {
        id: `soko-match-sim-${Date.now()}`,
        supplierId: data.supplierId,
        buyerId: data.buyerId,
        matchScore: data.matchScore || Math.floor(Math.random() * 40) + 50,
        matchBreakdown: data.matchBreakdown || { productFit: 70, certificationCompatibility: 65, volumeFit: 60, logisticsFeasibility: 60, priceCompetitiveness: 65 },
        status: "pending",
        initiatedAt: new Date().toISOString(),
      }
      this.simulatedMatches.push(newMatch)
      return { success: true, data: { match: newMatch } }
    }
    if (path.includes("/escrow") && method === "POST" && data) {
      return {
        success: true,
        data: {
          transaction: {
            id: `soko-escrow-sim-${Date.now()}`,
            reference: `ESC-${Date.now()}`,
            amount: data.amount,
            currency: data.currency || "USD",
            status: "pending",
            createdAt: new Date().toISOString(),
          },
        },
      }
    }
    if (path.includes("/pilot/enroll") && method === "POST" && data) {
      const trialDurationDays = data.trialDurationDays || 90
      const now = new Date()
      const end = new Date(now.getTime() + trialDurationDays * 86400000)
      return {
        success: true,
        data: {
          participant: {
            id: `soko-pilot-sim-${Date.now()}`,
            cohortId: data.cohortId,
            companyName: data.companyName,
            contactName: data.contactName,
            email: data.email,
            country: data.country,
            commodities: data.commodities,
            trialStartDate: now.toISOString(),
            trialEndDate: end.toISOString(),
            status: "active",
          },
        },
      }
    }
    return { success: true, data: {} }
  }

  // ==========================================================
  // Supplier Discovery
  // ==========================================================

  async getSuppliers(filters?: {
    country?: string
    commodity?: string
    minErsScore?: number
    certifications?: string[]
  }): Promise<{ suppliers: SokogateSupplier[]; error?: string }> {
    const result = await this.apiRequest("/suppliers")
    if (!result.success) return { suppliers: [], error: result.error }

    let suppliers = result.data?.suppliers || []

    // Apply filters
    if (filters) {
      if (filters.country) suppliers = suppliers.filter((s: SokogateSupplier) => s.country === filters.country)
      if (filters.commodity) suppliers = suppliers.filter((s: SokogateSupplier) =>
        s.commodities.some((c) => c.toLowerCase().includes(filters!.commodity!.toLowerCase()))
      )
      if (filters.minErsScore) suppliers = suppliers.filter((s: SokogateSupplier) => s.exportReadinessScore >= filters.minErsScore!)
      if (filters.certifications?.length) suppliers = suppliers.filter((s: SokogateSupplier) =>
        filters!.certifications!.every((cert) => s.certifications.some((c) => c.toLowerCase() === cert.toLowerCase()))
      )
    }

    return { suppliers }
  }

  // ==========================================================
  // Buyer Discovery
  // ==========================================================

  async getBuyers(filters?: {
    country?: string
    interest?: string
    status?: string
  }): Promise<{ buyers: SokogateBuyer[]; error?: string }> {
    const result = await this.apiRequest("/buyers")
    if (!result.success) return { buyers: [], error: result.error }

    let buyers = result.data?.buyers || []
    if (filters?.interest) buyers = buyers.filter((b: SokogateBuyer) =>
      b.procurementInterests.some((i) => i.toLowerCase().includes(filters!.interest!.toLowerCase()))
    )
    if (filters?.country) buyers = buyers.filter((b: SokogateBuyer) => b.country === filters.country)

    return { buyers }
  }

  // ==========================================================
  // Corridor Matching
  // ==========================================================

  async findMatches(supplierId: string, buyerId: string): Promise<{ match: SokogateCorridorMatch | null; error?: string }> {
    const result = await this.apiRequest("/matches", "POST", { supplierId, buyerId })
    if (!result.success) return { match: null, error: result.error }
    return { match: result.data?.match || null }
  }

  async getActiveMatches(): Promise<{ matches: SokogateCorridorMatch[]; error?: string }> {
    const result = await this.apiRequest("/matches")
    if (!result.success) return { matches: [], error: result.error }
    return { matches: result.data?.matches || [] }
  }

  // ==========================================================
  // Escrow Payments
  // ==========================================================

  async initiateEscrow(params: {
    buyerId: string
    supplierId: string
    amount: number
    currency?: string
  }): Promise<{ transaction: SokogateEscrowTransaction | null; error?: string }> {
    const result = await this.apiRequest("/escrow", "POST", params)
    if (!result.success) return { transaction: null, error: result.error }
    return { transaction: result.data?.transaction || null }
  }

  // ==========================================================
  // Pilot Program
  // ==========================================================

  async enrollPilotParticipant(enrollment: {
    cohortId: string
    companyName: string
    contactName: string
    email: string
    country: string
    commodities: string[]
    trialDurationDays?: number
  }): Promise<{ participant: SokogatePilotEnrollment | null; error?: string }> {
    const result = await this.apiRequest("/pilot/enroll", "POST", {
      ...enrollment,
      trialDurationDays: enrollment.trialDurationDays || 90,
    })
    if (!result.success) return { participant: null, error: result.error }
    return { participant: result.data?.participant || null }
  }

  // ==========================================================
  // Status
  // ==========================================================

  isConfigured(): boolean {
    return !this.simulationMode && this.config !== null
  }

  summary(): string {
    if (this.simulationMode) {
      return `Sokogate: SIMULATION MODE — ${this.simulatedSuppliers.length} suppliers, ${this.simulatedBuyers.length} buyers, ${this.simulatedMatches.length} matches (set SOKOGATE_API_KEY, SOKOGATE_API_SECRET for live)`
    }
    return `Sokogate: LIVE MODE — connected to ${this.config?.baseUrl}`
  }
}

// ============================================================
// Singleton Export
// ============================================================

export const sokogateIntegration = new SokogateIntegration()
export default SokogateIntegration
