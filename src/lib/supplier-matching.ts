/**
 * Supplier Matching Engine
 *
 * Scores the fit between a Korean buyer's procurement needs and an African
 * supplier's export capabilities using ERS data, compliance records, and
 * commodity/category alignment.
 *
 * Match score breakdown:
 *   - Product Fit:      40% — Commodity category alignment
 *   - Compliance:       35% — Certifications match buyer requirements
 *   - Export Capacity:  25% — ERS score + volume + track record
 */

// ---- Types -----------------------------------------------------------

export interface BuyerProfile {
  id?: string
  name: string
  industry?: string
  procurementFocus?: string[]      // e.g. ["coffee", "tea", "minerals"]
  requiredCertifications?: string[] // e.g. ["haccp", "organic", "halal"]
  minErsScore?: number
  monthlyVolume?: string
}

export interface SupplierProfile {
  id: string
  name: string
  country: string
  commodity?: string
  category?: string
  certifications?: string[]        // e.g. ["HACCP", "Organic"]
  ersScore: number
  ersBreakdown?: {
    documentation: number
    compliance: number
    exportHistory: number
    capacityVerified: number
  }
  exportVolume?: string
  pricing?: string
}

export interface MatchResult {
  supplierId: string
  supplierName: string
  supplierCountry: string
  buyerName: string
  matchScore: number               // 0-100
  productFitScore: number          // 0-40
  complianceScore: number          // 0-35
  capacityScore: number            // 0-25
  matchedCommodities: string[]
  matchedCertifications: string[]
  gapCertifications: string[]      // Certs buyer needs but supplier lacks
  reasoning: string[]
}

// ---- Commodity keyword mapping ---------------------------------------

const COMMODITY_KEYWORDS: Record<string, string[]> = {
  coffee: ["coffee", "arabica", "robusta"],
  tea: ["tea", "black tea", "green tea", "ctc"],
  cocoa: ["cocoa", "cocoa butter", "cocoa powder", "cocoa liquor", "chocolate"],
  cotton: ["cotton", "cotton yarn", "cotton fabric"],
  textiles: ["textile", "fabric", "garment", "apparel", "clothing"],
  minerals: ["mineral", "graphite", "cobalt", "copper", "titanium", "ilmenite", "rutile", "zircon"],
  copper: ["copper", "copper cathode"],
  seafood: ["seafood", "fish", "shrimp", "octopus", "tuna", "prawn"],
  oil: ["palm oil", "palm kernel", "shea butter", "vegetable oil"],
  spices: ["spice", "cardamom", "turmeric", "ginger", "cinnamon"],
  nuts: ["nut", "macadamia", "cashew", "sesame", "almond"],
  wine: ["wine", "brandy", "grape", "vineyard"],
  leather: ["leather", "hide", "skin"],
  rubber: ["rubber", "latex"],
}

function matchCommodities(buyerFocus: string[], supplierCommodity: string | undefined): string[] {
  if (!supplierCommodity) return []
  const supplier = supplierCommodity.toLowerCase()
  const matched: string[] = []
  for (const focus of buyerFocus) {
    const keywords = COMMODITY_KEYWORDS[focus.toLowerCase()] ?? [focus.toLowerCase()]
    for (const kw of keywords) {
      if (supplier.includes(kw)) {
        matched.push(focus)
        break
      }
    }
  }
  return [...new Set(matched)]
}

// ---- Scoring functions -----------------------------------------------

function scoreProductFit(
  buyer: BuyerProfile,
  supplier: SupplierProfile,
  matched: string[],
): { score: number; reasoning: string[] } {
  const reasoning: string[] = []
  let score = 0

  // Commodity match (up to 30 points)
  const matchCount = matched.length
  if (matchCount >= 3) { score += 30; reasoning.push(`${matchCount} commodity categories matched`) }
  else if (matchCount === 2) { score += 25; reasoning.push(`2 commodity categories matched`) }
  else if (matchCount === 1) { score += 18; reasoning.push(`1 commodity category matched`) }
  else {
    // No direct match — check category-level alignment
    if (supplier.category && buyer.procurementFocus?.some((f) => supplier.category!.toLowerCase().includes(f.toLowerCase()))) {
      score += 10; reasoning.push("Category-level alignment (no exact commodity match)")
    } else {
      reasoning.push("No commodity match found")
    }
  }

  // Supplier provides pricing = market-ready (up to 10 points)
  if (supplier.pricing) { score += 10; reasoning.push("Pricing data available") }

  return { score: Math.min(40, score), reasoning }
}

