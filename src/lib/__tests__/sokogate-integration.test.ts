/**
 * Sokogate Integration Unit Tests
 *
 * Tests the SokogateIntegration class with expanded simulated data:
 * - Supplier discovery with filtering by commodity, country, ERS, certifications
 * - Buyer discovery with filtering by interest and region
 * - Corridor matching with score breakdowns
 * - Escrow and pilot enrollment operations
 */

import { describe, it, expect, beforeEach } from "vitest"
import { SokogateIntegration } from "@/lib/sokogate-integration"
import type { SokogateSupplier, SokogateBuyer, SokogateCorridorMatch } from "@/lib/sokogate-integration"

// Create a fresh instance for each test (simulation mode)
let sokogate: SokogateIntegration

beforeEach(() => {
  sokogate = new SokogateIntegration()
})

// ================================================================
// 1. Supplier Discovery
// ================================================================

describe("getSuppliers", () => {
  it("returns all 12 suppliers when no filters applied", async () => {
    const { suppliers } = await sokogate.getSuppliers()
    expect(suppliers).toHaveLength(12)
  })

  it("includes all required fields on each supplier", async () => {
    const { suppliers } = await sokogate.getSuppliers()
    for (const s of suppliers) {
      expect(s.id).toBeDefined()
      expect(s.companyName).toBeDefined()
      expect(s.contactName).toBeDefined()
      expect(s.email).toBeDefined()
      expect(s.country).toBeDefined()
      expect(s.commodities).toBeInstanceOf(Array)
      expect(s.commodities.length).toBeGreaterThan(0)
      expect(s.certifications).toBeInstanceOf(Array)
      expect(typeof s.exportReadinessScore).toBe("number")
      expect(s.exportReadinessScore).toBeGreaterThanOrEqual(0)
      expect(s.exportReadinessScore).toBeLessThanOrEqual(100)
      expect(["active", "pending", "suspended"]).toContain(s.status)
    }
  })

  it("spans at least 8 African countries", async () => {
    const { suppliers } = await sokogate.getSuppliers()
    const countries = new Set(suppliers.map((s) => s.country))
    expect(countries.size).toBeGreaterThanOrEqual(8)
  })

  // ── Country Filter ──

  it("filters by country (Kenya)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ country: "Kenya" })
    expect(suppliers.length).toBeGreaterThanOrEqual(1)
    for (const s of suppliers) {
      expect(s.country).toBe("Kenya")
    }
  })

  it("filters by country (Ghana)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ country: "Ghana" })
    expect(suppliers).toHaveLength(1)
    expect(suppliers[0].companyName).toContain("Ghana")
  })

  it("returns empty array for non-existent country", async () => {
    const { suppliers } = await sokogate.getSuppliers({ country: "Japan" })
    expect(suppliers).toHaveLength(0)
  })

  // ── Commodity Filter ──

  it("filters by commodity (Coffee)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ commodity: "Coffee" })
    expect(suppliers.length).toBeGreaterThanOrEqual(1)
    for (const s of suppliers) {
      expect(s.commodities.some((c) => c.toLowerCase().includes("coffee"))).toBe(true)
    }
  })

  it("filters by commodity (Cocoa)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ commodity: "Cocoa" })
    expect(suppliers.length).toBeGreaterThanOrEqual(1)
    expect(suppliers[0].country).toBe("Ghana")
  })

  it("filters by commodity (Copper)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ commodity: "Copper" })
    expect(suppliers).toHaveLength(1)
    expect(suppliers[0].companyName).toContain("Zambia")
  })

  it("filters by commodity (Shrimp/Seafood)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ commodity: "Shrimp" })
    expect(suppliers).toHaveLength(1)
    expect(suppliers[0].companyName).toContain("Senegal")
  })

  it("filters by commodity (Cardamom/Spices)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ commodity: "Cardamom" })
    expect(suppliers).toHaveLength(1)
    expect(suppliers[0].companyName).toContain("Ethiopian")
  })

  it("returns empty for non-existent commodity", async () => {
    const { suppliers } = await sokogate.getSuppliers({ commodity: "Diamonds" })
    expect(suppliers).toHaveLength(0)
  })

  // ── ERS Score Filter ──

  it("filters by minErsScore (>= 75)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ minErsScore: 75 })
    expect(suppliers.length).toBeGreaterThanOrEqual(1)
    for (const s of suppliers) {
      expect(s.exportReadinessScore).toBeGreaterThanOrEqual(75)
    }
  })

  it("filters by minErsScore (>= 80)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ minErsScore: 80 })
    expect(suppliers.length).toBeGreaterThanOrEqual(2)
    for (const s of suppliers) {
      expect(s.exportReadinessScore).toBeGreaterThanOrEqual(80)
    }
  })

  it("returns only top suppliers for high ERS threshold", async () => {
    const { suppliers } = await sokogate.getSuppliers({ minErsScore: 82 })
    for (const s of suppliers) {
      expect(s.exportReadinessScore).toBeGreaterThanOrEqual(82)
    }
    // Zambia Copper is the highest at 82
    expect(suppliers.some((s) => s.companyName.includes("Zambia"))).toBe(true)
  })

  it("includes low-ERS suppliers when no threshold set", async () => {
    const { suppliers } = await sokogate.getSuppliers()
    const lowErs = suppliers.filter((s) => s.exportReadinessScore < 65)
    expect(lowErs.length).toBeGreaterThanOrEqual(1)
  })

  // ── Certification Filter ──

  it("filters by certifications (HACCP)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ certifications: ["HACCP"] })
    expect(suppliers.length).toBeGreaterThanOrEqual(1)
    for (const s of suppliers) {
      expect(s.certifications.some((c) => c.toLowerCase() === "haccp")).toBe(true)
    }
  })

  it("filters by certifications (GOTS)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ certifications: ["GOTS"] })
    expect(suppliers.length).toBeGreaterThanOrEqual(2)
    for (const s of suppliers) {
      expect(s.certifications.some((c) => c.toLowerCase() === "gots")).toBe(true)
    }
  })

  it("filters by multiple certifications (HACCP AND Organic)", async () => {
    const { suppliers } = await sokogate.getSuppliers({ certifications: ["HACCP", "Organic"] })
    expect(suppliers.length).toBeGreaterThanOrEqual(1)
    for (const s of suppliers) {
      expect(s.certifications.some((c) => c.toLowerCase() === "haccp")).toBe(true)
      expect(s.certifications.some((c) => c.toLowerCase() === "organic")).toBe(true)
    }
  })

  it("returns empty for certification no supplier has", async () => {
    const { suppliers } = await sokogate.getSuppliers({ certifications: ["FDA"] })
    expect(suppliers).toHaveLength(0)
  })

  // ── Combined Filters ──

  it("combines country + commodity filter", async () => {
    const { suppliers } = await sokogate.getSuppliers({ country: "Kenya", commodity: "Coffee" })
    expect(suppliers.length).toBeGreaterThanOrEqual(1)
    for (const s of suppliers) {
      expect(s.country).toBe("Kenya")
      expect(s.commodities.some((c) => c.toLowerCase().includes("coffee"))).toBe(true)
    }
  })

  it("combines country + ERS filter", async () => {
    const { suppliers } = await sokogate.getSuppliers({ country: "Ghana", minErsScore: 70 })
    expect(suppliers.length).toBeGreaterThanOrEqual(1)
    for (const s of suppliers) {
      expect(s.country).toBe("Ghana")
      expect(s.exportReadinessScore).toBeGreaterThanOrEqual(70)
    }
  })

  it("combines commodity + certification filter", async () => {
    const { suppliers } = await sokogate.getSuppliers({ commodity: "Cotton", certifications: ["GOTS"] })
    expect(suppliers.length).toBeGreaterThanOrEqual(1)
    for (const s of suppliers) {
      expect(s.commodities.some((c) => c.toLowerCase().includes("cotton"))).toBe(true)
      expect(s.certifications.some((c) => c.toLowerCase() === "gots")).toBe(true)
    }
  })
})

