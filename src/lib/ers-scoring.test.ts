import { describe, it, expect } from "vitest"
import { calculateErs, parseBreakdown, serialiseBreakdown, readinessLabel, readinessBadgeColor, type ErsInput } from "./ers-scoring"

describe("calculateErs", () => {
  // ---- Empty / No Data ----
  it("returns 0 with 'needs-work' for empty input", () => {
    const result = calculateErs({})
    expect(result.total).toBe(0)
    expect(result.readinessLevel).toBe("needs-work")
    expect(result.breakdown.documentation.score).toBe(0)
    expect(result.breakdown.compliance.score).toBe(0)
    expect(result.breakdown.exportHistory.score).toBe(0)
    expect(result.breakdown.capacityVerified.score).toBe(0)
  })

  // ---- Documentation ----
  it("scores documentation 25 when 2+ import certs obtained", () => {
    const input: ErsInput = {
      complianceRecords: [
        { certificationType: "korean-import", status: "obtained" },
        { certificationType: "phytosanitary", status: "obtained" },
      ],
    }
    const result = calculateErs(input)
    expect(result.breakdown.documentation.score).toBe(25)
    expect(result.breakdown.documentation.assessment).toContain("Full documentation")
  })

  it("scores documentation 18 when 1 import cert obtained", () => {
    const input: ErsInput = {
      complianceRecords: [
        { certificationType: "korean-import", status: "obtained" },
      ],
    }
    const result = calculateErs(input)
    expect(result.breakdown.documentation.score).toBe(18)
  })

  it("scores documentation 8 when 1 cert in-progress", () => {
    const input: ErsInput = {
      complianceRecords: [
        { certificationType: "phytosanitary", status: "in-progress" },
      ],
    }
    const result = calculateErs(input)
    expect(result.breakdown.documentation.score).toBe(8)
  })

  it("scores documentation 0 when no doc certs present", () => {
    const input: ErsInput = {
      complianceRecords: [
        { certificationType: "haccp", status: "obtained" },
      ],
    }
    const result = calculateErs(input)
    // haccp is compliance, not documentation
    expect(result.breakdown.documentation.score).toBe(0)
  })

  // ---- Compliance ----
  it("scores compliance 25 when 3+ quality certs obtained with 60%+ rate", () => {
    const input: ErsInput = {
      complianceRecords: [
        { certificationType: "haccp", status: "obtained" },
        { certificationType: "halal", status: "obtained" },
        { certificationType: "organic", status: "obtained" },
        { certificationType: "gots", status: "not-started" },
      ],
    }
    const result = calculateErs(input)
    expect(result.breakdown.compliance.score).toBe(25)
    expect(result.breakdown.compliance.assessment).toContain("Strong compliance")
  })

  it("deducts points for expired certs", () => {
    const input: ErsInput = {
      complianceRecords: [
        { certificationType: "haccp", status: "obtained" },
        { certificationType: "halal", status: "obtained" },
        { certificationType: "organic", status: "obtained" },
        { certificationType: "gots", status: "expired" },
      ],
    }
    const result = calculateErs(input)
    // 25 - 3 (expired deduction) = 22
    expect(result.breakdown.compliance.score).toBe(22)
  })

  it("falls back to product certifications when no compliance records", () => {
    const input: ErsInput = {
      products: [
        { certifications: "HACCP, Halal, Organic" },
      ],
    }
    const result = calculateErs(input)
    expect(result.breakdown.compliance.score).toBeGreaterThanOrEqual(10)
    expect(result.breakdown.compliance.assessment).toContain("certifications listed")
  })

  it("scores compliance 0 when no records and no product certs", () => {
    const result = calculateErs({ products: [{ certifications: "" }] })
    expect(result.breakdown.compliance.score).toBe(0)
  })

  // ---- Export History ----
  it("scores export history 25 for high-volume diverse exporter", () => {
    const input: ErsInput = {
      products: [
        { exportVolume: "200000", unit: "kg/month", pricing: "$8.50/kg FOB" },
        { exportVolume: "150000", unit: "kg/month", pricing: "$3.20/kg FOB" },
        { exportVolume: "120000", unit: "kg/month", pricing: "$5.00/kg FOB" },
      ],
    }
    const result = calculateErs(input)
    // 15 (high volume ≥100k) + 5 (3 products) + 5 (pricing) = 25
    expect(result.breakdown.exportHistory.score).toBe(25)
  })

  it("handles ton-based volume conversion", () => {
    const input: ErsInput = {
      products: [
        { exportVolume: "10", unit: "tons/month", pricing: "$1000/ton" },
      ],
    }
    const result = calculateErs(input)
    // 10 tons = 10000 kg → mid-volume (12) + pricing (5) = 17
    expect(result.breakdown.exportHistory.score).toBeGreaterThanOrEqual(12)
  })

  it("scores 0 for empty products with no export hints", () => {
    const result = calculateErs({ products: [] })
    expect(result.breakdown.exportHistory.score).toBe(0)
  })

  it("scores 5 when client notes mention export activity", () => {
    const input: ErsInput = {
      client: { notes: "Leading exporter of coffee to EU markets" },
      products: [],
    }
    const result = calculateErs(input)
    expect(result.breakdown.exportHistory.score).toBe(5)
  })

  // ---- Capacity Verified ----
  it("scores capacity 25 for enterprise tier with retainer and corridor", () => {
    const input: ErsInput = {
      client: { tier: "enterprise", monthlyRetainer: 2500, corridor: "korea-africa" },
      products: [{}, {}, {}, {}, {}], // 5 products
    }
    const result = calculateErs(input)
    // 10 (enterprise) + 5 (retainer) + 5 (corridor) + 5 (5+ products) = 25
    expect(result.breakdown.capacityVerified.score).toBe(25)
  })

  it("scores capacity 0 with no data", () => {
    const result = calculateErs({})
    expect(result.breakdown.capacityVerified.score).toBe(0)
  })

  // ---- Readiness Levels ----
  it("labels 80+ as export-ready", () => {
    const input: ErsInput = {
      complianceRecords: [
        { certificationType: "korean-import", status: "obtained" },
        { certificationType: "phytosanitary", status: "obtained" },
        { certificationType: "haccp", status: "obtained" },
        { certificationType: "halal", status: "obtained" },
        { certificationType: "organic", status: "obtained" },
      ],
      products: [
        { exportVolume: "50000", unit: "kg/month", pricing: "$8.50/kg" },
        { exportVolume: "20000", unit: "kg/month", pricing: "$3.20/kg" },
        { exportVolume: "10000", unit: "kg/month", pricing: "$5.00/kg" },
      ],
      client: { tier: "enterprise", monthlyRetainer: 2500, corridor: "korea-africa" },
    }
    const result = calculateErs(input)
    expect(result.total).toBeGreaterThanOrEqual(80)
    expect(result.readinessLevel).toBe("export-ready")
  })

  it("labels 50-79 as developing", () => {
    const input: ErsInput = {
      complianceRecords: [
        { certificationType: "haccp", status: "obtained" },
        { certificationType: "halal", status: "obtained" },
        { certificationType: "organic", status: "obtained" },
        { certificationType: "korean-import", status: "in-progress" },
      ],
      products: [
        { exportVolume: "20000", unit: "kg/month", pricing: "$5.00/kg" },
        { exportVolume: "5000", unit: "kg/month", pricing: "$3.00/kg" },
      ],
      client: { tier: "growth", monthlyRetainer: 1150, corridor: "korea-africa" },
    }
    const result = calculateErs(input)
    expect(result.total).toBeGreaterThanOrEqual(50)
    expect(result.total).toBeLessThan(80)
    expect(result.readinessLevel).toBe("developing")
  })

  it("labels < 50 as needs-work", () => {
    const result = calculateErs({})
    expect(result.total).toBeLessThan(50)
    expect(result.readinessLevel).toBe("needs-work")
  })
})

// ---- Helper functions ----
describe("serialiseBreakdown / parseBreakdown", () => {
  it("round-trips an ErsBreakdown", () => {
    const result = calculateErs({})
    const json = serialiseBreakdown(result.breakdown)
    const parsed = parseBreakdown(json)
    expect(parsed).not.toBeNull()
    expect(parsed!.documentation.score).toBe(0)
  })

  it("returns null for null/undefined input", () => {
    expect(parseBreakdown(null)).toBeNull()
    expect(parseBreakdown(undefined)).toBeNull()
  })

  it("returns null for invalid JSON", () => {
    expect(parseBreakdown("not-json")).toBeNull()
  })
})

describe("readinessLabel", () => {
  it("returns correct labels", () => {
    expect(readinessLabel("export-ready")).toBe("Export Ready")
    expect(readinessLabel("developing")).toBe("Developing")
    expect(readinessLabel("needs-work")).toBe("Needs Work")
  })
})

describe("readinessBadgeColor", () => {
  it("returns Tailwind class for each level", () => {
    expect(readinessBadgeColor("export-ready")).toContain("emerald")
    expect(readinessBadgeColor("developing")).toContain("amber")
    expect(readinessBadgeColor("needs-work")).toContain("red")
  })
})
