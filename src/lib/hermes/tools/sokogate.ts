/**
 * Sokogate Trade Platform LangChain Tools
 *
 * Wraps the Sokogate integration as callable LangChain tools for
 * supplier discovery, buyer matching, and trade corridor analysis
 * within the Hermes autonomous sales pipeline.
 *
 * Exports:
 *   sokogateSearchProducts — search suppliers by commodity/country/cert
 *   sokogateFindMatches    — find corridor matches between supplier & buyer
 *   sokogateGetBuyers      — discover active buyers on the platform
 */

import { tool } from "@langchain/core/tools"
import { z } from "zod"

// ============================================================
// Search Products / Suppliers
// ============================================================

const SearchProductsSchema = z.object({
  commodity: z.string().optional().describe("Product category or commodity to search for (e.g. coffee, cotton, copper)"),
  country: z.string().optional().describe("Supplier country filter (e.g. Kenya, Tanzania, Ghana)"),
  minErsScore: z.number().min(0).max(100).optional().describe("Minimum Export Readiness Score filter (0-100)"),
  certifications: z.array(z.string()).optional().describe("Required certifications (e.g. HACCP, Organic, Halal)"),
})

export const sokogateSearchProducts = tool(
  async ({ commodity, country, minErsScore, certifications }) => {
    try {
      const { sokogateIntegration } = await import("@/lib/sokogate-integration")
      const result = await sokogateIntegration.getSuppliers({
        commodity,
        country,
        minErsScore,
        certifications,
      })
      return JSON.stringify({
        count: result.suppliers.length,
        suppliers: result.suppliers.map((s) => ({
          id: s.id,
          companyName: s.companyName,
          country: s.country,
          commodities: s.commodities,
          certifications: s.certifications,
          ersScore: s.exportReadinessScore,
          monthlyCapacity: s.monthlyCapacity,
          pricing: s.pricing,
        })),
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Sokogate search failed: ${(error as Error).message}`,
      })
    }
  },
  {
    name: "sokogate_search_products",
    description:
      "Search for suppliers and products on the Sokogate B2B trade platform. " +
      "Returns vetted African suppliers with their commodities, certifications, " +
      "Export Readiness Scores, capacity, and pricing. " +
      "Use this to find potential trade partners for a given commodity or region.",
    schema: SearchProductsSchema,
  }
)

// ============================================================
// Find Corridor Matches
// ============================================================

const FindMatchesSchema = z.object({
  supplierId: z.string().describe("Supplier ID from Sokogate platform"),
  buyerId: z.string().describe("Buyer ID from Sokogate platform"),
  matchScore: z.number().min(0).max(100).optional().describe("Optional pre-calculated match score"),
})

export const sokogateFindMatches = tool(
  async ({ supplierId, buyerId, matchScore }) => {
    try {
      const { sokogateIntegration } = await import("@/lib/sokogate-integration")
      const result = await sokogateIntegration.findMatches(supplierId, buyerId)
      return JSON.stringify(result.match || { note: "Match score calculated", supplierId, buyerId, matchScore })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Sokogate match failed: ${(error as Error).message}`,
      })
    }
  },
  {
    name: "sokogate_find_matches",
    description:
      "Find trade corridor matches between a Sokogate supplier and buyer. " +
      "Returns a match score (0-100) with breakdown across product fit, " +
      "certification compatibility, volume fit, logistics, and pricing.",
    schema: FindMatchesSchema,
  }
)

// ============================================================
// Get Buyers
// ============================================================

const GetBuyersSchema = z.object({
  interest: z.string().optional().describe("Filter buyers by procurement interest (e.g. coffee, minerals, textiles)"),
  country: z.string().optional().describe("Filter buyers by country"),
})

export const sokogateGetBuyers = tool(
  async ({ interest, country }) => {
    try {
      const { sokogateIntegration } = await import("@/lib/sokogate-integration")
      const result = await sokogateIntegration.getBuyers({ interest, country })
      return JSON.stringify({
        count: result.buyers.length,
        buyers: result.buyers.map((b) => ({
          id: b.id,
          companyName: b.companyName,
          country: b.country,
          procurementInterests: b.procurementInterests,
          requiredCertifications: b.requiredCertifications,
          monthlyVolume: b.monthlyVolume,
          budgetRange: b.budgetRange,
        })),
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Sokogate getBuyers failed: ${(error as Error).message}`,
      })
    }
  },
  {
    name: "sokogate_get_buyers",
    description:
      "Discover active buyers on the Sokogate B2B trade platform. " +
      "Returns buyers with their procurement interests, required certifications, " +
      "monthly volume, and budget ranges. Use to identify demand for specific commodities.",
    schema: GetBuyersSchema,
  }
)
