import { describe, it, expect } from "vitest"
import { qualifyLead } from "@/lib/qualify-lead"

describe("Lead Qualification Scoring", () => {
  it("scores 40 for a bare-minimum lead (no extras)", () => {
    const result = qualifyLead({})
    expect(result.score).toBe(40)
    expect(result.status).toBe("disqualified")
    expect(result.tier).toBe("lukewarm")
  })

  it("scores 55 with industry (+15) only — still disqualified", () => {
    const result = qualifyLead({ industry: "Agriculture" })
    expect(result.score).toBe(55)
    expect(result.status).toBe("disqualified")
    expect(result.tier).toBe("lukewarm")
  })

  it("scores 80 and qualifies with industry + country + phone", () => {
    const result = qualifyLead({
      industry: "Technology",
      country: "Kenya",
      phone: "+254712345678",
    })
    expect(result.score).toBe(80) // Base 40 + industry 15 + country 10 + phone 15 = 80
    expect(result.status).toBe("qualified")
    expect(result.tier).toBe("hot")
  })

  it("scores 100 with all basic fields filled", () => {
    const result = qualifyLead({
      industry: "Import/Export",
      country: "Kenya",
      phone: "+254712345678",
      whatsapp: "+254712345678",
      notes: "This is a detailed note about the lead that exceeds twenty characters.",
      source: "Website",
    })
    expect(result.score).toBe(100) // 40 + 15 + 10 + 15 + 10 + 10 = 100
    expect(result.status).toBe("qualified")
    expect(result.tier).toBe("hot")
  })

  it("qualifies at the threshold (65 points)", () => {
    const result = qualifyLead({
      phone: "+254712345678",
      country: "Uganda",
    })
    expect(result.score).toBe(65) // 40 + 15 + 10 = 65
    expect(result.status).toBe("qualified")
    expect(result.tier).toBe("qualified")
  })

  // ── Source Quality ─────────────────────────────────────────

  it("adds +10 source quality bonus for referral sources", () => {
    const result = qualifyLead({
      phone: "+254712345678",
      country: "Kenya",
      source: "referral",
    })
    // Base 40 + phone 15 + country 10 + source 10 + source quality (referral) 10 = 85
    expect(result.score).toBe(85)
    expect(result.breakdown.sourceQuality).toBe(10)
  })

  it("adds +5 source quality bonus for inbound sources", () => {
    const result = qualifyLead({
      phone: "+254712345678",
      source: "cold-outreach",
    })
    // 40 + 15(phone) + 10(source) + 5(source quality) = 70
    expect(result.score).toBe(70)
    expect(result.breakdown.sourceQuality).toBe(5)
  })

  it("adds +2 source quality bonus for website sources", () => {
    const result = qualifyLead({
      phone: "+254712345678",
      source: "website",
    })
    // 40 + 15(phone) + 10(source) + 2(source quality) = 67
    expect(result.score).toBe(67)
    expect(result.breakdown.sourceQuality).toBe(2)
  })

  // ── Email Quality ──────────────────────────────────────────

  it("adds +5 email quality bonus for professional email domains", () => {
    const result = qualifyLead({
      phone: "+254712345678",
      email: "jane@acmecorp.co.ke",
    })
    // 40 + 15(phone) + 5(email quality) = 60
    expect(result.score).toBe(60)
    expect(result.status).toBe("qualified")
    expect(result.breakdown.emailQuality).toBe(5)
  })

  it("gives no email bonus for free email domains (gmail.com)", () => {
    const result = qualifyLead({
      phone: "+254712345678",
      email: "jane@gmail.com",
    })
    expect(result.score).toBe(55) // 40 + 15(phone) = 55, no email bonus
    expect(result.breakdown.emailQuality).toBe(0)
  })

  it("gives no email bonus for free email domains (yahoo.com)", () => {
    const result = qualifyLead({
      phone: "+254712345678",
      email: "jane@yahoo.com",
    })
    expect(result.score).toBe(55)
    expect(result.breakdown.emailQuality).toBe(0)
  })

  it("handles email with no domain gracefully", () => {
    const result = qualifyLead({
      phone: "+254712345678",
      email: "invalid",
    })
    expect(result.breakdown.emailQuality).toBe(0)
  })

  // ── Recency Decay ─────────────────────────────────────────

  it("penalizes -5 for leads older than 7 days", () => {
    const result = qualifyLead({
      phone: "+254712345678",
      country: "Kenya",
      source: "referral",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    })
    // 40 + 15(phone) + 10(country) + 10(source) + 10(source quality) - 5(recency) = 80
    expect(result.score).toBe(80)
    expect(result.breakdown.recencyPenalty).toBe(5)
  })

  it("penalizes -10 for leads older than 14 days", () => {
    const result = qualifyLead({
      phone: "+254712345678",
      country: "Kenya",
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    })
    // 40 + 15(phone) + 10(country) - 10(recency) = 55
    expect(result.score).toBe(55)
    expect(result.breakdown.recencyPenalty).toBe(10)
  })

  it("penalizes -15 for leads older than 30 days", () => {
    const result = qualifyLead({
      phone: "+254712345678",
      country: "Kenya",
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    })
    // 40 + 15(phone) + 10(country) - 15(recency) = 50
    expect(result.score).toBe(50)
    expect(result.breakdown.recencyPenalty).toBe(15)
  })

  // ── Tier Classification ────────────────────────────────────

  it("classifies 80+ as 'hot'", () => {
    const result = qualifyLead({ industry: "Tech", country: "Kenya", phone: "+254712345678" })
    expect(result.score).toBe(80)
    expect(result.tier).toBe("hot")
  })

  it("classifies 60-79 as 'qualified'", () => {
    const result = qualifyLead({ phone: "+254712345678", country: "Kenya" })
    expect(result.score).toBe(65)
    expect(result.tier).toBe("qualified")
  })

  it("classifies 40-59 as 'lukewarm'", () => {
    const result = qualifyLead({ industry: "Agriculture" })
    expect(result.score).toBe(55)
    expect(result.tier).toBe("lukewarm")
  })

  it("classifies sub-40 as 'cold' when heavily penalized", () => {
    const result = qualifyLead({
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    })
    // 40 - 15(recency) = 25
    expect(result.score).toBe(25)
    expect(result.tier).toBe("cold")
  })

  // ── Score Clamping ─────────────────────────────────────────

  it("clamps score to minimum 0", () => {
    const result = qualifyLead({
      createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    })
    // 40 - 15(max recency) = 25, not below 0
    expect(result.score).toBe(25)
  })

  // ── Breakdown Shape ────────────────────────────────────────

  it("returns the full breakdown object", () => {
    const result = qualifyLead({
      industry: "Agriculture",
      country: "Kenya",
      phone: "+254700000000",
      whatsapp: "+254700000001",
      notes: "This is a long note that qualifies for the notes bonus.",
      source: "referral",
      email: "john@company.com",
    })
    expect(result.breakdown).toEqual({
      base: 40,
      industry: 15,
      country: 10,
      contact: 15,
      notes: 10,
      source: 10,
      sourceQuality: 10,
      emailQuality: 5,
      recencyPenalty: 0,
    })
    // 40 + 15 + 10 + 15 + 10 + 10 + 10 + 5 = 115, clamped to 100
    expect(result.score).toBe(100)
    expect(result.tier).toBe("hot")
  })
})
