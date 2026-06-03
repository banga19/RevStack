/**
 * Mapato Pricing Model
 *
 * Shared constants and utility functions for subscription tiers,
 * budget-to-tier mapping, and pricing calculations.
 */

// ============================================================
// Tier Definitions
// ============================================================

export interface TierDefinition {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  successFee: number
  godModeRate: number
}

export const TIERS: Record<string, TierDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    monthlyPrice: 50,
    yearlyPrice: 500, // 2 months free
    successFee: 0.10,
    godModeRate: 19,
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthlyPrice: 200,
    yearlyPrice: 2000, // 2 months free
    successFee: 0.15,
    godModeRate: 14,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 500,
    yearlyPrice: 5000, // 2 months free
    successFee: 0.20,
    godModeRate: 0, // free
  },
}

export type TierId = "starter" | "growth" | "enterprise"

// ============================================================
// Budget Range to Tier Mapping
// ============================================================

/**
 * Maps a budget range key to a suggested tier ID.
 * This is the single source of truth used across onboarding, clients,
 * subscription suggestions, and pricing API.
 */
export const BUDGET_TO_TIER: Record<string, TierId> = {
  "under-1000": "starter",
  "1000-2500": "growth",
  "2500-5000": "enterprise",
  "5000-10000": "enterprise",
  "10000+": "enterprise",
  "not-sure": "starter",
}

/**
 * Maps a budget range key to a suggested monthly price.
 * Must stay in sync with BUDGET_TO_TIER.
 */
export const BUDGET_TO_PRICE: Record<string, number> = {
  "under-1000": 50,
  "1000-2500": 200,
  "2500-5000": 500,
  "5000-10000": 500,
  "10000+": 500,
  "not-sure": 50,
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the suggested tier ID from a budget range key.
 * Returns "starter" as default if the budget range is unknown.
 */
export function getTierFromBudget(budgetRange: string): TierId {
  return BUDGET_TO_TIER[budgetRange] || "starter"
}

/**
 * Get the suggested monthly price from a budget range key.
 * Returns 50 (starter price) as default if the budget range is unknown.
 */
export function getPriceFromBudget(budgetRange: string): number {
  return BUDGET_TO_PRICE[budgetRange] || 50
}

/**
 * Get full tier definition from a tier ID string.
 */
export function getTier(tierId: string): TierDefinition | undefined {
  return TIERS[tierId]
}

/**
 * Suggest a tier based on onboarding data (budget range + company size).
 * Uses budget as the primary signal and company size as a secondary signal.
 */
export function suggestTierFromOnboarding(onboarding: {
  businessName?: string
  industry?: string
  companySize?: string
  primaryGoal?: string
  servicesNeeded?: string
  budgetRange?: string
}): { tierId: TierId; confidence: string; reasoning: string } {
  const budget = onboarding.budgetRange || ""

  // Budget-based suggestion (primary signal)
  const budgetTier = getTierFromBudget(budget)

  // Company size signals
  const sizeSignals: Record<string, TierId> = {
    "1": "starter",
    "2-10": "starter",
    "11-50": "growth",
    "51-200": "enterprise",
    "201+": "enterprise",
  }

  // Tier priority for combining signals
  const tierPriority: Record<string, number> = { starter: 1, growth: 2, enterprise: 3 }

  // Start with budget-based suggestion
  let tierId: TierId = budgetTier
  let reasoning = `Based on your budget range`

  // Combine with company size signal (take the higher tier)
  if (onboarding.companySize && sizeSignals[onboarding.companySize]) {
    const sizeTier = sizeSignals[onboarding.companySize]
    if (tierPriority[sizeTier] > tierPriority[tierId]) {
      tierId = sizeTier
      reasoning += ` and company size (${onboarding.companySize} employees)`
    }
  }

  // Services signals
  if (onboarding.servicesNeeded) {
    const premiumServices = ["full-stack-automation", "consulting"]
    if (premiumServices.includes(onboarding.servicesNeeded)) {
      tierId = tierPriority[tierId] < 3 ? "growth" : tierId
      reasoning += ` and selected service (${onboarding.servicesNeeded.replace(/-/g, " ")})`
    }
  }

  const confidence = onboarding.budgetRange ? "high" : "medium"

  return { tierId, confidence, reasoning }
}

/**
 * Get tier and price suggestion from a budget range.
 * Returns { tier, monthlyPrice } for use in API responses.
 */
export function getSuggestionFromBudget(budgetRange: string): {
  tier: string
  monthlyPrice: number
} {
  return {
    tier: getTierFromBudget(budgetRange),
    monthlyPrice: getPriceFromBudget(budgetRange),
  }
}
