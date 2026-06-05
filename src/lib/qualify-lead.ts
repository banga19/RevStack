/**
 * Lead qualification scoring algorithm.
 *
 * Used by:
 *   - /api/leads/[id]/qualify  (single lead)
 *   - /api/hermes/runs         (batch qualification)
 *   - /lib/autonomous-scheduler.ts (autonomous pre-qualification)
 *
 * Scoring breakdown:
 *   Base score:                       40
 *   Has industry:                    +15
 *   Has country:                     +10
 *   Has phone OR whatsapp:           +15  (one bonus, not per-channel)
 *   Has notes longer than 20 chars:  +10
 *   Has source:                      +10
 *
 *   Source quality bonus (if source filled):  +0-10 extra based on quality
 *     - referral / partner:         +10
 *     - cold-outreach / inbound:     +5
 *     - website / seo:               +2
 *     - other:                       +0
 *
 *   Email quality bonus:
 *     - Professional domain:         +5  (not gmail.com, yahoo.com, etc.)
 *
 *   Recency penalty (deduction from base):
 *     - Lead older than 7 days:      -5
 *     - Lead older than 14 days:     -10
 *     - Lead older than 30 days:     -15
 *
 *   ─────────────────────────────────────
 *   Maximum possible (no recency penalty):  115
 *   Minimum possible (with recency):        25
 *
 * Classification tiers:
 *   80+:  "hot"       — ready for immediate outreach
 *   60-79: "qualified" — standard qualification
 *   40-59: "lukewarm"  — needs enrichment
 *    <40: "cold"       — low priority, may need discarding
 */

export interface QualifyInput {
  industry?: string | null
  country?: string | null
  phone?: string | null
  whatsapp?: string | null
  notes?: string | null
  source?: string | null
  email?: string | null
  createdAt?: string | Date | null
}

export interface QualifyResult {
  score: number
  status: "qualified" | "disqualified"
  tier: "hot" | "qualified" | "lukewarm" | "cold"
  breakdown: {
    base: number
    industry: number
    country: number
    contact: number
    notes: number
    source: number
    sourceQuality: number
    emailQuality: number
    recencyPenalty: number
  }
}

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com",
  "outlook.com", "live.com", "aol.com", "icloud.com",
  "mail.com", "protonmail.com", "zoho.com", "yandex.com",
  "gmx.com", "outlook.fr", "yahoo.fr", "gmx.de",
])

const HIGH_QUALITY_SOURCES = ["referral", "partner", "warm-intro", "event", "conference"]
const MEDIUM_QUALITY_SOURCES = ["cold-outreach", "inbound", "linkedin", "social-media"]
const LOW_QUALITY_SOURCES = ["website", "seo", "google", "organic", "landing-page"]

function computeSourceQualityBonus(source?: string | null): number {
  if (!source) return 0
  const s = source.toLowerCase().trim()
  if (HIGH_QUALITY_SOURCES.some((hq) => s.includes(hq))) return 10
  if (MEDIUM_QUALITY_SOURCES.some((mq) => s.includes(mq))) return 5
  if (LOW_QUALITY_SOURCES.some((lq) => s.includes(lq))) return 2
  return 0
}

function computeEmailQualityBonus(email?: string | null): number {
  if (!email) return 0
  const domain = email.split("@")[1]?.toLowerCase().trim()
  if (!domain) return 0
  if (FREE_EMAIL_DOMAINS.has(domain)) return 0
  return 5
}

function computeRecencyPenalty(createdAt?: string | Date | null): number {
  if (!createdAt) return 0
  const age = Date.now() - new Date(createdAt).getTime()
  const daysOld = age / (1000 * 60 * 60 * 24)
  if (daysOld > 30) return 15
  if (daysOld > 14) return 10
  if (daysOld > 7) return 5
  return 0
}

function classifyTier(score: number): QualifyResult["tier"] {
  if (score >= 80) return "hot"
  if (score >= 60) return "qualified"
  if (score >= 40) return "lukewarm"
  return "cold"
}

export function qualifyLead(input: QualifyInput): QualifyResult {
  const base = 40
  const industryBonus = input.industry ? 15 : 0
  const countryBonus = input.country ? 10 : 0
  const contactBonus = input.phone || input.whatsapp ? 15 : 0
  const notesBonus = input.notes && input.notes.length > 20 ? 10 : 0
  const sourceBonus = input.source ? 10 : 0
  const sourceQualityBonus = computeSourceQualityBonus(input.source)
  const emailQualityBonus = computeEmailQualityBonus(input.email)
  const recencyPenalty = computeRecencyPenalty(input.createdAt)

  let score = base + industryBonus + countryBonus + contactBonus +
    notesBonus + sourceBonus + sourceQualityBonus + emailQualityBonus - recencyPenalty

  // Clamp to valid range 0-100
  score = Math.max(0, Math.min(100, score))

  const status: "qualified" | "disqualified" = score >= 60 ? "qualified" : "disqualified"

  return {
    score,
    status,
    tier: classifyTier(score),
    breakdown: {
      base,
      industry: industryBonus,
      country: countryBonus,
      contact: contactBonus,
      notes: notesBonus,
      source: sourceBonus,
      sourceQuality: sourceQualityBonus,
      emailQuality: emailQualityBonus,
      recencyPenalty,
    },
  }
}
