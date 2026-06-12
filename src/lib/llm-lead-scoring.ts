/**
 * LLM Lead Scoring Engine
 *
 * Enhances the rule-based `qualifyLead()` with LLM-powered semantic analysis.
 * Analyzes lead data (company name, industry, notes, email content, source)
 * using the configured LLM to produce a richer score with reasoning.
 *
 * Falls back to `qualifyLead()` if the LLM is unavailable or returns an error.
 *
 * Usage:
 *   import { scoreLeadWithLlm } from "@/lib/llm-lead-scoring"
 *   const result = await scoreLeadWithLlm(leadData)
 */

import { createAnalystLlm } from "./model-provider"
import { qualifyLead, type QualifyInput, type QualifyResult } from "./qualify-lead"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { ChatPromptTemplate } from "@langchain/core/prompts"

// ── Types ─────────────────────────────────────────────────────────────

export interface LlmScoringInput extends QualifyInput {
  companyName?: string | null
  contactName?: string | null
  email?: string | null
  notes?: string | null
  source?: string | null
  productInterest?: string | null
  budget?: string | null
  timeline?: string | null
  // Raw text from lead inquiry / initial message
  inquiryText?: string | null
}

export interface LlmScoreFactor {
  name: string
  score: number // 0-100
  weight: number // 0-1 (contribution to overall score)
  reasoning: string
}

export interface LlmScoringResult extends QualifyResult {
  llmScore: number // 0-100, the LLM-augmented score
  llmTier: "hot" | "qualified" | "lukewarm" | "cold"
  factors: LlmScoreFactor[]
  summary: string // Human-readable summary of the scoring
  llmEnabled: boolean // Whether the LLM was actually used
}

// ── Constants ─────────────────────────────────────────────────────────

const SCORING_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", `You are an expert lead scoring analyst for a B2B trade automation platform called Mapato.
Your job is to evaluate a sales lead and produce a structured assessment.

Score the lead on these 5 factors (each 0-100):
1. **intent_signals** — How strong is the buying intent? Look for urgency keywords, specific needs, budget mentions
2. **company_fit** — How well does the company fit B2B trade? Industry relevance, company size signals, trading activity
3. **engagement_quality** — Quality of the inquiry/notes. Detailed questions > vague interest. Specific needs > general curiosity
4. **timeline_budget** — Do they mention a timeline (ASAP, this quarter) or budget? Strong signals of readiness
5. **source_credibility** — How credible is the lead source? Referrals/partners > inbound > cold outreach > website

Then combine these into an overall score (0-100) with a tier classification:
- hot (80+): Ready for immediate outreach — strong intent, good fit, clear timeline
- qualified (60-79): Promising — needs a conversation to confirm
- lukewarm (40-59): Moderate interest — may need nurturing
- cold (<40): Low priority — limited signals or poor fit

Return ONLY a valid JSON object with this exact shape:
{
  "overallScore": <number 0-100>,
  "tier": "<hot|qualified|lukewarm|cold>",
  "factors": [
    { "name": "intent_signals", "score": <0-100>, "weight": <0-1>, "reasoning": "<brief reasoning>" },
    { "name": "company_fit", "score": <0-100>, "weight": <0-1>, "reasoning": "<brief reasoning>" },
    { "name": "engagement_quality", "score": <0-100>, "weight": <0-1>, "reasoning": "<brief reasoning>" },
    { "name": "timeline_budget", "score": <0-100>, "weight": <0-1>, "reasoning": "<brief reasoning>" },
    { "name": "source_credibility", "score": <0-100>, "weight": <0-1>, "reasoning": "<brief reasoning>" }
  ],
  "summary": "<2-3 sentence summary of the lead assessment>"
}

If there is very little data (only a name and email), note that in the summary and score accordingly.
Be honest about low-confidence assessments — it's better to under-score than over-score.`],
  ["human", `Lead to score:
Company: {companyName}
Contact: {contactName}
Industry: {industry}
Email: {email}
Source: {source}
Notes: {notes}
Product Interest: {productInterest}
Budget: {budget}
Timeline: {timeline}
Inquiry Text: {inquiryText}`],
])

// ── LLM Scoring Engine ───────────────────────────────────────────────

function determineTier(score: number): "hot" | "qualified" | "lukewarm" | "cold" {
  if (score >= 80) return "hot"
  if (score >= 60) return "qualified"
  if (score >= 40) return "lukewarm"
  return "cold"
}

function determineStatus(tier: string): "qualified" | "disqualified" {
  return tier === "hot" || tier === "qualified" ? "qualified" : "disqualified"
}

/**
 * Score a lead using the LLM for semantic analysis.
 * Falls back to the rule-based `qualifyLead()` if the LLM is unavailable.
 */
