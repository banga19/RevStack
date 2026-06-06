/**
 * Export Readiness Score (ERS) LangChain Tool
 *
 * Wraps the ERS scoring engine as a callable LangChain tool for use
 * in the Hermes LangGraph sales pipeline. Calculates a 0-100 score
 * from compliance records, product data, and client information.
 *
 * Exports:
 *   calculateERS — compute a full ERS score with dimension breakdown
 *   getERSReadiness — get a quick readiness assessment label
 */

import { tool } from "@langchain/core/tools"
import { z } from "zod"

// ============================================================
// Calculate Full ERS Score
// ============================================================

const ErsInputSchema = z.object({
  complianceRecords: z
    .array(
      z.object({
        certificationType: z.string().describe("Type of certification (e.g. haccp, halal, organic, phytosanitary)"),
        status: z.enum(["obtained", "in-progress", "not-started", "expired"]).describe("Current status of the certification"),
        expiresAt: z.string().nullable().optional().describe("ISO date of expiry, if obtained"),
      })
    )
    .optional()
    .describe("Compliance certification records for the client"),
  products: z
    .array(
      z.object({
        certifications: z.string().nullable().optional().describe("Comma-separated certifications listed on the product"),
        exportVolume: z.string().nullable().optional().describe("Monthly export volume with unit (e.g. 2000 kg/month)"),
        unit: z.string().nullable().optional().describe("Unit of measurement (kg, tons, units)"),
        pricing: z.string().nullable().optional().describe("Pricing string (e.g. $8.50/kg FOB Mombasa)"),
      })
    )
    .optional()
    .describe("Products the client exports"),
  clientTier: z.string().optional().describe("Client subscription tier (starter, growth, enterprise)"),
  clientCorridor: z.string().optional().describe("Trade corridor (e.g. korea-africa, china-africa)"),
  monthlyRetainer: z.number().optional().describe("Monthly retainer amount in USD"),
})

export const calculateERS = tool(
  async ({ complianceRecords, products, clientTier, clientCorridor, monthlyRetainer }) => {
    try {
      const { calculateErs, serialiseBreakdown, readinessLabel } = await import("@/lib/ers-scoring")

      const result = calculateErs({
        complianceRecords: complianceRecords?.map((r) => ({
          certificationType: r.certificationType,
          status: r.status,
          expiresAt: r.expiresAt ?? null,
        })),
        products: products?.map((p) => ({
          certifications: p.certifications,
          exportVolume: p.exportVolume,
          unit: p.unit,
          pricing: p.pricing,
        })),
        client: {
          tier: clientTier ?? null,
          corridor: clientCorridor ?? null,
          monthlyRetainer: monthlyRetainer ?? null,
        },
      })

      return JSON.stringify({
        total: result.total,
        readiness: readinessLabel(result.readinessLevel),
        breakdown: result.breakdown,
      })
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `ERS calculation failed: ${(error as Error).message}`,
      })
    }
  },
  {
    name: "calculate_export_readiness",
    description:
      "Calculate the Export Readiness Score (ERS) for a client. " +
      "Returns a 0-100 score across four dimensions: Documentation, Compliance, " +
      "Export History, and Capacity Verified. " +
      "Use this to assess a supplier's readiness for international trade.",
    schema: ErsInputSchema,
  }
)

// ============================================================
// Quick Readiness Assessment
// ============================================================

const ReadinessSchema = z.object({
  totalScore: z.number().min(0).max(100).describe("The ERS total score (0-100)"),
})

export const getERSReadiness = tool(
  async ({ totalScore }) => {
    const level =
      totalScore >= 80 ? "export-ready" as const
      : totalScore >= 50 ? "developing" as const
      : "needs-work" as const

    const labels: Record<string, string> = {
      "export-ready": "Export Ready — strong candidate for international trade partnerships",
      "developing": "Developing — building export capacity, mid-level readiness",
      "needs-work": "Needs Work — gaps in documentation, compliance, or capacity",
    }

    return JSON.stringify({
      score: totalScore,
      level,
      label: labels[level],
    })
  },
  {
    name: "get_ers_readiness",
    description:
      "Get a quick readiness assessment label from an ERS score. " +
      "Returns 'export-ready', 'developing', or 'needs-work' with a description.",
    schema: ReadinessSchema,
  }
)