function scoreCompliance(
  buyer: BuyerProfile,
  supplier: SupplierProfile,
): { score: number; matched: string[]; gaps: string[]; reasoning: string[] } {
  const reasoning: string[] = []
  const supplierCerts = (supplier.certifications ?? []).map((c) => c.toLowerCase())
  const buyerCerts = (buyer.requiredCertifications ?? []).map((c) => c.toLowerCase())

  const matchedCerts: string[] = []
  const gapCerts: string[] = []

  for (const need of buyerCerts) {
    if (supplierCerts.some((sc) => sc.includes(need) || need.includes(sc))) {
      matchedCerts.push(need)
    } else {
      gapCerts.push(need)
    }
  }

  let score = 0

  // Base score from ERS compliance dimension (up to 15 points)
  const complianceDim = supplier.ersBreakdown?.compliance ?? 0
  score += Math.round((complianceDim / 25) * 15)

  // Certification match bonus (up to 20 points)
  if (matchedCerts.length > 0) {
    const bonus = Math.min(20, matchedCerts.length * 7)
    score += bonus
    reasoning.push(`${matchedCerts.length} required certs matched`)
  }

  if (gapCerts.length > 0) {
    reasoning.push(`${gapCerts.length} cert gaps: ${gapCerts.join(", ")}`)
  } else if (buyerCerts.length > 0) {
    reasoning.push("All required certifications satisfied")
  }

  return { score: Math.min(35, score), matched: matchedCerts, gaps: gapCerts, reasoning }
}

function scoreCapacity(supplier: SupplierProfile): { score: number; reasoning: string[] } {
  const reasoning: string[] = []
  let score = 0

  // ERS total (up to 10 points)
  if (supplier.ersScore >= 80) { score += 10; reasoning.push("High ERS score (80+)") }
  else if (supplier.ersScore >= 65) { score += 7; reasoning.push("Good ERS score (65+)") }
  else if (supplier.ersScore >= 50) { score += 4; reasoning.push("Moderate ERS score") }
  else { reasoning.push("Low ERS score") }

  // Export history dimension (up to 10 points)
  const historyDim = supplier.ersBreakdown?.exportHistory ?? 0
  score += Math.round((historyDim / 25) * 10)

  // Capacity verified dimension (up to 5 points)
  const capacityDim = supplier.ersBreakdown?.capacityVerified ?? 0
  score += Math.round((capacityDim / 25) * 5)

  return { score: Math.min(25, score), reasoning }
}

// ---- Main entry point ------------------------------------------------

/**
 * Match a single Korean buyer against a list of African suppliers.
 * Returns results sorted by match score descending.
 */
export function matchSuppliers(
  buyer: BuyerProfile,
  suppliers: SupplierProfile[],
): MatchResult[] {
  const results: MatchResult[] = []

  for (const supplier of suppliers) {
    const matchedCommodities = matchCommodities(buyer.procurementFocus ?? [], supplier.commodity)

    const productFit = scoreProductFit(buyer, supplier, matchedCommodities)
    const compliance = scoreCompliance(buyer, supplier)
    const capacity = scoreCapacity(supplier)

    const total = productFit.score + compliance.score + capacity.score

    results.push({
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierCountry: supplier.country,
      buyerName: buyer.name,
      matchScore: total,
      productFitScore: productFit.score,
      complianceScore: compliance.score,
      capacityScore: capacity.score,
      matchedCommodities,
      matchedCertifications: compliance.matched,
      gapCertifications: compliance.gaps,
      reasoning: [...productFit.reasoning, ...compliance.reasoning, ...capacity.reasoning],
    })
  }

  return results.sort((a, b) => b.matchScore - a.matchScore)
}

// ---- Preset buyers for common Korean procurement profiles ------------

export const KOREAN_BUYER_PROFILES: Record<string, BuyerProfile> = {
  "Busan Food Processors": {
    name: "Busan Food Processors",
    industry: "Food processing",
    procurementFocus: ["coffee", "cocoa", "tea", "spices", "nuts"],
    requiredCertifications: ["haccp", "organic", "halal"],
    minErsScore: 65,
  },
  "Seoul Trading Corp": {
    name: "Seoul Trading Corp",
    industry: "General trading",
    procurementFocus: ["coffee", "tea", "cocoa", "minerals", "seafood", "oil"],
    requiredCertifications: ["haccp", "iso 9001"],
    minErsScore: 60,
  },
  "Daegu Textile Mill": {
    name: "Daegu Textile Mill",
    industry: "Textile manufacturing",
    procurementFocus: ["cotton", "textiles"],
    requiredCertifications: ["gots", "organic"],
    minErsScore: 65,
  },
  "Incheon Chemical Co": {
    name: "Incheon Chemical Co",
    industry: "Chemicals",
    procurementFocus: ["minerals", "rubber", "oil"],
    requiredCertifications: ["iso 9001"],
    minErsScore: 60,
  },
  "LG Components Ltd": {
    name: "LG Components Ltd",
    industry: "Electronics",
    procurementFocus: ["minerals", "copper"],
    requiredCertifications: ["iso 9001"],
    minErsScore: 70,
  },
}