export async function scoreLeadWithLlm(input: LlmScoringInput): Promise<LlmScoringResult> {
  // Start with the rule-based score as baseline
  const ruleResult = qualifyLead(input)

  // Default factors based on rule-based breakdown
  const ruleFactors: LlmScoreFactor[] = [
    { name: "intent_signals", score: ruleResult.breakdown.notes > 0 ? 50 : 20, weight: 0.25, reasoning: "Based on notes length and presence" },
    { name: "company_fit", score: ruleResult.breakdown.industry > 0 ? 70 : 30, weight: 0.25, reasoning: "Based on industry and country data" },
    { name: "engagement_quality", score: ruleResult.breakdown.contact > 0 ? 50 : 20, weight: 0.15, reasoning: "Based on contact information completeness" },
    { name: "timeline_budget", score: 30, weight: 0.2, reasoning: "No timeline or budget data available" },
    { name: "source_credibility", score: ruleResult.breakdown.sourceQuality > 0 ? ruleResult.breakdown.sourceQuality * 10 : 30, weight: 0.15, reasoning: `Based on source quality: ${input.source || "unknown"}` },
  ]

  // Try LLM scoring
  try {
    const llm = createAnalystLlm()
    const chain = SCORING_PROMPT.pipe(llm).pipe(new StringOutputParser())

    const rawResponse = await chain.invoke({
      companyName: input.companyName || input.contactName || "Unknown",
      contactName: input.contactName || "Unknown",
      industry: input.industry || "Not specified",
      email: input.email || "Not provided",
      source: input.source || "Unknown",
      notes: input.notes || "No notes",
      productInterest: input.productInterest || "Not specified",
      budget: input.budget || "Not specified",
      timeline: input.timeline || "Not specified",
      inquiryText: input.inquiryText || input.notes || "No inquiry text",
    })

    // Parse the JSON response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON found in LLM response")

    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.overallScore || !Array.isArray(parsed.factors)) {
      throw new Error("Invalid response shape from LLM")
    }

    const llmScore = Math.max(0, Math.min(100, parsed.overallScore))
    const llmTier = determineTier(llmScore)
    const llmStatus = determineStatus(llmTier)

    const factors: LlmScoreFactor[] = parsed.factors.map((f: any) => ({
      name: f.name || "unknown",
      score: Math.max(0, Math.min(100, f.score || 0)),
      weight: f.weight || 0.2,
      reasoning: f.reasoning || "No reasoning provided",
    }))

    // Blend LLM score with rule-based score (70% LLM, 30% rules)
    const blendedScore = Math.round(llmScore * 0.7 + ruleResult.score * 0.3)
    const blendedTier = determineTier(blendedScore)

    return {
      ...ruleResult,
      score: blendedScore,
      status: determineStatus(blendedTier),
      tier: blendedTier,
      llmScore,
      llmTier,
      factors,
      summary: parsed.summary || `LLM assessed this lead as ${llmTier} (${llmScore}/100)`,
      llmEnabled: true,
    }
  } catch (error) {
    // LLM unavailable or error — fall back to rule-based scoring
    console.warn("[LLM Scoring] LLM unavailable, using rule-based scoring:", (error as Error).message)

    return {
      ...ruleResult,
      llmScore: ruleResult.score,
      llmTier: ruleResult.tier,
      factors: ruleFactors,
      summary: `Rule-based assessment: ${ruleResult.tier} (${ruleResult.score}/100)`,
      llmEnabled: false,
    }
  }
}

/**
 * Batch score multiple leads using the LLM.
 * Falls back to rule-based for individual leads that fail LLM scoring.
 */
export async function batchScoreLeads(
  leads: LlmScoringInput[]
): Promise<LlmScoringResult[]> {
  return Promise.all(leads.map((lead) => scoreLeadWithLlm(lead)))
}

/**
 * Get a readable summary of the scoring factors.
 */
export function formatScoringSummary(result: LlmScoringResult): string {
  const lines = [
    `Lead Score: ${result.score}/100 (${result.tier})`,
    `LLM Score: ${result.llmScore}/100 — Summary: ${result.summary}`,
    ``,
    `Scoring Factors:`,
  ]

  for (const factor of result.factors) {
    const bar = "█".repeat(Math.round(factor.score / 10)) + "░".repeat(10 - Math.round(factor.score / 10))
    lines.push(`  ${factor.name.replace(/_/g, " ")}: ${factor.score}/100 [${bar}] (weight: ${Math.round(factor.weight * 100)}%)`)
    lines.push(`    → ${factor.reasoning}`)
  }

  lines.push(``)
  lines.push(`Rule-based baseline: ${result.score}/100 (${result.tier})`)
  lines.push(`Method: ${result.llmEnabled ? "LLM-enhanced" : "Rule-based only"}`)

  return lines.join("\n")
}
