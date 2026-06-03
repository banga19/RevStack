import { describe, it, expect } from "vitest"
import {
  TIERS,
  BUDGET_TO_TIER,
  BUDGET_TO_PRICE,
  getTierFromBudget,
  getPriceFromBudget,
  getTier,
  suggestTierFromOnboarding,
  getSuggestionFromBudget,
} from "./pricing"

describe("TIERS", () => {
  it("defines starter tier at $50/mo", () => {
    expect(TIERS.starter.monthlyPrice).toBe(50)
    expect(TIERS.starter.name).toBe("Starter")
  })

  it("defines growth tier at $200/mo", () => {
    expect(TIERS.growth.monthlyPrice).toBe(200)
    expect(TIERS.growth.name).toBe("Growth")
  })

  it("defines enterprise tier at $500/mo", () => {
    expect(TIERS.enterprise.monthlyPrice).toBe(500)
    expect(TIERS.enterprise.name).toBe("Enterprise")
  })

  it("has all tiers with consistent yearly pricing (2 months free)", () => {
    for (const [id, tier] of Object.entries(TIERS)) {
      const expectedYearly = tier.monthlyPrice * 12 - tier.monthlyPrice * 2
      expect(tier.yearlyPrice).toBe(expectedYearly)
    }
  })
})

describe("BUDGET_TO_TIER", () => {
  it("maps under-1000 to starter", () => {
    expect(BUDGET_TO_TIER["under-1000"]).toBe("starter")
  })

  it("maps 1000-2500 to growth", () => {
    expect(BUDGET_TO_TIER["1000-2500"]).toBe("growth")
  })

  it("maps 2500-5000 to enterprise", () => {
    expect(BUDGET_TO_TIER["2500-5000"]).toBe("enterprise")
  })

  it("maps 5000-10000 to enterprise", () => {
    expect(BUDGET_TO_TIER["5000-10000"]).toBe("enterprise")
  })

  it("maps 10000+ to enterprise", () => {
    expect(BUDGET_TO_TIER["10000+"]).toBe("enterprise")
  })

  it("maps not-sure to starter", () => {
    expect(BUDGET_TO_TIER["not-sure"]).toBe("starter")
  })
})

describe("BUDGET_TO_PRICE", () => {
  it("matches prices to tiers consistently", () => {
    // Every budget range's price must match its tier's monthly price
    for (const [budget, price] of Object.entries(BUDGET_TO_PRICE)) {
      const tierId = BUDGET_TO_TIER[budget]
      const tier = TIERS[tierId]
      expect(price).toBe(tier.monthlyPrice)
    }
  })
})

describe("getTierFromBudget", () => {
  it("returns starter for under-1000", () => {
    expect(getTierFromBudget("under-1000")).toBe("starter")
  })

  it("returns growth for 1000-2500", () => {
    expect(getTierFromBudget("1000-2500")).toBe("growth")
  })

  it("returns enterprise for 2500-5000", () => {
    expect(getTierFromBudget("2500-5000")).toBe("enterprise")
  })

  it("returns starter as default for unknown budget", () => {
    expect(getTierFromBudget("unknown-budget")).toBe("starter")
  })

  it("returns starter for empty string", () => {
    expect(getTierFromBudget("")).toBe("starter")
  })
})

describe("getPriceFromBudget", () => {
  it("returns 50 for under-1000", () => {
    expect(getPriceFromBudget("under-1000")).toBe(50)
  })

  it("returns 200 for 1000-2500", () => {
    expect(getPriceFromBudget("1000-2500")).toBe(200)
  })

  it("returns 500 for enterprise tiers", () => {
    expect(getPriceFromBudget("2500-5000")).toBe(500)
    expect(getPriceFromBudget("5000-10000")).toBe(500)
    expect(getPriceFromBudget("10000+")).toBe(500)
  })

  it("returns 50 as default for unknown budget", () => {
    expect(getPriceFromBudget("unknown")).toBe(50)
  })

  it("returns 50 for empty string", () => {
    expect(getPriceFromBudget("")).toBe(50)
  })
})

