import { describe, it, expect, vi, beforeEach } from "vitest"
import { qualifyLead } from "@/lib/qualify-lead"

// ── Integration-level tests for the qualifyLead function ──────────
// These test the scoring algorithm end-to-end, simulating how the API
// route (/api/leads/[id]/qualify) and hermes batch route use it.

describe("Lead Qualification Integration Flow", () => {
  it("returns tier + breakdown in addition to score and status", () => {
    const result = qualifyLead({
      industry: "Agriculture",
      country: "Kenya",
      phone: "+254700000000",
      email: "info@agrifarm.co.ke",
      notes: "Detailed notes about the lead that exceed 20 characters.",
      source: "referral",
    })

    // Core fields (always returned)
    expect(result).toHaveProperty("score")
    expect(result).toHaveProperty("status")
    expect(result).toHaveProperty("tier")
    expect(result).toHaveProperty("breakdown")

    // Score should be clamped 0-100
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it("qualifies a complete lead with all bonuses at 100 (clamped)", () => {
    const result = qualifyLead({
      industry: "Import/Export",
      country: "Kenya",
      phone: "+254700000000",
      whatsapp: "+254700000001",
      email: "ceo@company.co.ke",
      notes: "This lead has very detailed notes spanning way more than twenty characters.",
      source: "partner",
    })

    // 40 + 15 + 10 + 15 + 10 + 10 + 10(source quality) + 5(email quality) = 115 → clamped to 100
    expect(result.score).toBe(100)
    expect(result.status).toBe("qualified")
    expect(result.tier).toBe("hot")
    expect(result.breakdown.sourceQuality).toBe(10)
    expect(result.breakdown.emailQuality).toBe(5)
  })

  it("qualifies a minimal lead with exactly 60 (phone + email quality)", () => {
    const result = qualifyLead({
      phone: "+254700000000",
      email: "user@corporate.com",
    })

    // 40 + 15(phone) + 5(email quality) = 60
    expect(result.score).toBe(60)
    expect(result.status).toBe("qualified")
    expect(result.tier).toBe("qualified")
  })

  it("classifies a low-scoring lead as cold when heavily penalized by recency", () => {
    const result = qualifyLead({
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // 40 - 15(recency) = 25
    expect(result.score).toBe(25)
    expect(result.status).toBe("disqualified")
    expect(result.tier).toBe("cold")
  })

  it("returns breakdown matching the scoring formula for an empty lead", () => {
    const result = qualifyLead({})

    expect(result.breakdown).toEqual({
      base: 40,
      industry: 0,
      country: 0,
      contact: 0,
      notes: 0,
      source: 0,
      sourceQuality: 0,
      emailQuality: 0,
      recencyPenalty: 0,
    })
    expect(result.score).toBe(40)
    expect(result.tier).toBe("lukewarm")
  })

  it("returns breakdown with bonuses for a fully filled lead", () => {
    const result = qualifyLead({
      industry: "Tech",
      country: "Uganda",
      phone: "+256700000000",
      whatsapp: "+256700000001",
      email: "info@startup.ug",
      notes: "Detailed notes that are long enough for the bonus.",
      source: "conference",
    })

    expect(result.breakdown.industry).toBe(15)
    expect(result.breakdown.country).toBe(10)
    expect(result.breakdown.contact).toBe(15)
    expect(result.breakdown.notes).toBe(10)
    expect(result.breakdown.source).toBe(10)
    expect(result.breakdown.sourceQuality).toBe(10) // "conference" matches HIGH_QUALITY_SOURCES
    expect(result.breakdown.emailQuality).toBe(5) // "startup.ug" is not a free domain
    expect(result.breakdown.recencyPenalty).toBe(0)
  })

  it("applies recency penalty correctly for different age brackets", () => {
    const base = {
      industry: "Tech",
      country: "Kenya",
      phone: "+254700000000",
    }

    const fresh = qualifyLead(base)
    const weekOld = qualifyLead({ ...base, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() })
    const twoWeekOld = qualifyLead({ ...base, createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() })
    const monthOld = qualifyLead({ ...base, createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() })

    // Fresh: 40 + 15 + 10 + 15 = 80 (hot)
    expect(fresh.score).toBe(80)
    expect(fresh.tier).toBe("hot")

    // 7+ days: 80 - 5 = 75 (qualified)
    expect(weekOld.score).toBe(75)
    expect(weekOld.tier).toBe("qualified")

    // 14+ days: 80 - 10 = 70 (qualified)
    expect(twoWeekOld.score).toBe(70)
    expect(twoWeekOld.tier).toBe("qualified")

    // 30+ days: 80 - 15 = 65 (qualified)
    expect(monthOld.score).toBe(65)
    expect(monthOld.tier).toBe("qualified")
  })

  it("does not allow recency penalty to push score below 0", () => {
    const result = qualifyLead({
      createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // 40 - 15(recency max) = 25, clamped to 25 (not below 0 because we only penalize by 15 max)
    expect(result.score).toBe(25)
    expect(result.tier).toBe("cold")
  })

  it("handles null values gracefully (same as undefined)", () => {
    const result = qualifyLead({
      industry: null,
      country: null,
      phone: null,
      whatsapp: null,
      notes: null,
      source: null,
      email: null,
      createdAt: null,
    })

    expect(result.score).toBe(40)
    expect(result.breakdown).toEqual({
      base: 40,
      industry: 0,
      country: 0,
      contact: 0,
      notes: 0,
      source: 0,
      sourceQuality: 0,
      emailQuality: 0,
      recencyPenalty: 0,
    })
  })

  it("source quality bonus varies by source type", () => {
    const testSource = (source: string, expectedBonus: number) => {
      const result = qualifyLead({ source, phone: "+254700000000" })
      expect(result.breakdown.sourceQuality).toBe(expectedBonus)
    }

    testSource("referral", 10)
    testSource("partner", 10)
    testSource("conference", 10)
    testSource("warm-intro", 10)
    testSource("cold-outreach", 5)
    testSource("inbound", 5)
    testSource("linkedin", 5)
    testSource("social-media", 5)
    testSource("website", 2)
    testSource("seo", 2)
    testSource("google", 2)
    testSource("organic", 2)
    testSource("landing-page", 2)
    testSource("unknown-source", 0)
    testSource("", 0)
  })

  it("email quality bonus validates professional vs free domains", () => {
    const testEmail = (email: string | null, expectedBonus: number) => {
      const result = qualifyLead({ email, phone: "+254700000000" })
      expect(result.breakdown.emailQuality).toBe(expectedBonus)
    }

    testEmail("user@gmail.com", 0)
    testEmail("user@yahoo.com", 0)
    testEmail("user@hotmail.com", 0)
    testEmail("user@outlook.com", 0)
    testEmail("user@icloud.com", 0)
    testEmail("user@protonmail.com", 0)
    testEmail("user@company.co.ke", 5)
    testEmail("user@corporate.org", 5)
    testEmail("ceo@startup.io", 5)
    testEmail("info@business.africa", 5)
    testEmail(null, 0)
    testEmail("invalid", 0)
  })

  it("conversion from lead status matches score for the API route pattern", () => {
    // This mirrors exactly how the API route uses qualifyLead:
    // const { score, status, tier, breakdown } = qualifyLead(existing)
    // lead.update({ data: { qualificationScore: score, status, qualificationTier: tier } })
    // return { ...lead, qualificationTier: tier, qualificationBreakdown: breakdown }

    const input = {
      companyName: "Test Corp" as string | null,
      contactName: "John" as string | null,
      email: "john@test.com" as string | null,
      industry: "Agriculture",
      country: "Kenya",
      phone: "+254700000000",
      whatsapp: null as string | null,
      notes: "Very detailed notes about the lead which qualifies for the long notes bonus.",
      source: "referral",
      createdAt: new Date().toISOString(),
    }

    const { score, status, tier } = qualifyLead(input)

    // Score is used to set qualificationScore in DB
    expect(score).toBe(100) // clamped

    // Status determines the lead status
    expect(status).toBe("qualified")

    // Tier is stored in qualificationTier field
    expect(tier).toBe("hot")
  })
})
