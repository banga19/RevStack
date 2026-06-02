/**
 * ERS (Export Readiness Score) Engine
 *
 * Auto-calculates a 0–100 score from compliance records, product data, and client info.
 * Four dimensions, each out of 25, totalling 100.
 *
 *   Dimension           | Max | Measured by
 *   --------------------+-----+----------------------------------------------
 *   Documentation        | 25  | Trad licenses, cert docs, export permits
 *   Compliance           | 25  | Certifications obtained, in-progress, missing
 *   Export History       | 25  | Volume tiers, track record, market reach
 *   Capacity Verified    | 25  | Can they fulfil orders? production capacity
 *
 * Each dimension returns a score 0-25 and a human-readable assessment.
 * The engine accepts partial data — missing inputs return 0 with a
 * "needs data" assessment.
 */

// ---- Types -----------------------------------------------------------

export type ErsDimension = "documentation" | "compliance" | "exportHistory" | "capacityVerified"

export type ErsBreakdown = Record<ErsDimension, { score: number; max: number; assessment: string }>

export interface ErsInput {
  /** Compliance certifications per certification type */
  complianceRecords?: Array<{
    certificationType: string
    status: "obtained" | "in-progress" | "not-started" | "expired"
    expiresAt?: string | null
  }>
  /** Products the client exports */
  products?: Array<{
    certifications?: string | null
    exportVolume?: string | null
    unit?: string | null
    pricing?: string | null
  }>
  /** Client-level metadata */
  client?: {
    notes?: string | null
    tier?: string | null
    corridor?: string | null
    monthlyRetainer?: number | null
  }
}

export interface ErsResult {
  total: number         // 0-100
  breakdown: ErsBreakdown
  readinessLevel: "export-ready" | "developing" | "needs-work"
}

// ---- Category weights for each dimension -----------------------------

/** Cert types that count toward Documentation dimension */
const DOC_CERT_TYPES = new Set([
  "korean-import",
  "phytosanitary",
  "fda",
])

/** Cert types that count toward Compliance dimension */
const COMPLIANCE_CERT_TYPES = new Set([
  "haccp",
  "halal",
  "organic",
  "gots",
  "iso-9001",
  "iso9001",
  "iso 9001",
])

// ---- Scoring helpers -------------------------------------------------

function scoreDocumentation(input: ErsInput): { score: number; assessment: string } {
  const records = input.complianceRecords ?? []
  const docCerts = records.filter((r) => DOC_CERT_TYPES.has(r.certificationType))

  if (docCerts.length === 0) {
    return { score: 0, assessment: "No regulatory/import documents on file" }
  }

  const obtained = docCerts.filter((r) => r.status === "obtained").length
  const inProgress = docCerts.filter((r) => r.status === "in-progress").length

  // 25 for all obtained, 15 for partially obtained, 5-10 if in-progress
  if (obtained >= 2) return { score: 25, assessment: "Full documentation: import permits and phytosanitary certs obtained" }
  if (obtained === 1) return { score: 18, assessment: "Partial documentation: 1 import-related cert obtained" }
  if (inProgress >= 2) return { score: 12, assessment: "Documentation in progress: multiple applications underway" }
  if (inProgress === 1) return { score: 8, assessment: "Documentation in progress: initial application submitted" }
  return { score: 3, assessment: "Documentation needed: no import permits or certs applied for" }
}