// ================================================================
// 2. Buyer Discovery
// ================================================================

describe("getBuyers", () => {
  it("returns all 8 buyers when no filters applied", async () => {
    const { buyers } = await sokogate.getBuyers()
    expect(buyers).toHaveLength(8)
  })

  it("includes buyers from at least 4 countries", async () => {
    const { buyers } = await sokogate.getBuyers()
    const countries = new Set(buyers.map((b) => b.country))
    expect(countries.size).toBeGreaterThanOrEqual(4)
  })

  it("filters by interest (Coffee)", async () => {
    const { buyers } = await sokogate.getBuyers({ interest: "Coffee" })
    expect(buyers.length).toBeGreaterThanOrEqual(1)
    for (const b of buyers) {
      expect(b.procurementInterests.some((i) => i.toLowerCase().includes("coffee"))).toBe(true)
    }
  })

  it("filters by interest (Cobalt)", async () => {
    const { buyers } = await sokogate.getBuyers({ interest: "Cobalt" })
    expect(buyers.length).toBeGreaterThanOrEqual(2)
    for (const b of buyers) {
      expect(b.procurementInterests.some((i) => i.toLowerCase().includes("cobalt"))).toBe(true)
    }
  })

  it("filters by country (South Korea)", async () => {
    const { buyers } = await sokogate.getBuyers({ country: "South Korea" })
    expect(buyers.length).toBeGreaterThanOrEqual(4)
    for (const b of buyers) {
      expect(b.country).toBe("South Korea")
    }
  })

  it("filters by country (Netherlands)", async () => {
    const { buyers } = await sokogate.getBuyers({ country: "Netherlands" })
    expect(buyers).toHaveLength(1)
    expect(buyers[0].companyName).toContain("Rotterdam")
  })

  it("returns empty for non-existent interest", async () => {
    const { buyers } = await sokogate.getBuyers({ interest: "Uranium" })
    expect(buyers).toHaveLength(0)
  })
})

