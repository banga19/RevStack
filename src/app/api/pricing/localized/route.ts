import { NextRequest, NextResponse } from "next/server"
import { TIERS, REGIONS, getLocalizedTiers, type Region, type TierId } from "@/lib/pricing"
import { PUBLIC_1M } from "@/lib/cache"

/**
 * GET /api/pricing/localized?region=ke
 *
 * Returns all pricing tiers with prices converted to the requested region's currency.
 * Falls back to USD (intl) if region is not specified or invalid.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const regionParam = url.searchParams.get("region") || "intl"

  const region: Region = Object.keys(REGIONS).includes(regionParam)
    ? (regionParam as Region)
    : "intl"

  const config = REGIONS[region]
  const tiers = getLocalizedTiers(region)

  const data = {
    region: {
      code: config.code,
      label: config.label,
      currency: config.currency,
      symbol: config.symbol,
      flag: config.flag,
      rate: config.rate,
    },
    tiers: Object.values(TIERS).map((tier) => {
      const local = tiers.find((t) => t.id === tier.id)
      return {
        id: tier.id,
        name: tier.name,
        usd: {
          monthly: tier.monthlyPrice,
          yearly: tier.yearlyPrice,
        },
        local: {
          monthly: local?.localMonthly || null,
          yearly: local?.localYearly || null,
        },
        successFee: tier.successFee,
        godModeRate: tier.godModeRate,
      }
    }),
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": PUBLIC_1M,
    },
  })
}