function scoreCompliance(input: ErsInput): { score: number; assessment: string } {
  const records = input.complianceRecords ?? []
  const complianceCerts = records.filter((r) => COMPLIANCE_CERT_TYPES.has(r.certificationType))

  if (complianceCerts.length === 0) {
    // No compliance records — check if products have certifications listed
    const productCerts = new Set<string>()
    for (const p of input.products ?? []) {
      for (const c of (p.certifications ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
        productCerts.add(c)
      }
    }
    const count = productCerts.size
    if (count >= 3) return { score: 20, assessment: `Strong cert portfolio: ${count} certifications listed on products` }
    if (count >= 1) return { score: 10, assessment: `Some certifications listed: ${count} found on product data` }
    return { score: 0, assessment: "No compliance records or product certifications" }
  }

  const obtained = complianceCerts.filter((r) => r.status === "obtained").length
  const inProgress = complianceCerts.filter((r) => r.status === "in-progress").length
  const active = obtained + inProgress
  const total = complianceCerts.length

  const obtainedRate = total > 0 ? obtained / total : 0

  if (obtained >= 3 && obtainedRate >= 0.6) {
    const expired = complianceCerts.filter((r) => r.status === "expired").length
    const deduction = expired * 3
    const score = Math.max(0, 25 - deduction)
    const expiredNote = expired > 0 ? `${expired} expired cert(s) — renewals needed` : ""
    return { score, assessment: `Strong compliance: ${obtained}/${total} certs obtained. ${expiredNote}`.trim() }
  }
  if (obtained >= 1) return { score: 15, assessment: `Moderate compliance: ${obtained}/${total} obtained, ${inProgress} in progress` }
  if (inProgress >= 2) return { score: 10, assessment: `Compliance building: ${inProgress} certs in progress out of ${total} needed` }
  if (inProgress === 1) return { score: 5, assessment: `Early compliance: 1 cert in progress out of ${total} needed` }
  return { score: 2, assessment: `Compliance needed: ${total} certs required, none started` }
}

function scoreExportHistory(input: ErsInput): { score: number; assessment: string } {
  const products = input.products ?? []

  if (products.length === 0) {
    // Check client notes for export hints
    const notes = input.client?.notes ?? ""
    if (notes.toLowerCase().includes("export") || notes.toLowerCase().includes("supplier") || notes.toLowerCase().includes("trader")) {
      return { score: 5, assessment: "Limited data: client notes mention export activity but no products listed" }
    }
    return { score: 0, assessment: "No export history data available" }
  }

  // Parse volume from products and score
  let maxVolumeKg = 0
  let hasPricing = false
  let volumeTitles = 0

  for (const p of products) {
    if (p.pricing) hasPricing = true
    if (p.exportVolume) {
      volumeTitles++
      // Try to extract numeric volume
      const num = parseFloat(p.exportVolume.replace(/[^0-9.]/g, ""))
      if (!isNaN(num)) {
        const unit = (p.unit ?? "").toLowerCase()
        // Convert to approximate kg-equivalent for comparison
        let kg = num
        if (unit.includes("ton")) kg = num * 1000
        else if (unit.includes("l")) kg = num // assume 1L ≈ 1kg for rough scoring
        // If no unit, assume the number IS kg
        if (kg > maxVolumeKg) maxVolumeKg = kg
      }
    }
  }

  let score = 0
  const details: string[] = []

  // Volume-based scoring (up to 15 points)
  if (maxVolumeKg >= 100000) { score += 15; details.push("High-volume exporter") }
  else if (maxVolumeKg >= 10000) { score += 12; details.push("Mid-volume exporter") }
  else if (maxVolumeKg >= 1000) { score += 8; details.push("Low-volume exporter") }
  else if (maxVolumeKg > 0) { score += 4; details.push("Very low export volume") }

  // Number of products (up to 5 points)
  if (volumeTitles >= 3) { score += 5; details.push("Diverse product portfolio") }
  else if (volumeTitles === 2) { score += 3; details.push("2 export products") }
  else if (volumeTitles === 1) { score += 1 }

  // Pricing maturity (up to 5 points)
  if (hasPricing) { score += 5; details.push("Pricing data available (FOB/CIF)") }

  return {
    score: Math.min(25, score),
    assessment: details.length > 0 ? details.join(" · ") : "Export data present but minimal",
  }
}

function scoreCapacity(input: ErsInput): { score: number; assessment: string } {
  const products = input.products ?? []
  const client = input.client

  let score = 0
  const details: string[] = []

  // Client tier signals capacity (up to 10 points)
  if (client?.tier === "enterprise") { score += 10; details.push("Enterprise tier") }
  else if (client?.tier === "growth") { score += 6; details.push("Growth tier") }
  else if (client?.tier === "starter") { score += 3; details.push("Starter tier") }

  // Retainer = active engagement (up to 5 points)
  if ((client?.monthlyRetainer ?? 0) > 0) {
    score += 5
    details.push("Active retainer client")
  }

  // Trade corridor assigned = strategic capacity (up to 5 points)
  if (client?.corridor) {
    score += 5
    details.push(`Trade corridor mapped: ${client.corridor}`)
  }

  // Number of products indicates production breadth (up to 5 points)
  if (products.length >= 5) { score += 5; details.push("Broad product line (5+)") }
  else if (products.length >= 3) { score += 3; details.push("Multiple products (3-4)") }
  else if (products.length >= 1) { score += 1; details.push("Single product listed") }

  return {
    score: Math.min(25, score),
    assessment: details.length > 0 ? details.join(" · ") : "No capacity data available",
  }
}

// ---- Main entry point ------------------------------------------------

const SCORERS: Record<ErsDimension, (input: ErsInput) => { score: number; assessment: string }> = {
  documentation: scoreDocumentation,
  compliance: scoreCompliance,
  exportHistory: scoreExportHistory,
  capacityVerified: scoreCapacity,
}

/**
 * Calculate the full ERS score for a client using all available data.
 *
 * @returns total score (0-100), per-dimension breakdown, and readiness level.
 */
export function calculateErs(input: ErsInput): ErsResult {
  const breakdown = {} as ErsBreakdown
  let total = 0

  for (const [dim, scorer] of Object.entries(SCORERS)) {
    const result = scorer(input)
    breakdown[dim as ErsDimension] = { score: result.score, max: 25, assessment: result.assessment }
    total += result.score
  }

  total = Math.round(total)

  const readinessLevel: ErsResult["readinessLevel"] =
    total >= 80 ? "export-ready" : total >= 50 ? "developing" : "needs-work"

  return { total, breakdown, readinessLevel }
}

/**
 * Serialise an ErsBreakdown to the JSON string stored in Client.ersBreakdown.
 */
export function serialiseBreakdown(breakdown: ErsBreakdown): string {
  return JSON.stringify(breakdown)
}

/**
 * Parse a stored JSON string back into an ErsBreakdown.
 */
export function parseBreakdown(json: string | null | undefined): ErsBreakdown | null {
  if (!json) return null
  try {
    return JSON.parse(json) as ErsBreakdown
  } catch {
    return null
  }
}

/**
 * Format a readiness level into a human-readable label.
 */
export function readinessLabel(level: ErsResult["readinessLevel"]): string {
  switch (level) {
    case "export-ready":
      return "Export Ready"
    case "developing":
      return "Developing"
    case "needs-work":
      return "Needs Work"
  }
}

/**
 * Get a Tailwind badge colour class for a readiness level.
 */
export function readinessBadgeColor(level: ErsResult["readinessLevel"]): string {
  switch (level) {
    case "export-ready":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-200"
    case "developing":
      return "bg-amber-500/10 text-amber-600 border-amber-200"
    case "needs-work":
      return "bg-red-500/10 text-red-600 border-red-200"
  }
}

// ---- Integration helpers (server-side) --------------------------------

/**
 * Recalculate the ERS score for a given client using live data from the database.
 * Call this after any compliance or product create/update/delete.
 */
export async function recalculateClientErs(clientId: string): Promise<ErsResult> {
  const { prisma } = await import("@/lib/db")

  const [complianceRecords, products, client] = await Promise.all([
    prisma.clientCompliance.findMany({ where: { clientId } }),
    prisma.clientProduct.findMany({ where: { clientId } }),
    prisma.client.findUnique({ where: { id: clientId } }),
  ])

  if (!client) {
    return { total: 0, breakdown: {} as ErsBreakdown, readinessLevel: "needs-work" }
  }

  const input: ErsInput = {
    complianceRecords: complianceRecords.map((r) => ({
      certificationType: r.certificationType,
      status: r.status as "obtained" | "in-progress" | "not-started" | "expired",
      expiresAt: r.expiresAt?.toISOString(),
    })),
    products: products.map((p) => ({
      certifications: p.certifications,
      exportVolume: p.exportVolume,
      unit: p.unit,
      pricing: p.pricing,
    })),
    client: {
      notes: client.notes,
      tier: client.tier,
      corridor: client.corridor,
      monthlyRetainer: client.monthlyRetainer,
    },
  }

  const result = calculateErs(input)

  await prisma.client.update({
    where: { id: clientId },
    data: {
      ersScore: result.total,
      ersBreakdown: serialiseBreakdown(result.breakdown),
    },
  })

  // Log an ERS snapshot for history tracking
  await prisma.ersSnapshot.create({
    data: {
      clientId,
      totalScore: result.total,
      breakdown: serialiseBreakdown(result.breakdown),
      readinessLevel: result.readinessLevel,
    },
  }).catch((e: unknown) => console.error("Failed to log ERS snapshot:", e))

  // Detect and log significant ERS changes
  if (client.ersBreakdown) {
    const { detectErsChange, logErsChangeEvent } = await import("@/lib/ers-notifications")
    const event = detectErsChange(clientId, client.name, result, client.ersBreakdown)
    if (event) {
      await logErsChangeEvent(event).catch((e: unknown) =>
        console.error("Failed to log ERS change event:", e)
      )
    }
  }

  return result
}