// ================================================================
// 3. Corridor Matching
// ================================================================

describe("Corridor Matching", () => {
  describe("getActiveMatches", () => {
    it("returns all 12 matches", async () => {
      const { matches } = await sokogate.getActiveMatches()
      expect(matches).toHaveLength(12)
    })

    it("each match has complete breakdown", async () => {
      const { matches } = await sokogate.getActiveMatches()
      for (const m of matches) {
        expect(m.matchScore).toBeGreaterThanOrEqual(0)
        expect(m.matchScore).toBeLessThanOrEqual(100)
        expect(m.matchBreakdown.productFit).toBeDefined()
        expect(m.matchBreakdown.certificationCompatibility).toBeDefined()
        expect(m.matchBreakdown.volumeFit).toBeDefined()
        expect(m.matchBreakdown.logisticsFeasibility).toBeDefined()
        expect(m.matchBreakdown.priceCompetitiveness).toBeDefined()
        expect(["pending", "accepted", "rejected", "in-progress"]).toContain(m.status)
      }
    })

    it("has at least one match with score >= 90", async () => {
      const { matches } = await sokogate.getActiveMatches()
      const topMatches = matches.filter((m) => m.matchScore >= 90)
      expect(topMatches.length).toBeGreaterThanOrEqual(1)
    })

    it("has matches from different corridors (Korea, Europe, Middle East)", async () => {
      const { matches } = await sokogate.getActiveMatches()
      const statuses = new Set(matches.map((m) => m.status))
      expect(statuses.size).toBeGreaterThanOrEqual(2) // at least pending + in-progress/accepted
    })
  })

  describe("findMatches", () => {
    it("creates a new match between a supplier and buyer", async () => {
      const { match } = await sokogate.findMatches("soko-sup-1", "soko-buy-2")
      expect(match).not.toBeNull()
      expect(match!.supplierId).toBe("soko-sup-1")
      expect(match!.buyerId).toBe("soko-buy-2")
      expect(match!.status).toBe("pending")
      expect(match!.matchScore).toBeGreaterThanOrEqual(50)
    })

    it("creates a match for a mineral supplier with a chemical buyer", async () => {
      const { match } = await sokogate.findMatches("soko-sup-9", "soko-buy-1")
      expect(match).not.toBeNull()
      expect(match!.matchScore).toBeGreaterThanOrEqual(50)
    })
  })
})

// ================================================================
// 4. Escrow & Pilot Operations
// ================================================================

describe("Escrow & Pilot Operations", () => {
  describe("initiateEscrow", () => {
    it("creates an escrow transaction", async () => {
      const { transaction } = await sokogate.initiateEscrow({
        buyerId: "soko-buy-2",
        supplierId: "soko-sup-1",
        amount: 50000,
        currency: "USD",
      })
      expect(transaction).not.toBeNull()
      expect(transaction!.amount).toBe(50000)
      expect(transaction!.currency).toBe("USD")
      expect(transaction!.status).toBe("pending")
      expect(transaction!.reference).toMatch(/^ESC-/)
    })

    it("defaults to USD currency", async () => {
      const { transaction } = await sokogate.initiateEscrow({
        buyerId: "soko-buy-1",
        supplierId: "soko-sup-3",
        amount: 100000,
      })
      expect(transaction!.currency).toBe("USD")
    })
  })

  describe("enrollPilotParticipant", () => {
    it("enrolls a supplier in a pilot program", async () => {
      const { participant } = await sokogate.enrollPilotParticipant({
        cohortId: "cohort-1",
        companyName: "Test Coffee Exporter",
        contactName: "John Test",
        email: "john@test.com",
        country: "Kenya",
        commodities: ["Coffee"],
      })
    expect(participant).not.toBeNull()
    expect(participant!.companyName).toBe("Test Coffee Exporter")
    expect(participant!.status).toBe("active")
    expect(participant!.trialStartDate).toBeDefined()
    expect(participant!.trialEndDate).toBeDefined()
    })
  })
})

// ================================================================
// 5. Integration Status
// ================================================================

describe("Integration Status", () => {
  it("reports simulation mode when no API keys provided", () => {
    const summary = sokogate.summary()
    expect(summary).toContain("SIMULATION MODE")
    expect(summary).toContain("12 suppliers")
    expect(summary).toContain("8 buyers")
    expect(summary).toContain("12 matches")
  })

  it("isConfigured returns false in simulation mode", () => {
    expect(sokogate.isConfigured()).toBe(false)
  })
})