describe("getTier", () => {
  it("returns starter definition", () => {
    const tier = getTier("starter")
    expect(tier).toBeDefined()
    expect(tier!.monthlyPrice).toBe(50)
  })

  it("returns growth definition", () => {
    const tier = getTier("growth")
    expect(tier).toBeDefined()
    expect(tier!.monthlyPrice).toBe(200)
  })

  it("returns enterprise definition", () => {
    const tier = getTier("enterprise")
    expect(tier).toBeDefined()
    expect(tier!.monthlyPrice).toBe(500)
  })

  it("returns undefined for unknown tier", () => {
    expect(getTier("nonexistent")).toBeUndefined()
  })
})

describe("suggestTierFromOnboarding", () => {
  it("uses budget range as primary signal", () => {
    const result = suggestTierFromOnboarding({ budgetRange: "under-1000" })
    expect(result.tierId).toBe("starter")
    expect(result.confidence).toBe("high")
    expect(result.reasoning).toContain("budget range")
  })

  it("suggests growth for 1000-2500 budget", () => {
    const result = suggestTierFromOnboarding({ budgetRange: "1000-2500" })
    expect(result.tierId).toBe("growth")
  })

  it("suggests enterprise for 2500-5000 budget", () => {
    const result = suggestTierFromOnboarding({ budgetRange: "2500-5000" })
    expect(result.tierId).toBe("enterprise")
  })

  it("combines company size signal for higher tier", () => {
    // Medium company with starter budget → medium tier signal upgrades to growth
    const result = suggestTierFromOnboarding({
      budgetRange: "under-1000",
      companySize: "51-200",
    })
    expect(result.tierId).toBe("enterprise")
    expect(result.reasoning).toContain("company size")
  })

  it("upgrades to growth for premium services", () => {
    const result = suggestTierFromOnboarding({
      budgetRange: "under-1000",
      servicesNeeded: "full-stack-automation",
    })
    expect(result.tierId).toBe("growth")
  })

  it("returns medium confidence without budget range", () => {
    const result = suggestTierFromOnboarding({})
    expect(result.confidence).toBe("medium")
    expect(result.tierId).toBe("starter")
  })

  it("handles empty onboarding data gracefully", () => {
    const result = suggestTierFromOnboarding({})
    expect(result.tierId).toBe("starter")
    expect(result.confidence).toBe("medium")
    expect(result.reasoning).toBeDefined()
  })
})

describe("getSuggestionFromBudget", () => {
  it("returns correct suggestion for each budget range", () => {
    const tests = [
      { budget: "under-1000", expectedTier: "starter", expectedPrice: 50 },
      { budget: "1000-2500", expectedTier: "growth", expectedPrice: 200 },
      { budget: "2500-5000", expectedTier: "enterprise", expectedPrice: 500 },
      { budget: "not-sure", expectedTier: "starter", expectedPrice: 50 },
    ]

    for (const { budget, expectedTier, expectedPrice } of tests) {
      const result = getSuggestionFromBudget(budget)
      expect(result.tier).toBe(expectedTier)
      expect(result.monthlyPrice).toBe(expectedPrice)
    }
  })

  it("returns starter defaults for unknown budget", () => {
    const result = getSuggestionFromBudget("unknown")
    expect(result.tier).toBe("starter")
    expect(result.monthlyPrice).toBe(50)
  })
})

// ============================================================
// Consistency Tests — Ensure all price references match
// ============================================================

describe("Pricing Consistency", () => {
  it("all budget ranges have matching tier and price entries", () => {
    for (const budget of Object.keys(BUDGET_TO_TIER)) {
      expect(BUDGET_TO_PRICE).toHaveProperty(budget)
    }
    for (const budget of Object.keys(BUDGET_TO_PRICE)) {
      expect(BUDGET_TO_TIER).toHaveProperty(budget)
    }
  })

  it("all tier IDs used in budget mapping exist in TIERS", () => {
    const tierIds = new Set(Object.values(BUDGET_TO_TIER))
    for (const id of tierIds) {
      expect(TIERS).toHaveProperty(id)
    }
  })

  it("budget-to-price values match their tier's monthlyPrice", () => {
    for (const [budget, price] of Object.entries(BUDGET_TO_PRICE)) {
      const tierId = BUDGET_TO_TIER[budget]
      expect(price).toBe(TIERS[tierId].monthlyPrice)
    }
  })
})
