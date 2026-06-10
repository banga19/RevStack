/**
 * Agent Service Bridge
 *
 * Wires each autonomous agent (Lead, Trade, Compliance, Onboarding, Revenue)
 * to its corresponding real integrated services — WATI (WhatsApp), QMe (documents),
 * email (nodemailer), supplier matching, Flutterwave (payments), and the RAG pipeline.
 *
 * Previously the agent orchestrator only called the LLM and returned text.
 * This bridge makes agents actually invoke real services.
 */

import { prisma } from "./db"
import { watiIntegration } from "./wati-integration"
import { qmeIntegration } from "./qme-integration"
import { sendWelcomeEmail } from "./email"
import { matchSuppliers, KOREAN_BUYER_PROFILES, type SupplierProfile, type MatchResult } from "./supplier-matching"
import { makeIntegration } from "./make-integration"
import { zohoCrmIntegration } from "./zoho-crm-integration"
import { voiceflowIntegration } from "./voiceflow-integration"
import { sokogateIntegration } from "./sokogate-integration"
import { instantlyIntegration } from "./instantly-integration"
import { ragPipeline } from "./rag-pipeline"
import { type AgentType } from "./agent-memory"
import { createLlm } from "./model-provider"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { ChatPromptTemplate } from "@langchain/core/prompts"

// ============================================================
// Types
// ============================================================

export interface ServiceActionResult {
  success: boolean
  summary: string
  details?: string
  metrics?: Record<string, number>
  errors?: string[]
}

interface AgentServiceContext {
  sessionId: string
  objective: string
  startTime: number
  userPersonalization?: UserPersonalizationContext
}

export interface UserPersonalizationContext {
  userId: string
  userName: string
  businessName: string
  industry: string
  companySize: string | null
  primaryGoal: string
  secondaryGoals: string | null
  currentChallenges: string | null
  targetAudience: string | null
  servicesNeeded: string | null
  budgetRange: string | null
  timeline: string | null
  referralSource: string | null
  subscriptionTier: string | null
  subscriptionStatus: string
  preAuthPrimaryGoal: string | null
  preAuthServicesInterest: string | null
  preAuthTimeline: string | null
  preAuthBudgetRange: string | null
  preAuthBusinessType: string | null
}

export async function getUserPersonalizationContext(userId: string): Promise<UserPersonalizationContext | null> {
  try {
    const [user, onboarding, questionnaire] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.onboardingResponse.findFirst({
        where: { userId, completed: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.preAuthQuestionnaire.findFirst({
        where: { userId, completed: true },
        orderBy: { createdAt: "desc" },
      }),
    ])

    if (!user) return null

    return {
      userId: user.id,
      userName: user.name,
      businessName: onboarding?.businessName ?? user.name,
      industry: onboarding?.industry ?? questionnaire?.industry ?? "unknown",
      companySize: onboarding?.companySize ?? questionnaire?.companySize ?? null,
      primaryGoal: onboarding?.primaryGoal ?? questionnaire?.primaryGoal ?? "general",
      secondaryGoals: onboarding?.secondaryGoals ?? null,
      currentChallenges: onboarding?.currentChallenges ?? questionnaire?.biggestChallenge ?? null,
      targetAudience: onboarding?.targetAudience ?? null,
      servicesNeeded: onboarding?.servicesNeeded ?? questionnaire?.servicesInterest ?? null,
      budgetRange: onboarding?.budgetRange ?? questionnaire?.budgetRange ?? null,
      timeline: onboarding?.timeline ?? questionnaire?.timeline ?? null,
      referralSource: onboarding?.referralSource ?? questionnaire?.howDidYouHear ?? null,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      preAuthPrimaryGoal: questionnaire?.primaryGoal ?? null,
      preAuthServicesInterest: questionnaire?.servicesInterest ?? null,
      preAuthTimeline: questionnaire?.timeline ?? null,
      preAuthBudgetRange: questionnaire?.budgetRange ?? null,
      preAuthBusinessType: questionnaire?.businessType ?? null,
    }
  } catch (error) {
    console.error("[Personalization] Failed to load user context:", error)
    return null
  }
}

export const personalizationCache = new Map<string, { data: UserPersonalizationContext; expiresAt: number }>()

export async function getCachedUserPersonalization(
  userId: string,
  maxAgeMs: number = 5 * 60 * 1000
): Promise<UserPersonalizationContext | null> {
  const cached = personalizationCache.get(userId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }
  const fresh = await getUserPersonalizationContext(userId)
  if (fresh) {
    personalizationCache.set(userId, { data: fresh, expiresAt: Date.now() + maxAgeMs })
  }
  return fresh
}

export function invalidatePersonalizationCache(userId: string): void {
  personalizationCache.delete(userId)
}

// ============================================================
// LLM for analysis (shared)
// ============================================================

const llm = createLlm({ temperature: 0.3 })

// ============================================================
// Lead Agent — WATI, CRM, Pipeline
// ============================================================

export async function leadAgentAction(
  rawAction: string,
  context: AgentServiceContext
): Promise<ServiceActionResult> {
  const results: string[] = []
  const metrics: Record<string, number> = {}
  const errors: string[] = []
  const p = context.userPersonalization

  try {
    // 0. Personalization-aware agent kickoff — log tailored configuration
    if (p) {
      results.push(`[Personalization] Acting for ${p.businessName} (${p.industry})`)
      results.push(`[Personalization] Primary goal: ${p.primaryGoal} | Services: ${p.servicesNeeded ?? "not specified"} | Timeline: ${p.timeline ?? "open"}`)
      if (p.currentChallenges) {
        results.push(`[Personalization] Known challenge: ${p.currentChallenges}`)
      }
      metrics["personalization_loaded"] = 1
    }

    const goal = (p?.primaryGoal || "").toLowerCase()
    const prioritizeKorean = goal.includes("korea") || goal.includes("export") || goal.includes("trade") || goal.includes("supply chain")
    const prioritizeComplianceFirst = goal.includes("compliance") || goal.includes("certif") || goal.includes("regulation")

    // 1. Check credentials and report status
    const creds = checkLeadCredentials()
    results.push(credentialBanner("Lead Agent", creds))

    // Count how many services are in simulation mode
    const simServices = Object.entries(creds).filter(([_, s]) => s.mode === "simulation")
    if (simServices.length > 0) {
      results.push(`   ℹ️  ${simServices.length} service(s) in simulation mode — set env vars above for live data`)
    }

    let unprocessedLeads = await prisma.client.findMany({
      where: { status: "lead" },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    if (prioritizeKorean && unprocessedLeads.length > 0) {
      unprocessedLeads = unprocessedLeads.sort((a, b) => {
        const aKorea = (a.corridor || "").toLowerCase().includes("korea") || (a.notes || "").toLowerCase().includes("korea") ? 0 : 1
        const bKorea = (b.corridor || "").toLowerCase().includes("korea") || (b.notes || "").toLowerCase().includes("korea") ? 0 : 1
        return aKorea - bKorea
      })
      results.push(`[Personalization] Reordered leads: Korea/export interests prioritized for ${p?.businessName}`)
    }

    metrics["leads_found"] = unprocessedLeads.length
    results.push(`Found ${unprocessedLeads.length} unprocessed leads in pipeline`)

    // 2. For each lead, run WATI auto-qualification + Voiceflow dialog if they have a phone
    let qualifiedCount = 0
    for (const lead of unprocessedLeads.slice(0, 5)) {
      if (lead.phone) {
        try {
          // Simulate an incoming message via WATI to auto-qualify
          const qualification = await watiIntegration.handleIncomingMessage({
            from: lead.phone,
            text: `Interest in trading products from ${lead.company || lead.name}`,
          })

          // Send the appropriate template based on qualification score
          if (qualification.leadScore && qualification.leadScore >= 70) {
            await watiIntegration.sendTemplate(lead.phone, "lead-scored-high", [
              lead.name,
              lead.company || lead.name,
              String(qualification.leadScore),
              "Trading products",
              "Inquired",
              "ASAP",
              lead.email || lead.phone,
            ])
            // Mark as qualified in CRM
            await prisma.client.update({
              where: { id: lead.id },
              data: { status: "qualified", ersScore: qualification.leadScore },
            })
            qualifiedCount++
            results.push(`WATI-qualified lead: ${lead.name} (score: ${qualification.leadScore})`)
          } else if (qualification.leadScore && qualification.leadScore >= 30) {
            // Send auto-reply follow-up template
            await watiIntegration.sendTemplate(lead.phone, "follow-up-24h", [
              lead.name,
              lead.company || "products",
              "3-5",
            ])
            results.push(`Sent WATI follow-up template to: ${lead.name}`)
          }

          // Run Voiceflow lead qualification dialog in parallel
          try {
            const vfResult = await voiceflowIntegration.qualifyLead({
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company || undefined,
              productInterest: lead.notes || undefined,
            })
            results.push(`Voiceflow qualified lead: ${lead.name} → ${vfResult.summary}`)
          } catch (vfErr) {
            results.push(`Voiceflow qualification skipped for ${lead.name}: ${vfErr}`)
          }

          // Sync to Zoho CRM
          try {
            const syncResult = await zohoCrmIntegration.syncClientToCrm({
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company || undefined,
              status: lead.status,
              ersScore: qualification.leadScore,
            })
            if (syncResult.contactId) {
              results.push(`Synced ${lead.name} to Zoho CRM (contact: ${syncResult.contactId})`)
            }
          } catch (crmErr) {
            results.push(`Zoho CRM sync skipped for ${lead.name}: ${crmErr}`)
          }
        } catch (e) {
          errors.push(`WATI qualification failed for ${lead.name}: ${e}`)
        }
      }
    }

    metrics["leads_qualified"] = qualifiedCount

    // 3. Trigger Make.com webhooks for lead capture and daily reporting
    try {
      await makeIntegration.triggerLeadCapture({
        name: "Bulk God Mode",
        email: "godmode@mapato.app",
        source: "god-mode-autonomous",
      })
      results.push("Triggered Make.com lead capture webhook")
    } catch (mErr) {
      results.push(`Make.com webhook trigger skipped: ${mErr}`)
    }

    // 4. Sync qualified leads to Instantly.ai for cold email outreach campaigns
    if (qualifiedCount > 0) {
      try {
        const outreachResult = await instantlyIntegration.launchOutreachCampaign({
          name: `God Mode Auto-Outreach — ${new Date().toLocaleDateString()}`,
          leads: unprocessedLeads
            .filter((l) => l.email)
            .slice(0, 10)
            .map((l) => ({
              email: l.email,
              firstName: l.name.split(" ")[0],
              company: l.company || undefined,
            })),
        })
        if (outreachResult.campaignId) {
          results.push(`Instantly.ai outreach campaign created: ${outreachResult.campaignId}`)
        }
      } catch (instErr) {
        results.push(`Instantly.ai outreach skipped: ${instErr}`)
      }
    }

    // 5. Run LLM analysis for insights
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are the Lead Agent in the Mapato autonomous system. Summarize the lead qualification results."],
      ["human", `Leads processed: ${unprocessedLeads.length}, qualified: ${qualifiedCount}\nRaw action: ${rawAction}\n\nProvide a brief analysis of lead pipeline health and any patterns detected.`],
    ])
    const analysis = await analysisPrompt.pipe(llm).pipe(new StringOutputParser()).invoke({})

    return {
      success: true,
      summary: `Lead Agent: Processed ${unprocessedLeads.length} leads, WATI-qualified ${qualifiedCount}.`,
      details: [analysis, ...results].join("\n"),
      metrics,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    return {
      success: false,
      summary: `Lead Agent failed: ${(error as Error).message}`,
      errors: [(error as Error).message],
    }
  }
}

// ============================================================
// Credential Check Helpers
// ============================================================

/**
 * Check which credentials are available for the Trade agent's external services.
 * Returns a status map showing live vs simulation mode for each service.
 */
function checkTradeCredentials(): Record<string, { configured: boolean; mode: string; hint?: string }> {
  return {
    sokogate: {
      configured: sokogateIntegration.isConfigured(),
      mode: sokogateIntegration.isConfigured() ? "live" : "simulation",
      hint: "Set SOKOGATE_API_KEY and SOKOGATE_API_SECRET for real supplier/buyer data",
    },
    "make.com": {
      configured: !!process.env.MAKE_REPORTING_WEBHOOK,
      mode: !!process.env.MAKE_REPORTING_WEBHOOK ? "live" : "simulation",
      hint: "Set MAKE_REPORTING_WEBHOOK for automated reporting",
    },
    llm: {
      configured: !!(process.env.NVIDIA_NIM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY),
      mode: !!(process.env.NVIDIA_NIM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY) ? "live" : "unavailable",
      hint: "Set NVIDIA_NIM_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY",
    },
  }
}

/**
 * Check which credentials are available for the Lead agent's external services.
 */
function checkLeadCredentials(): Record<string, { configured: boolean; mode: string; hint?: string }> {
  return {
    wati: {
      configured: watiIntegration.isConfigured(),
      mode: watiIntegration.isConfigured() ? "live" : "simulation",
      hint: "Set WATI_API_TOKEN and WATI_WHATSAPP_NUMBER_ID for WhatsApp qualification",
    },
    "zoho-crm": {
      configured: zohoCrmIntegration.isConfigured(),
      mode: zohoCrmIntegration.isConfigured() ? "live" : "simulation",
      hint: "Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN",
    },
    "instantly.ai": {
      configured: instantlyIntegration.isConfigured(),
      mode: instantlyIntegration.isConfigured() ? "live" : "simulation",
      hint: "Set INSTANTLY_API_KEY for cold email outreach campaigns",
    },
    voiceflow: {
      configured: voiceflowIntegration.isConfigured(),
      mode: voiceflowIntegration.isConfigured() ? "live" : "simulation",
      hint: "Set VOICEFLOW_API_KEY and VOICEFLOW_PROJECT_ID for chatbot dialogs",
    },
    "make.com": {
      configured: !!process.env.MAKE_LEAD_CAPTURE_WEBHOOK,
      mode: !!process.env.MAKE_LEAD_CAPTURE_WEBHOOK ? "live" : "simulation",
      hint: "Set MAKE_LEAD_CAPTURE_WEBHOOK for automated lead capture",
    },
  }
}

/**
 * Build a credential status banner from a credential check result.
 */
function credentialBanner(
  label: string,
  creds: Record<string, { configured: boolean; mode: string; hint?: string }>
): string {
  const lines = [`📋 ${label} Credential Status:`]
  for (const [service, status] of Object.entries(creds)) {
    const icon = status.mode === "live" ? "✅" : status.mode === "simulation" ? "⚠️" : "❌"
    const hint = status.configured || !status.hint ? "" : ` — ${status.hint}`
    lines.push(`   ${icon} ${service.padEnd(16)} ${status.mode}${hint}`)
  }
  return lines.join("\n")
}

// ============================================================
// Trade Agent — Supplier Matching, Corridor Analysis
// ============================================================

export async function tradeAgentAction(
  rawAction: string,
  context: AgentServiceContext
): Promise<ServiceActionResult> {
  const results: string[] = []
  const metrics: Record<string, number> = {}

  try {
    // 0. Check credentials and report status at the top of the output
    const creds = checkTradeCredentials()
    results.push(credentialBanner("Trade Agent", creds))

    const goal = (context.userPersonalization?.primaryGoal || "").toLowerCase()
    const prioritizeKorean = goal.includes("korea") || goal.includes("export") || goal.includes("trade")
    const prioritizeEurope = goal.includes("europe") || goal.includes("eu")

    // 1. Fetch suppliers from the database (clients with products)
    const dbSuppliers = await prisma.client.findMany({
      where: {
        status: { in: ["active", "onboarding"] },
        products: { some: {} },
      },
      include: {
        products: true,
        complianceRecords: { where: { status: "obtained" } },
      },
      take: 20,
    })

    let supplierProfiles: SupplierProfile[] = dbSuppliers.map((s) => ({
      id: s.id,
      name: s.name,
      country: s.corridor?.split("-").pop() || "Kenya",
      commodity: s.products.map((p) => p.name).join(", "),
      category: s.products[0]?.category || undefined,
      certifications: s.complianceRecords.map((c) => c.certificationType),
      ersScore: s.ersScore || 50,
      ersBreakdown: s.ersBreakdown
        ? JSON.parse(s.ersBreakdown)
        : undefined,
      exportVolume: s.products[0]?.exportVolume || undefined,
      pricing: s.products[0]?.pricing || undefined,
    }))

    if (prioritizeKorean) {
      supplierProfiles = supplierProfiles.sort((a, b) => (b.ersScore || 50) - (a.ersScore || 50))
      results.push(`[Personalization] Prioritized highest-ERS suppliers for Korean/export focus`)
    }

    metrics["suppliers_found"] = supplierProfiles.length

    // 3. Run matching against all Korean buyer profiles (internal matching engine)
    let totalMatches = 0
    const allMatches: { buyer: string; matches: MatchResult[] }[] = []

    const buyerOrder = prioritizeEurope
      ? Object.keys(KOREAN_BUYER_PROFILES).sort((a, b) => {
          if (a.toLowerCase().includes("korea")) return 1
          if (b.toLowerCase().includes("korea")) return -1
          return 0
        })
      : Object.keys(KOREAN_BUYER_PROFILES)

    for (const buyerName of buyerOrder) {
      const buyerProfile = KOREAN_BUYER_PROFILES[buyerName]
      const matches = matchSuppliers(buyerProfile, supplierProfiles)
      const goodMatches = matches.filter((m) => m.matchScore >= 50)
      if (goodMatches.length > 0) {
        totalMatches += goodMatches.length
        allMatches.push({ buyer: buyerName, matches: goodMatches })
        results.push(
          `Korea corridor: ${buyerName} → ${goodMatches.length} supplier matches (top: ${goodMatches[0].supplierName} @ ${goodMatches[0].matchScore}/100)`
        )
      }
    }

    // 4. Also check Sokogate platform for supplier and buyer discovery
    try {
      const sokogateSuppliers = await sokogateIntegration.getSuppliers({ minErsScore: 50 })
      if (sokogateSuppliers.suppliers.length > 0) {
        results.push(`Sokogate platform: ${sokogateSuppliers.suppliers.length} pre-vetted suppliers available`)
        metrics["sokogate_suppliers"] = sokogateSuppliers.suppliers.length
      }

      const sokogateBuyers = await sokogateIntegration.getBuyers()
      if (sokogateBuyers.buyers.length > 0) {
        results.push(`Sokogate platform: ${sokogateBuyers.buyers.length} active buyers looking for suppliers`)
        metrics["sokogate_buyers"] = sokogateBuyers.buyers.length
      }

      // Cross-reference: check Sokogate buyer interests against our suppliers
      for (const buyer of sokogateBuyers.buyers) {
        for (const interest of buyer.procurementInterests) {
          const matchingSuppliers = supplierProfiles.filter((s) =>
            s.commodity?.toLowerCase().includes(interest.toLowerCase()) ?? false
          )
          if (matchingSuppliers.length > 0) {
            results.push(`Sokogate match: ${buyer.companyName} (${interest}) ↔ ${matchingSuppliers.length} suppliers`)
          }
        }
      }
    } catch (sokoErr) {
      results.push(`Sokogate platform check: ${sokoErr}`)
    }

    metrics["corridor_matches"] = totalMatches

    // 5. Store matches in agent memory via Central Brain
    if (totalMatches > 0) {
      const { centralBrain } = await import("./hermes-central-brain")
      await centralBrain.addInsight(
        "trade",
        "New trade corridor matches found",
        `Found ${totalMatches} corridor matches across ${allMatches.length} Korean buyer profiles`,
        "pattern",
        { matches: allMatches }
      )
    }

    // 6. Trigger Make.com daily reporting webhook with trade metrics
    try {
      await makeIntegration.triggerDailyReport({
        suppliers_scanned: supplierProfiles.length,
        corridor_matches: totalMatches,
        sokogate_suppliers: metrics["sokogate_suppliers"] || 0,
        sokogate_buyers: metrics["sokogate_buyers"] || 0,
      })
      results.push("Triggered Make.com daily trade report")
    } catch (mErr) {
      results.push(`Make.com trade report trigger skipped: ${mErr}`)
    }

    // 7. LLM analysis
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are the Trade Agent. Analyze supplier matching results and corridor opportunities."],
      ["human", `Suppliers: ${supplierProfiles.length}, Matches: ${totalMatches}\nRaw action: ${rawAction}\n\nProvide a trade corridor analysis.`],
    ])
    const analysis = await analysisPrompt.pipe(llm).pipe(new StringOutputParser()).invoke({})

    return {
      success: true,
      summary: `Trade Agent: Scanned ${supplierProfiles.length} suppliers, found ${totalMatches} corridor matches.`,
      details: [analysis, ...results].join("\n"),
      metrics,
    }
  } catch (error) {
    return {
      success: false,
      summary: `Trade Agent failed: ${(error as Error).message}`,
      errors: [(error as Error).message],
    }
  }
}

/**
 * Check which credentials are available for the Compliance agent's external services.
 */
function checkComplianceCredentials(): Record<string, { configured: boolean; mode: string; hint?: string }> {
  return {
    qme: {
      configured: true, // QMe is always available locally
      mode: "live",
    },
    "make.com": {
      configured: !!process.env.MAKE_COMPLIANCE_WEBHOOK,
      mode: !!process.env.MAKE_COMPLIANCE_WEBHOOK ? "live" : "simulation",
      hint: "Set MAKE_COMPLIANCE_WEBHOOK for automated compliance alerts",
    },
    voiceflow: {
      configured: voiceflowIntegration.isConfigured(),
      mode: voiceflowIntegration.isConfigured() ? "live" : "simulation",
      hint: "Set VOICEFLOW_API_KEY and VOICEFLOW_PROJECT_ID for chatbot dialogs",
    },
    llm: {
      configured: !!(process.env.NVIDIA_NIM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY),
      mode: !!(process.env.NVIDIA_NIM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY) ? "live" : "unavailable",
      hint: "Set NVIDIA_NIM_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY",
    },
  }
}

/**
 * Check which credentials are available for the Onboarding agent's external services.
 */
function checkOnboardingCredentials(): Record<string, { configured: boolean; mode: string; hint?: string }> {
  return {
    email: {
      configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      mode: !!(process.env.SMTP_USER && process.env.SMTP_PASS) ? "live" : "simulation",
      hint: "Set SMTP_USER and SMTP_PASS for live emails (uses Ethereal in dev)",
    },
    qme: {
      configured: true, // QMe is always available locally
      mode: "live",
    },
    voiceflow: {
      configured: voiceflowIntegration.isConfigured(),
      mode: voiceflowIntegration.isConfigured() ? "live" : "simulation",
      hint: "Set VOICEFLOW_API_KEY and VOICEFLOW_PROJECT_ID for chatbot dialogs",
    },
    "zoho-crm": {
      configured: zohoCrmIntegration.isConfigured(),
      mode: zohoCrmIntegration.isConfigured() ? "live" : "simulation",
      hint: "Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN",
    },
    "make.com": {
      configured: !!process.env.MAKE_FOLLOWUP_WEBHOOK,
      mode: !!process.env.MAKE_FOLLOWUP_WEBHOOK ? "live" : "simulation",
      hint: "Set MAKE_FOLLOWUP_WEBHOOK for automated follow-up sequences",
    },
    llm: {
      configured: !!(process.env.NVIDIA_NIM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY),
      mode: !!(process.env.NVIDIA_NIM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY) ? "live" : "unavailable",
      hint: "Set NVIDIA_NIM_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY",
    },
  }
}

/**
 * Check which credentials are available for the Revenue agent's external services.
 */
function checkRevenueCredentials(): Record<string, { configured: boolean; mode: string; hint?: string }> {
  return {
    rag: {
      configured: true, // RAG pipeline is always available locally
      mode: "live",
    },
    "make.com": {
      configured: !!process.env.MAKE_REPORTING_WEBHOOK,
      mode: !!process.env.MAKE_REPORTING_WEBHOOK ? "live" : "simulation",
      hint: "Set MAKE_REPORTING_WEBHOOK for automated daily reports",
    },
    "zoho-crm": {
      configured: zohoCrmIntegration.isConfigured(),
      mode: zohoCrmIntegration.isConfigured() ? "live" : "simulation",
      hint: "Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN",
    },
    llm: {
      configured: !!(process.env.NVIDIA_NIM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY),
      mode: !!(process.env.NVIDIA_NIM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.DEEPSEEK_API_KEY) ? "live" : "unavailable",
      hint: "Set NVIDIA_NIM_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY",
    },
  }
}

// ============================================================
// Compliance Agent — QMe Document Review, Certification Tracking
// ============================================================

export async function complianceAgentAction(
  rawAction: string,
  context: AgentServiceContext
): Promise<ServiceActionResult> {
  const results: string[] = []
  const metrics: Record<string, number> = {}
  const errors: string[] = []

  try {
    // 0. Check credentials and report status
    const creds = checkComplianceCredentials()
    results.push(credentialBanner("Compliance Agent", creds))

    // 1. Fetch compliance records approaching expiry
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const expiringCompliance = await prisma.clientCompliance.findMany({
      where: {
        status: "obtained",
        expiresAt: { lte: thirtyDaysFromNow },
      },
      include: { client: { select: { name: true, email: true } } },
      orderBy: { expiresAt: "asc" },
    })

    metrics["expiring_certs"] = expiringCompliance.length
    results.push(`Found ${expiringCompliance.length} certifications expiring within 30 days`)

    // 2. Process compliance documents through QMe integration
    for (const record of expiringCompliance.slice(0, 10)) {
      try {
        const docContent = [
          `Compliance Document Review`,
          `Client: ${record.client.name}`,
          `Certification: ${record.certificationType}`,
          `Status: ${record.status}`,
          `Issuer: ${record.issuer || "N/A"}`,
          `Expires: ${record.expiresAt?.toISOString() || "N/A"}`,
          `Notes: ${record.notes || "N/A"}`,
        ].join("\n")

        // Process through QMe for document analysis and workflow triggers
        const qmeResult = await qmeIntegration.processDocument(
          Buffer.from(docContent),
          {
            extractEntities: true,
            generateSummary: true,
            checkWorkflows: true,
          }
        )

        results.push(
          `QMe reviewed ${record.certificationType} for ${record.client.name}: ${qmeResult.summary}`
        )
      } catch (e) {
        errors.push(`QMe processing failed for ${record.id}: ${e}`)
      }
    }

    // 3. Trigger Make.com compliance renewal alerts for each expiring cert
    for (const record of expiringCompliance.slice(0, 5)) {
      try {
        const daysUntilExpiry = record.expiresAt
          ? Math.ceil((record.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 30
        await makeIntegration.triggerComplianceAlert({
          clientName: record.client.name,
          certType: record.certificationType,
          expiresAt: record.expiresAt?.toISOString() || "unknown",
          daysUntilExpiry,
        })
        results.push(`Make.com compliance alert sent for ${record.client.name} - ${record.certificationType}`)
      } catch (mErr) {
        errors.push(`Make.com compliance alert failed: ${mErr}`)
      }
    }

    // 4. Run Voiceflow compliance check dialog for high-risk items
    for (const record of expiringCompliance.slice(0, 3)) {
      try {
        const vfResult = await voiceflowIntegration.startDialog(
          "compliance-check",
          { id: record.client.name, name: record.client.name, email: record.client.email },
          {
            client_name: record.client.name,
            cert_type: record.certificationType,
            cert_status: record.status,
          }
        )
        if (vfResult.success) {
          results.push(`Voiceflow compliance check started for ${record.client.name} (${record.certificationType})`)
        }
      } catch (vfErr) {
        results.push(`Voiceflow compliance check skipped: ${vfErr}`)
      }
    }

    // 5. LLM analysis
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are the Compliance Agent. Analyze certification status and document review results."],
      ["human", `Expiring certs: ${expiringCompliance.length}, documents reviewed via QMe: ${Math.min(expiringCompliance.length, 10)}\nRaw action: ${rawAction}\n\nProvide a compliance health report.`],
    ])
    const analysis = await analysisPrompt.pipe(llm).pipe(new StringOutputParser()).invoke({})

    return {
      success: true,
      summary: `Compliance Agent: Reviewed ${Math.min(expiringCompliance.length, 10)} expiring certs via QMe, triggered ${Math.min(expiringCompliance.length, 5)} Make.com alerts and ${Math.min(expiringCompliance.length, 3)} Voiceflow checks.`,
      details: [analysis, ...results].join("\n"),
      metrics,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    return {
      success: false,
      summary: `Compliance Agent failed: ${(error as Error).message}`,
      errors: [(error as Error).message],
    }
  }
}

// ============================================================
// Onboarding Agent — Email, QMe Document Collection
// ============================================================

export async function onboardingAgentAction(
  rawAction: string,
  context: AgentServiceContext
): Promise<ServiceActionResult> {
  const results: string[] = []
  const metrics: Record<string, number> = {}
  const p = context.userPersonalization

  try {
    // 0. Personalization-aware configuration
    if (p) {
      results.push(`[Personalization] Onboarding agent active for ${p.businessName}`)
      results.push(`[Personalization] Goal: ${p.primaryGoal} | Tier: ${p.subscriptionTier ?? "trial"} | Timeline: ${p.timeline ?? "open"}`)
      if (p.currentChallenges) {
        results.push(`[Personalization] User's known onboarding challenge: ${p.currentChallenges}`)
      }
      if (p.secondaryGoals) {
        results.push(`[Personalization] Also interested in: ${p.secondaryGoals}`)
      }
      metrics["personalization_loaded"] = 1
    }

    // 1. Check credentials and report status
    const creds = checkOnboardingCredentials()
    results.push(credentialBanner("Onboarding Agent", creds))

    // 1. Fetch clients stuck in onboarding — prioritize newer clients for this user's segment
    let onboardingClients = await prisma.client.findMany({
      where: { status: "onboarding" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "asc" },
      take: 20,
    })

    const stuckThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days without update
    const trulyStuck = onboardingClients.filter((c) => new Date(c.updatedAt) < stuckThreshold)

    const userGoal = (p?.primaryGoal || "").toLowerCase()
    if (p?.companySize && userGoal.length > 0) {
      const sizePref = (p.companySize || "").toLowerCase()
      if (sizePref.includes("small") || sizePref.includes("micro")) {
        results.push(`[Personalization] Light-touch onboarding for small/micro business segment`)
      }
    }
    metrics["onboarding_stuck"] = trulyStuck.length
    results.push(`Found ${trulyStuck.length} clients truly stuck in onboarding`)

    // 2. Send email reminders for stuck clients
    let emailsSent = 0
    for (const client of trulyStuck.slice(0, 5)) {
      try {
        await sendWelcomeEmail(
          client.email,
          client.name
        )
        emailsSent++
        results.push(`Sent onboarding reminder email to ${client.name} (${client.email})`)
      } catch (e) {
        results.push(`Failed to send email to ${client.name}: ${e}`)
      }
    }

    metrics["emails_sent"] = emailsSent

    // 3. Create QMe workflow for any client documents present in the DB
    //    (In production, this would trigger actual document collection flows)
    try {
      const qmeTriggerId = qmeIntegration.addWorkflowTrigger({
        workflowName: "Onboarding Document Collection",
        conditions: {
          documentType: ["onboarding", "application"],
          contentContains: ["new client", "onboarding", "document"],
        },
        actions: [
          { type: "tag_document", parameters: { tag: "onboarding-pending" } },
          { type: "extract_contact_info", parameters: {} },
          { type: "create_followup_task", parameters: { dueDateOffset: 2, taskType: "document_collection" } },
        ],
      })
      results.push(`Created QMe onboarding document workflow (trigger: ${qmeTriggerId})`)
    } catch (e) {
      results.push(`QMe workflow creation skipped: ${e}`)
    }

    // 4. Trigger Voiceflow welcome dialog for new onboarding clients
    for (const client of trulyStuck.slice(0, 3)) {
      try {
        const vfResult = await voiceflowIntegration.startDialog(
          "onboarding-welcome",
          { id: client.id, name: client.name, email: client.email },
          { user_name: client.name, user_email: client.email, user_company: client.company }
        )
        if (vfResult.success) {
          results.push(`Voiceflow onboarding welcome started for ${client.name}`)
        }
      } catch (vfErr) {
        results.push(`Voiceflow welcome skipped for ${client.name}: ${vfErr}`)
      }
    }

    // 5. Sync onboarded clients to Zoho CRM
    for (const client of trulyStuck.slice(0, 3)) {
      try {
        const syncResult = await zohoCrmIntegration.syncClientToCrm({
          name: client.name,
          email: client.email,
          company: client.company || undefined,
          status: "onboarding",
          corridor: client.corridor || undefined,
        })
        if (syncResult.contactId) {
          results.push(`Synced ${client.name} to Zoho CRM (deal: ${syncResult.dealId || "pending"})`)
        }
      } catch (crmErr) {
        results.push(`Zoho CRM sync skipped for ${client.name}: ${crmErr}`)
      }
    }

    // 6. Trigger Make.com follow-up sequence for each stuck client
    for (const client of trulyStuck.slice(0, 3)) {
      try {
        await makeIntegration.triggerFollowUpSequence({
          name: client.name,
          email: client.email,
          phone: client.phone || undefined,
          stage: "onboarding-stuck",
          daysSinceLastContact: Math.ceil((Date.now() - new Date(client.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
        })
        results.push(`Make.com follow-up sequence triggered for ${client.name}`)
      } catch (mErr) {
        results.push(`Make.com follow-up skipped for ${client.name}: ${mErr}`)
      }
    }

    // 7. LLM analysis
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are the Onboarding Agent. Analyze the onboarding pipeline and suggest improvements."],
      ["human", `Clients stuck: ${onboardingClients.length}, emails sent: ${emailsSent}\nRaw action: ${rawAction}\n\nProvide an onboarding pipeline analysis.`],
    ])
    const analysis = await analysisPrompt.pipe(llm).pipe(new StringOutputParser()).invoke({})

    return {
      success: true,
      summary: `Onboarding Agent: Contacted ${emailsSent}/${onboardingClients.length} stuck clients, set up QMe, Voiceflow, Make.com, and Zoho CRM sync.`,
      details: [analysis, ...results].join("\n"),
      metrics,
    }
  } catch (error) {
    return {
      success: false,
      summary: `Onboarding Agent failed: ${(error as Error).message}`,
      errors: [(error as Error).message],
    }
  }
}

// ============================================================
// Revenue Agent — Financial Metrics, Email Invoicing
// ============================================================

export async function revenueAgentAction(
  rawAction: string,
  context: AgentServiceContext
): Promise<ServiceActionResult> {
  const results: string[] = []
  const metrics: Record<string, number> = {}
  const p = context.userPersonalization

  try {
    // 0. Check credentials and report status
    const creds = checkRevenueCredentials()
    results.push(credentialBanner("Revenue Agent", creds))

    // 1. Fetch revenue data
    const totalRevenue = await prisma.revenueEntry.aggregate({
      _sum: { amount: true },
    })

    const monthlyRevenue = await prisma.revenueEntry.aggregate({
      _sum: { amount: true },
      where: {
        date: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    })

    const activeClients = await prisma.client.count({
      where: { status: "active" },
    })

    const pipelineValue = await prisma.client.aggregate({
      _sum: { monthlyRetainer: true },
      where: { status: { in: ["qualified", "proposal"] } },
    })

    metrics["total_revenue"] = totalRevenue._sum.amount || 0
    metrics["monthly_revenue"] = monthlyRevenue._sum.amount || 0
    metrics["active_clients"] = activeClients
    metrics["pipeline_value"] = pipelineValue._sum.monthlyRetainer || 0

    results.push(`Total revenue: $${metrics["total_revenue"]}`)
    results.push(`Monthly revenue: $${metrics["monthly_revenue"]}`)
    results.push(`Active clients: ${activeClients}`)
    results.push(`Pipeline value: $${metrics["pipeline_value"]}`)

    // 2. Send revenue summary via RAG pipeline (stores for future reference)
    const revenueSummary = [
      `Revenue Summary — ${new Date().toLocaleDateString()}`,
      `Total Revenue: $${metrics["total_revenue"]}`,
      `Monthly (30d): $${metrics["monthly_revenue"]}`,
      `Active Clients: ${activeClients}`,
      `Pipeline Value: $${metrics["pipeline_value"]}`,
    ].join("\n")

    await ragPipeline.processDocument(
      Buffer.from(revenueSummary),
      {
        agentType: "revenue" as AgentType,
        sessionId: context.sessionId,
        timestamp: Date.now(),
        type: "revenue_summary",
      },
      { type: "text" }
    )

    results.push("Revenue summary stored in RAG knowledge base")

    // 3. Trigger Make.com daily reporting scenario with revenue metrics
    try {
      await makeIntegration.triggerDailyReport({
        total_revenue: metrics["total_revenue"],
        monthly_revenue: metrics["monthly_revenue"],
        active_clients: activeClients,
        pipeline_value: metrics["pipeline_value"],
      })
      results.push("Make.com daily revenue report triggered")
    } catch (mErr) {
      results.push(`Make.com revenue report skipped: ${mErr}`)
    }

    // 4. Sync active clients as deals in Zoho CRM
    const activeClientList = await prisma.client.findMany({
      where: { status: "active" },
      select: { name: true, email: true, company: true, corridor: true, tier: true, ersScore: true },
      take: 5,
    })
    for (const client of activeClientList) {
      try {
        const syncResult = await zohoCrmIntegration.syncClientToCrm({
          name: client.name,
          email: client.email,
          company: client.company || undefined,
          status: "active",
          ersScore: client.ersScore || undefined,
          tier: client.tier || undefined,
          corridor: client.corridor || undefined,
        })
        if (syncResult.dealId) {
          results.push(`Zoho CRM deal synced for ${client.name} (deal: ${syncResult.dealId})`)
        }
      } catch (crmErr) {
        results.push(`Zoho CRM sync skipped for ${client.name}: ${crmErr}`)
      }
    }

    // 5. LLM analysis
    const userContext = p
      ? `Their goal is ${p.primaryGoal}, company size ${p.companySize || "unknown"}, budget ${p.budgetRange || "unknown"}.`
      : ""
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are the Revenue Agent. Analyze revenue data and provide financial insights."],
      ["human", `Total: $${metrics["total_revenue"]}, Monthly: $${metrics["monthly_revenue"]}, Active: ${activeClients}, Pipeline: $${metrics["pipeline_value"]}\nRaw action: ${rawAction}\n${userContext}\n\nProvide a revenue analysis with growth recommendations.`],
    ])
    const analysis = await analysisPrompt.pipe(llm).pipe(new StringOutputParser()).invoke({})

    return {
      success: true,
      summary: `Revenue Agent: $${metrics["total_revenue"]} total, $${metrics["monthly_revenue"]} monthly, ${activeClients} active clients. Synced to Make.com and Zoho CRM.`,
      details: [analysis, ...results].join("\n"),
      metrics,
    }
  } catch (error) {
    const err = error as Error
    console.error("[RevenueAgent] Error:", err.message, err.stack)
    return {
      success: false,
      summary: `Revenue Agent failed: ${err.message}`,
      errors: [err.message],
    }
  }
}

// ============================================================
// Agent Registration Data (consumed by hermes-agent.ts for Central Brain)
// ============================================================

/**
 * Get agent registration metadata for Central Brain registration.
 * Called from hermes-agent.ts to avoid circular dependency.
 */
export function getAgentRegistrations(): Array<{
  agentType: string
  displayName: string
  description: string
  capabilities: Array<{ name: string; description: string }>
  status: string
}> {
  return [
    {
      agentType: "revstack",
      displayName: "RevStack Analytics Agent",
      description: "Provides revenue automation dashboard data — KPIs, revenue timeline, pipeline funnel, activity feed, and Hermes run history",
      capabilities: [
        { name: "dashboard-stats", description: "Query KPI metrics (leads, clients, MRR, conversion rate)" },
        { name: "revenue-timeline", description: "Compute projected retainer revenue over 6 months" },
        { name: "pipeline-funnel", description: "Break down lead pipeline by stage (new, qualified, disqualified, converted)" },
        { name: "recent-activity", description: "Fetch recent activity log entries" },
        { name: "hermes-runs", description: "Query recent Hermes autonomous operation runs" },
      ],
      status: "active",
    },
    {
      agentType: "lead",
      displayName: "Lead Agent",
      description: "Qualifies leads, sends WhatsApp follow-ups via WATI, syncs to Zoho CRM, launches Instantly.ai outreach campaigns",
      capabilities: [
        { name: "qualify-leads", description: "Score and qualify unprocessed leads from the pipeline" },
        { name: "send-whatsapp", description: "Send WhatsApp messages via WATI API" },
        { name: "sync-crm", description: "Sync leads and clients to Zoho CRM contacts and deals" },
        { name: "launch-outreach", description: "Launch cold email campaigns via Instantly.ai" },
        { name: "voiceflow-dialog", description: "Run lead qualification dialogs via Voiceflow" },
        { name: "trigger-make", description: "Trigger Make.com lead capture webhooks" },
      ],
      status: "active",
    },
    {
      agentType: "trade",
      displayName: "Trade Agent",
      description: "Manages corridor matching, supplier discovery, Sokogate platform integration, and trade analysis",
      capabilities: [
        { name: "match-suppliers", description: "Match suppliers against buyer profiles using internal engine" },
        { name: "discover-corridors", description: "Discover and analyze trade corridors (Korea, Europe, Middle East)" },
        { name: "sokogate-platform", description: "Query Sokogate for supplier and buyer discovery" },
        { name: "analyze-corridor", description: "Cross-reference buyer interests with supplier profiles" },
        { name: "trigger-reporting", description: "Trigger Make.com daily trade reporting" },
      ],
      status: "active",
    },
    {
      agentType: "compliance",
      displayName: "Compliance Agent",
      description: "Reviews expiring certifications, processes documents via QMe, sends renewal alerts",
      capabilities: [
        { name: "check-expiry", description: "Check certifications expiring within 30 days" },
        { name: "process-documents", description: "Process compliance documents through QMe integration" },
        { name: "send-renewal-alerts", description: "Send compliance renewal alerts via Make.com" },
        { name: "voiceflow-checks", description: "Run Voiceflow compliance check dialogs" },
      ],
      status: "active",
    },
    {
      agentType: "onboarding",
      displayName: "Onboarding Agent",
      description: "Follows up with stuck clients, sends email reminders, creates QMe workflows",
      capabilities: [
        { name: "find-stuck-clients", description: "Identify clients stuck in onboarding for >7 days" },
        { name: "send-email-reminders", description: "Send personalized email reminders to stuck clients" },
        { name: "create-qme-workflows", description: "Create QMe document collection workflows" },
        { name: "voiceflow-welcome", description: "Start Voiceflow onboarding welcome dialogs" },
        { name: "sync-zoho-crm", description: "Sync onboarding progress to Zoho CRM" },
        { name: "trigger-make-sequences", description: "Trigger Make.com follow-up sequences" },
      ],
      status: "active",
    },
    {
      agentType: "revenue",
      displayName: "Revenue Agent",
      description: "Computes financial metrics, stores in RAG, syncs to Zoho CRM deals, triggers reporting",
      capabilities: [
        { name: "compute-revenue", description: "Calculate total, monthly, and pipeline revenue" },
        { name: "store-in-rag", description: "Store revenue summaries in the RAG knowledge base" },
        { name: "sync-zoho-deals", description: "Sync active clients as deals in Zoho CRM" },
        { name: "trigger-make-reporting", description: "Trigger Make.com daily revenue reporting" },
      ],
      status: "active",
    },
    {
      agentType: "revstack-ops",
      displayName: "RevStack Operations Agent",
      description: "Automates retainer invoicing and client health scoring — generates invoices from active retainers and scores client engagement, compliance, and revenue health",
      capabilities: [
        { name: "generate-invoices", description: "Generate invoices from active retainers due for billing" },
        { name: "client-health-score", description: "Score client health on revenue, engagement, compliance, status, and tenure" },
      ],
      status: "active",
    },
    {
      agentType: "revstack-page-data",
      displayName: "RevStack Page Data Agent",
      description: "Provides unified read queries for all RevStack pages — leads, retainers, followups, messages, campaigns, clients, pipeline-actions, revenue, hermes, and god-mode data all routed through the Central Brain",
      capabilities: [
        { name: "leads", description: "List leads with status and search filters" },
        { name: "retainers", description: "List retainers with client details, supports combined client picker" },
        { name: "followups", description: "List followups with status and scoping filters" },
        { name: "messages", description: "List messages with channel filter" },
        { name: "campaigns", description: "List outreach campaigns with steps" },
        { name: "clients", description: "List pipeline clients with products, compliance, retainers" },
        { name: "pipeline-actions", description: "List pipeline actions by client" },
        { name: "invoices", description: "List invoices with client details, supports status and clientId filters" },
        { name: "client-health", description: "Score client health on revenue, engagement, compliance, status, and tenure" },
        { name: "revenue", description: "List revenue entries" },
        { name: "hermes", description: "List Hermes agent operations" },
        { name: "god-mode", description: "Get God Mode operations and system status" },
      ],
      status: "active",
    },
  ]
}

// ============================================================
// RevStack Analytics Agent — Dashboard, Revenue, Pipeline, Activity
// ============================================================

/**
 * RevStack Agent — Revenue Automation Dashboard Data
 *
 * Provides all data needed by the RevStack dashboard through a single
 * Central Brain action. Queries the database and returns structured analytics.
 */
export async function revstackAgentAction(
  rawAction: string,
  _context: AgentServiceContext
): Promise<ServiceActionResult> {
  const results: string[] = []
  const metrics: Record<string, number> = {}
  const p = _context.userPersonalization

  // Parse userId from action string: "section|userId"
  // The API route appends the authenticated user's ID to the section name
  const [section, userId] = rawAction.split("|")
  const userFilter = userId ? { userId } : {}

  try {
    // 0. Personalization-aware agent kickoff
    if (p) {
      results.push(`[Personalization] RevStack dashboard for ${p.businessName}`)
      results.push(`[Personalization] Industry: ${p.industry} | Goal: ${p.primaryGoal} | Tier: ${p.subscriptionTier ?? "trial"}`)
      if (p.servicesNeeded) {
        results.push(`[Personalization] Services of interest: ${p.servicesNeeded}`)
      }
      metrics["personalization_loaded"] = 1
    }
    // Determine which subset of data to fetch based on the section
    const action = (section || "").toLowerCase()
    const fetchDashboard = action.includes("dashboard") || action.includes("all") || !action
    const fetchRevenue = action.includes("revenue") || action.includes("all") || !action
    const fetchPipeline = action.includes("pipeline") || action.includes("all") || !action
    const fetchActivity = action.includes("activity") || action.includes("all") || !action
    const fetchInvoices = action.includes("invoice") || action.includes("all") || !action
    const fetchHealth = action.includes("health") || action.includes("client-health") || action.includes("all") || !action

    const data: Record<string, any> = {}

    // 1. Dashboard KPI metrics — scoped to the requesting user
    if (fetchDashboard) {
      // Followup and Message models are scoped via leadId/clientId (no direct userId),
      // so they're queried globally for the dashboard summary view
      const [leads, clients, activeRetainers, pendingFollowups, messages, hermesRuns] = await Promise.all([
        prisma.lead.findMany({ where: userFilter, select: { id: true, status: true } }),
        prisma.client.findMany({ where: userFilter, select: { id: true, status: true } }),
        prisma.retainer.findMany({ where: { ...userFilter, status: "active" }, select: { amountUsd: true, billingCycle: true } }),
        prisma.followup.findMany({ where: { status: "pending" }, select: { id: true } }),
        prisma.message.findMany({ select: { id: true } }),
        prisma.hermesRun.findMany({ where: userFilter, select: { id: true, createdAt: true } }),
      ])

      const totalLeads = leads.length
      const qualifiedLeads = leads.filter((l) => l.status === "qualified").length
      const activeClients = clients.filter((c) => c.status === "active" || c.status === "onboarding").length

      const mrr = activeRetainers.reduce((sum, r) => {
        if (r.billingCycle === "monthly") return sum + r.amountUsd
        if (r.billingCycle === "quarterly") return sum + r.amountUsd / 3
        if (r.billingCycle === "annual") return sum + r.amountUsd / 12
        return sum
      }, 0)

      const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const hermesRunsToday = hermesRuns.filter((r) => new Date(r.createdAt) >= today).length

      data.stats = {
        totalLeads,
        qualifiedLeads,
        activeClients,
        monthlyRecurringRevenue: Math.round(mrr * 100) / 100,
        pendingFollowups: pendingFollowups.length,
        conversionRate: Math.round(conversionRate * 10) / 10,
        totalMessages: messages.length,
        hermesRunsToday,
      }

      results.push(`Dashboard: ${totalLeads} leads, ${activeClients} active clients, $${Math.round(mrr)} MRR`)
      metrics["total_leads"] = totalLeads
      metrics["active_clients"] = activeClients
      metrics["mrr"] = Math.round(mrr)
    }

    // 2. Revenue timeline — scoped to the requesting user
    if (fetchRevenue) {
      const retainers = await prisma.retainer.findMany({
        where: { ...userFilter, status: "active" },
        select: { amountUsd: true, billingCycle: true, startDate: true },
      })
      const clients = await prisma.client.findMany({
        where: userFilter,
        select: { id: true, createdAt: true },
      })

      const months = 6
      const revenuePoints: Array<{ month: string; revenue: number; newClients: number }> = []
      const now = new Date()

      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = d.toLocaleString("default", { month: "short", year: "2-digit" })

        const newClients = clients.filter((c) => {
          const cd = new Date(c.createdAt)
          return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth()
        }).length

        const revenue = retainers.reduce((sum, r) => {
          const start = new Date(r.startDate)
          if (start <= d) {
            if (r.billingCycle === "monthly") return sum + r.amountUsd
            if (r.billingCycle === "quarterly") return sum + r.amountUsd / 3
            if (r.billingCycle === "annual") return sum + r.amountUsd / 12
          }
          return sum
        }, 0)

        revenuePoints.push({
          month: label,
          revenue: Math.round(revenue * 100) / 100,
          newClients,
        })
      }

      data.revenue = revenuePoints
      results.push(`Revenue: ${revenuePoints.length} months projected`)
    }

    // 3. Pipeline breakdown
    if (fetchPipeline) {
      const leads = await prisma.lead.findMany({ select: { status: true } })

      data.pipeline = {
        new: leads.filter((l) => l.status === "new").length,
        qualified: leads.filter((l) => l.status === "qualified").length,
        disqualified: leads.filter((l) => l.status === "disqualified").length,
        converted: leads.filter((l) => l.status === "converted").length,
      }

      results.push(`Pipeline: ${data.pipeline.new} new, ${data.pipeline.qualified} qualified, ${data.pipeline.converted} converted`)
    }

    // 4. Recent activity
    if (fetchActivity) {
      const activity = await prisma.activity.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      })

      data.activity = activity
      results.push(`Activity: ${activity.length} recent events`)
    }

    // 5. Invoices — recent invoice list for dashboard widget
    if (fetchInvoices) {
      const invoices = await prisma.invoice.findMany({
        orderBy: { issuedAt: "desc" },
        take: 8,
        include: {
          client: { select: { name: true, company: true } },
        },
      })

      // Compute invoice summary metrics
      const totalOutstanding = invoices
        .filter((i) => i.status === "draft" || i.status === "sent" || i.status === "overdue")
        .reduce((sum, i) => sum + i.amountUsd, 0)
      const overdueCount = invoices.filter((i) => i.status === "overdue").length
      const paidThisMonth = invoices
        .filter((i) => i.status === "paid" && i.paidAt && new Date(i.paidAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, i) => sum + i.amountUsd, 0)

      data.invoices = invoices
      data.invoiceMetrics = {
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        overdueCount,
        paidThisMonth: Math.round(paidThisMonth * 100) / 100,
        totalInvoices: invoices.length,
      }
      results.push(`Invoices: ${invoices.length} recent, $${Math.round(totalOutstanding)} outstanding, ${overdueCount} overdue`)
    }

    // 6. Client health scores — scored health tiers for dashboard widget
    if (fetchHealth) {
      // Score active/onboarding/qualified clients on the same 5 dimensions as revstack-ops agent
      const clients = await prisma.client.findMany({
        where: { status: { in: ["active", "onboarding", "qualified"] } },
        include: {
          retainers: { where: { status: "active" }, select: { amountUsd: true, billingCycle: true } },
          complianceRecords: { select: { status: true, expiresAt: true } },
          followups: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        },
      })

      const now = new Date()
      let healthyCount = 0
      let mediumRiskCount = 0
      let highRiskCount = 0
      let totalScore = 0

      const scoredClients = clients.map((c) => {
        // Revenue score (0-30)
        const totalRetainerValue = c.retainers.reduce((sum, r) => sum + r.amountUsd, 0)
        const revenueScore = Math.min(30, Math.round(totalRetainerValue / 100))

        // Engagement score (0-25)
        const lastFollowup = c.followups[0]?.createdAt
        const daysSinceContact = lastFollowup
          ? Math.round((now.getTime() - new Date(lastFollowup).getTime()) / (1000 * 60 * 60 * 24))
          : 999
        const engagementScore = daysSinceContact < 7 ? 25
          : daysSinceContact < 14 ? 18
          : daysSinceContact < 30 ? 10
          : daysSinceContact < 60 ? 5
          : 0

        // Compliance score (0-20)
        const obtained = c.complianceRecords.filter((r) => r.status === "obtained")
        const expiring = obtained.filter((r) => r.expiresAt && new Date(r.expiresAt) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
        const complianceScore = c.complianceRecords.length === 0 ? 10
          : expiring.length === 0 && obtained.length > 0 ? 20
          : expiring.length <= obtained.length / 2 ? 15
          : 5

        // Status score (0-15)
        const statusScore = c.status === "active" ? 15 : c.status === "onboarding" ? 8 : c.status === "qualified" ? 5 : 0

        // Tenure score (0-10)
        const daysSinceCreated = Math.round((now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        const tenureScore = daysSinceCreated > 365 ? 10 : daysSinceCreated > 180 ? 8 : daysSinceCreated > 90 ? 6 : daysSinceCreated > 30 ? 4 : 2

        const score = revenueScore + engagementScore + complianceScore + statusScore + tenureScore
        const tier = score >= 70 ? "healthy" : score >= 45 ? "medium" : "high-risk"

        if (tier === "healthy") healthyCount++
        else if (tier === "medium") mediumRiskCount++
        else highRiskCount++
        totalScore += score

        return {
          id: c.id,
          name: c.name,
          company: c.company,
          status: c.status,
          tier,
          score,
          retainerValue: totalRetainerValue,
          factors: { revenue: revenueScore, engagement: engagementScore, compliance: complianceScore, status: statusScore, tenure: tenureScore },
        }
      })

      // Sort: high-risk first, then by score ascending
      scoredClients.sort((a, b) => {
        const tierRank = { "high-risk": 0, medium: 1, healthy: 2 }
        const aRank = tierRank[a.tier as keyof typeof tierRank] ?? 3
        const bRank = tierRank[b.tier as keyof typeof tierRank] ?? 3
        if (aRank !== bRank) return aRank - bRank
        return a.score - b.score
      })

      data.clientHealth = {
        scoredClients: scoredClients.slice(0, 12),
        healthyCount,
        mediumRiskCount,
        highRiskCount,
        totalScored: clients.length,
        averageScore: clients.length > 0 ? Math.round(totalScore / clients.length) : 0,
      }
      results.push(`Client Health: ${data.clientHealth.totalScored} scored — ${healthyCount} healthy, ${mediumRiskCount} medium, ${highRiskCount} high-risk`)
    }

    // 7. Recent Hermes runs
    const runs = await prisma.hermesRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    })
    data.runs = runs

    results.push(`Hermes: ${runs.length} recent runs`)

    return {
      success: true,
      summary: `RevStack Agent: ${results.join(" | ")}`,
      details: JSON.stringify(data),
      metrics,
    }
  } catch (error) {
    return {
      success: false,
      summary: `RevStack Agent failed: ${(error as Error).message}`,
      errors: [(error as Error).message],
    }
  }
}

// ============================================================
// RevStack Page Data Agent — Routes all RevStack page reads through Central Brain
// ============================================================

/**
 * RevStack Page Data Agent — Unified data provider for all RevStack pages.
 *
 * Handles READ queries for: leads, retainers, followups, messages, campaigns,
 * clients, pipeline-actions, revenue, hermes, and god-mode.
 *
 * Action format: "<page>|<sub-action>|<params-json>"
 * Example: "leads|list|{"status":"new","search":"coffee"}"
 *
 * All queries are logged through the Central Brain CommunicationLog.
 */
export async function revstackPageDataAgentAction(
  rawAction: string,
  _context: AgentServiceContext
): Promise<ServiceActionResult> {
  const errors: string[] = []
  const metrics: Record<string, number> = {}

  try {
    // Parse: "page|subAction|paramsJson"
    const parts = rawAction.split("|")
    const page = (parts[0] || "").toLowerCase()
    const subAction = (parts[1] || "list").toLowerCase()
    let params: Record<string, any> = {}
    try {
      if (parts[2]) params = JSON.parse(parts[2])
    } catch { /* Ignore malformed params */ }

    let data: any = null

    switch (page) {
      // ── Leads ────────────────────────────────────────────
      case "leads": {
        const where: any = {}
        if (params.status && params.status !== "all") where.status = params.status
        if (params.search) {
          where.OR = [
            { companyName: { contains: params.search } },
            { contactName: { contains: params.search } },
            { email: { contains: params.search } },
          ]
        }
        data = await prisma.lead.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: params.limit || 100,
        })
        metrics["count"] = Array.isArray(data) ? data.length : 0
        break
      }

      // ── Retainers ─────────────────────────────────────────
      case "retainers": {
        data = await prisma.retainer.findMany({
          orderBy: { createdAt: "desc" },
          include: { client: { select: { name: true, company: true } } },
        })
        // For client picker, also return clients list
        if (subAction === "list-with-clients") {
          const clients = await prisma.client.findMany({
            select: { id: true, name: true, company: true },
            orderBy: { name: "asc" },
          })
          data = { retainers: data, clients }
        }
        metrics["count"] = Array.isArray(data) ? data.length : 0
        break
      }

      // ── Followups ─────────────────────────────────────────
      case "followups": {
        const where: any = {}
        if (params.status && params.status !== "all") where.status = params.status
        if (params.leadId) where.leadId = params.leadId
        if (params.clientId) where.clientId = params.clientId
        data = await prisma.followup.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: params.limit || 100,
        })
        metrics["count"] = data.length
        break
      }

      // ── Messages ──────────────────────────────────────────
      case "messages": {
        const where: any = {}
        if (params.channel && params.channel !== "all") where.channel = params.channel
        data = await prisma.message.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: params.limit || 100,
        })
        metrics["count"] = data.length
        break
      }

      // ── Campaigns ─────────────────────────────────────────
      case "campaigns": {
        data = await prisma.outreachCampaign.findMany({
          orderBy: { createdAt: "desc" },
          include: { steps: { orderBy: { stepNumber: "asc" } } },
          take: params.limit || 50,
        })
        metrics["count"] = data.length
        break
      }

      // ── Clients (pipeline) ────────────────────────────────
      case "clients": {
        const where: any = {}
        if (params.status) where.status = params.status
        if (params.corridor) where.corridor = params.corridor
        if (params.search) {
          where.OR = [
            { name: { contains: params.search } },
            { company: { contains: params.search } },
            { email: { contains: params.search } },
          ]
        }
        data = await prisma.client.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            products: true,
            complianceRecords: true,
            retainers: { where: { status: "active" } },
          },
          take: params.limit || 100,
        })
        metrics["count"] = data.length
        break
      }

      // ── Pipeline Actions ──────────────────────────────────
      case "pipeline-actions": {
        const where: any = {}
        if (params.clientId) where.clientId = params.clientId
        data = await prisma.pipelineAction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: params.limit || 50,
        })
        metrics["count"] = data.length
        break
      }

      // ── Products (trade page) ────────────────────────────
      case "products": {
        const where: any = {}
        if (params.clientId) where.clientId = params.clientId
        data = await prisma.clientProduct.findMany({
          where,
          orderBy: { name: "asc" },
          take: params.limit || 200,
        })
        metrics["count"] = data.length
        break
      }

      // ── Compliance Records (trade page) ────────────────────
      case "compliance-records": {
        const where: any = {}
        if (params.clientId) where.clientId = params.clientId
        data = await prisma.clientCompliance.findMany({
          where,
          orderBy: { appliedAt: "desc" },
          include: { product: { select: { name: true } } },
          take: params.limit || 200,
        })
        metrics["count"] = data.length
        break
      }

      // ── Trade Finance Applications (trade page) ────────────
      case "trade-finance": {
        const where: any = {}
        if (params.clientId) where.clientId = params.clientId
        data = await prisma.tradeFinanceApplication.findMany({
          where,
          orderBy: { appliedAt: "desc" },
          take: params.limit || 100,
        })
        metrics["count"] = data.length
        break
      }

      // ── ERS Snapshots (trade page) ─────────────────────────
      case "ers-snapshots": {
        const where: any = {}
        if (params.clientId) where.clientId = params.clientId
        data = await prisma.ersSnapshot.findMany({
          where,
          orderBy: { snapshotDate: "desc" },
          take: params.limit || 50,
        })
        metrics["count"] = data.length
        break
      }

      // ── Invoices ───────────────────────────────────────────
      case "invoices": {
        const where: any = {}
        if (params.status && params.status !== "all") where.status = params.status
        if (params.clientId) where.clientId = params.clientId
        data = await prisma.invoice.findMany({
          where,
          orderBy: { issuedAt: "desc" },
          take: params.limit || 100,
          include: {
            client: { select: { name: true, company: true } },
          },
        })
        metrics["count"] = data.length
        break
      }

      // ── Client Health Scores ───────────────────────────────
      case "client-health": {
        // Fetch clients with retainers, compliance, and followups for scoring
        const clients = await prisma.client.findMany({
          where: { status: { in: ["active", "onboarding", "qualified"] } },
          include: {
            retainers: { where: { status: "active" }, select: { amountUsd: true, billingCycle: true } },
            complianceRecords: { select: { status: true, expiresAt: true } },
            followups: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
          },
        })

        const now = new Date()
        let healthyCount = 0
        let mediumRiskCount = 0
        let highRiskCount = 0
        let totalScore = 0

        const scoredClients = clients.map((c) => {
          // Revenue score (0-30)
          const totalRetainerValue = c.retainers.reduce((sum, r) => sum + r.amountUsd, 0)
          const revenueScore = Math.min(30, Math.round(totalRetainerValue / 100))

          // Engagement score (0-25)
          const lastFollowup = c.followups[0]?.createdAt
          const daysSinceContact = lastFollowup
            ? Math.round((now.getTime() - new Date(lastFollowup).getTime()) / (1000 * 60 * 60 * 24))
            : 999
          const engagementScore = daysSinceContact < 7 ? 25
            : daysSinceContact < 14 ? 18
            : daysSinceContact < 30 ? 10
            : daysSinceContact < 60 ? 5
            : 0

          // Compliance score (0-20)
          const obtained = c.complianceRecords.filter((r) => r.status === "obtained")
          const expiring = obtained.filter(
            (r) => r.expiresAt && new Date(r.expiresAt) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          )
          const complianceScore = c.complianceRecords.length === 0 ? 10
            : expiring.length === 0 && obtained.length > 0 ? 20
            : expiring.length <= obtained.length / 2 ? 15
            : 5

          // Status score (0-15)
          const statusScore = c.status === "active" ? 15 : c.status === "onboarding" ? 8 : c.status === "qualified" ? 5 : 0

          // Tenure score (0-10)
          const daysSinceCreated = Math.round(
            (now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          )
          const tenureScore = daysSinceCreated > 365 ? 10 : daysSinceCreated > 180 ? 8 : daysSinceCreated > 90 ? 6 : daysSinceCreated > 30 ? 4 : 2

          const score = revenueScore + engagementScore + complianceScore + statusScore + tenureScore
          const tier = score >= 70 ? "healthy" : score >= 45 ? "medium" : "high-risk"

          if (tier === "healthy") healthyCount++
          else if (tier === "medium") mediumRiskCount++
          else highRiskCount++
          totalScore += score

          return {
            id: c.id,
            name: c.name,
            company: c.company,
            status: c.status,
            tier,
            score,
            retainerValue: totalRetainerValue,
            factors: { revenue: revenueScore, engagement: engagementScore, compliance: complianceScore, status: statusScore, tenure: tenureScore },
          }
        })

        // Sort: high-risk first, then by score ascending
        scoredClients.sort((a, b) => {
          const tierRank = { "high-risk": 0, medium: 1, healthy: 2 }
          const aRank = tierRank[a.tier as keyof typeof tierRank] ?? 3
          const bRank = tierRank[b.tier as keyof typeof tierRank] ?? 3
          if (aRank !== bRank) return aRank - bRank
          return a.score - b.score
        })

        data = {
          scoredClients: scoredClients.slice(0, 12),
          healthyCount,
          mediumRiskCount,
          highRiskCount,
          totalScored: clients.length,
          averageScore: clients.length > 0 ? Math.round(totalScore / clients.length) : 0,
        }
        metrics["count"] = clients.length
        break
      }

      // ── Revenue Entries (financial page) ──────────────────
      case "revenue": {
        data = await prisma.revenueEntry.findMany({
          orderBy: { date: "desc" },
          take: params.limit || 100,
        })
        metrics["count"] = data.length
        break
      }

      // ── Hermes Operations ─────────────────────────────────
      case "hermes": {
        const { hermesAgent } = await import("./hermes-agent")
        data = hermesAgent.getAllOperations()
        metrics["count"] = data.length
        break
      }

      // ── God Mode Operations ───────────────────────────────
      case "god-mode": {
        const { hermesAgent } = await import("./hermes-agent")
        data = {
          operations: hermesAgent.getAllOperations(),
          systemStatus: hermesAgent.getSystemStatus(),
        }
        metrics["count"] = data.operations?.length || 0
        break
      }        default:
        return {
          success: false,
          summary: `Unknown RevStack page: ${page}`,
          errors: [`Unknown page: ${page}. Supported: leads, retainers, followups, messages, campaigns, clients, pipeline-actions, invoices, client-health, revenue, hermes, god-mode, products, compliance-records, trade-finance, ers-snapshots`],
        }
    }

    return {
      success: true,
      summary: `RevStack Page Data: ${page} — ${metrics["count"]} records`,
      details: JSON.stringify(data),
      metrics,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    return {
      success: false,
      summary: `RevStack Page Data Agent failed: ${(error as Error).message}`,
      errors: [(error as Error).message],
    }
  }
}

// ============================================================
// RevStack Operations Agent — Automated Invoicing & Client Health
// ============================================================

/**
 * RevStack Operations Agent — Automated Retainer Invoicing & Client Health Scoring
 *
 * This dedicated agent handles two core RevStack operations:
 *   1. generate-invoices — Generates invoices from active retainers due for billing
 *   2. client-health-score — Scores clients on engagement, payment, compliance, and activity
 *
 * Actions are dispatched via the action string: "generate-invoices" or "client-health-score"
 * or "all" to run both.
 */
export async function revstackOperationsAgentAction(
  rawAction: string,
  _context: AgentServiceContext
): Promise<ServiceActionResult> {
  const results: string[] = []
  const errors: string[] = []
  const metrics: Record<string, number> = {}

  try {
    const action = (rawAction || "").toLowerCase()
    const runInvoicing = action.includes("generate-invoices") || action.includes("all") || !action
    const runHealth = action.includes("client-health-score") || action.includes("all") || !action

    // ── Operation 1: Generate Invoices ──────────────────────────
    if (runInvoicing) {
      results.push("📋 RevStack Operations Agent: Generating Invoices...")

      // Find active retainers where billing is due
      const now = new Date()
      const activeRetainers = await prisma.retainer.findMany({
        where: { status: "active" },
        include: { client: { select: { name: true, company: true, email: true } } },
      })

      let invoicesCreated = 0
      let invoicesOverdue = 0

      for (const retainer of activeRetainers) {
        // Determine if billing is due based on nextBillingDate or startDate + billingCycle
        const nextBilling = retainer.nextBillingDate
          ? new Date(retainer.nextBillingDate)
          : computeNextBilling(retainer.startDate, retainer.billingCycle, retainer.createdAt)

        if (!nextBilling) continue

        // Check if an invoice was already generated for this billing period
        const periodStart = new Date(nextBilling)
        periodStart.setMonth(periodStart.getMonth() - 1)

        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            retainerId: retainer.id,
            issuedAt: { gte: periodStart },
          },
        })

        if (existingInvoice) continue // Already invoiced this period

        const isDue = nextBilling <= now
        const isOverdue = nextBilling < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        if (!isDue) continue // Not yet due

        // Generate a unique invoice number
        const invoiceNumber = `INV-${retainer.client.name.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

        // Calculate due date (14 days from issue)
        const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

        await prisma.invoice.create({
          data: {
            retainerId: retainer.id,
            clientId: retainer.clientId,
            invoiceNumber,
            amountUsd: retainer.amountUsd,
            currency: "USD",
            status: isOverdue ? "overdue" : "draft",
            dueDate,
            issuedAt: now,
            userId: retainer.userId,
            notes: `Auto-generated from retainer: ${retainer.name} (${retainer.billingCycle})`,
          },
        })

        invoicesCreated++
        if (isOverdue) invoicesOverdue++

        // Update next billing date based on cycle
        const nextDate = new Date(nextBilling)
        if (retainer.billingCycle === "monthly") nextDate.setMonth(nextDate.getMonth() + 1)
        else if (retainer.billingCycle === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3)
        else if (retainer.billingCycle === "annual") nextDate.setFullYear(nextDate.getFullYear() + 1)

        await prisma.retainer.update({
          where: { id: retainer.id },
          data: { nextBillingDate: nextDate.toISOString() },
        })

        // Log activity
        await prisma.activity.create({
          data: {
            type: "invoice_generated",
            description: `Invoice ${invoiceNumber} generated for ${retainer.client.name} — $${retainer.amountUsd} ${retainer.billingCycle} retainer`,
            entityType: "retainer",
            entityId: retainer.id,
            userId: retainer.userId,
          },
        })

        results.push(
          `   ✅ Invoice ${invoiceNumber}: ${retainer.client.name} — $${retainer.amountUsd} ${isOverdue ? "(OVERDUE)" : ""}`
        )
      }

      metrics["invoices_created"] = invoicesCreated
      metrics["invoices_overdue"] = invoicesOverdue
      metrics["active_retainers_checked"] = activeRetainers.length

      results.push(
        `   📊 Results: ${invoicesCreated} invoice(s) created, ${invoicesOverdue} overdue, ${activeRetainers.length} active retainers checked`
      )
    }

    // ── Operation 2: Client Health Scoring ──────────────────────
    if (runHealth) {
      results.push("\n📋 RevStack Operations Agent: Scoring Client Health...")

      // Fetch all active clients with their related data
      const clients = await prisma.client.findMany({
        where: { status: { in: ["active", "onboarding", "qualified"] } },
        include: {
          retainers: { where: { status: "active" }, select: { amountUsd: true, billingCycle: true } },
          complianceRecords: { select: { status: true, expiresAt: true } },
          followups: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        },
      })

      let totalScore = 0
      let highRiskCount = 0
      let mediumRiskCount = 0
      let healthyCount = 0
      const scoredClients: Array<{
        name: string
        company: string
        score: number
        tier: string
        factors: Record<string, number>
      }> = []

      const now = new Date()

      for (const client of clients) {
        // Factor 1: Retainer Revenue (0-30 points)
        // Higher retainer value = healthier
        const totalRetainerValue = client.retainers.reduce((sum, r) => sum + r.amountUsd, 0)
        const revenueScore = Math.min(30, Math.round(totalRetainerValue / 100))

        // Factor 2: Engagement Recency (0-25 points)
        // Recent followup/activity = good engagement
        const lastFollowup = client.followups[0]?.createdAt
        const daysSinceLastContact = lastFollowup
          ? Math.round((now.getTime() - new Date(lastFollowup).getTime()) / (1000 * 60 * 60 * 24))
          : 999
        const engagementScore = daysSinceLastContact < 7 ? 25
          : daysSinceLastContact < 14 ? 18
          : daysSinceLastContact < 30 ? 10
          : daysSinceLastContact < 60 ? 5
          : 0

        // Factor 3: Compliance Status (0-20 points)
        // Up-to-date compliance = healthy
        const obtainedCompliance = client.complianceRecords.filter((c) => c.status === "obtained")
        const expiringCompliance = obtainedCompliance.filter(
          (c) => c.expiresAt && new Date(c.expiresAt) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        )
        const complianceScore = client.complianceRecords.length === 0 ? 10 // No compliance requirements
          : expiringCompliance.length === 0 && obtainedCompliance.length > 0 ? 20
          : expiringCompliance.length <= obtainedCompliance.length / 2 ? 15
          : 5

        // Factor 4: Client Status (0-15 points)
        const statusScore = client.status === "active" ? 15
          : client.status === "onboarding" ? 8
          : client.status === "qualified" ? 5
          : 0

        // Factor 5: Account Tenure (0-10 points)
        // Longer tenure = more stable
        const daysSinceCreated = Math.round(
          (now.getTime() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        const tenureScore = daysSinceCreated > 365 ? 10
          : daysSinceCreated > 180 ? 8
          : daysSinceCreated > 90 ? 6
          : daysSinceCreated > 30 ? 4
          : 2

        const totalClientScore = revenueScore + engagementScore + complianceScore + statusScore + tenureScore

        // Determine health tier
        let tier: string
        if (totalClientScore >= 70) {
          tier = "healthy"
          healthyCount++
        } else if (totalClientScore >= 45) {
          tier = "medium"
          mediumRiskCount++
        } else {
          tier = "high-risk"
          highRiskCount++
        }

        totalScore += totalClientScore
        scoredClients.push({
          name: client.name,
          company: client.company,
          score: totalClientScore,
          tier,
          factors: {
            revenue: revenueScore,
            engagement: engagementScore,
            compliance: complianceScore,
            status: statusScore,
            tenure: tenureScore,
          },
        })
      }

      metrics["clients_scored"] = clients.length
      metrics["healthy_clients"] = healthyCount
      metrics["medium_risk_clients"] = mediumRiskCount
      metrics["high_risk_clients"] = highRiskCount

      results.push(
        `   📊 Client Health: ${clients.length} scored — ${healthyCount} healthy, ${mediumRiskCount} medium risk, ${highRiskCount} high risk`
      )

      // Log top clients by risk level
      const highRiskClients = scoredClients.filter((c) => c.tier === "high-risk")
      for (const client of highRiskClients) {
        results.push(`   ⚠️  HIGH RISK: ${client.name} (${client.company}) — score ${client.score}/100`)

        // Create activity entries for high-risk clients
        await prisma.activity.create({
          data: {
            type: "client_health_alert",
            description: `Client ${client.name} scored ${client.score}/100 (HIGH RISK) — engagement: ${client.factors.engagement}/25, compliance: ${client.factors.compliance}/20`,
            entityType: "client",
            entityId: client.name,
          },
        }).catch(() => {})
      }

      // Score breakdown for medium risk
      const mediumRiskClients = scoredClients.filter((c) => c.tier === "medium")
      for (const client of mediumRiskClients.slice(0, 5)) {
        results.push(`   ⚡ MEDIUM: ${client.name} (${client.company}) — score ${client.score}/100`)
      }

      // Average score
      const avgScore = clients.length > 0 ? Math.round(totalScore / clients.length) : 0
      results.push(`   📈 Average client health score: ${avgScore}/100`)
    }

    return {
      success: errors.length === 0,
      summary: `RevStack Operations Agent: ${results.filter((r) => r.startsWith("📊")).join(" | ")}`,
      details: results.join("\n"),
      metrics,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    return {
      success: false,
      summary: `RevStack Operations Agent failed: ${(error as Error).message}`,
      errors: [(error as Error).message],
    }
  }
}

/**
 * Compute the next billing date from a retainer's start date and billing cycle.
 */
function computeNextBilling(
  startDate: string,
  billingCycle: string,
  createdAt: Date
): Date | null {
  try {
    const start = new Date(startDate)
    if (isNaN(start.getTime())) return new Date(createdAt)

    const now = new Date()
    const next = new Date(start)

    // Advance from start date to the next billing period
    while (next <= now) {
      if (billingCycle === "monthly") next.setMonth(next.getMonth() + 1)
      else if (billingCycle === "quarterly") next.setMonth(next.getMonth() + 3)
      else if (billingCycle === "annual") next.setFullYear(next.getFullYear() + 1)
      else break
    }

    return next
  } catch {
    return new Date(createdAt)
  }
}

// ============================================================
// Orchestrator Router — dispatches to the right agent service
// ============================================================

export type AgentServiceFunction = (
  action: string,
  context: AgentServiceContext
) => Promise<ServiceActionResult>

const agentServiceMap: Record<string, AgentServiceFunction> = {
  lead: leadAgentAction,
  trade: tradeAgentAction,
  compliance: complianceAgentAction,
  onboarding: onboardingAgentAction,
  revenue: revenueAgentAction,
  revstack: revstackAgentAction,
  "revstack-ops": revstackOperationsAgentAction,
  "revstack-page-data": revstackPageDataAgentAction,
}

/**
 * Execute an agent action using the appropriate real service integrations.
 * Falls back gracefully if a service is unavailable.
 *
 * If userId is provided, the context is automatically enriched with the user's
 * onboarding and questionnaire personalization data so agents can tailor behavior.
 */
export async function executeAgentServiceAction(
  agentType: string,
  action: string,
  context: AgentServiceContext,
  userId?: string
): Promise<ServiceActionResult> {
  const enrichedContext = userId
    ? { ...context }
    : context

  if (userId && !enrichedContext.userPersonalization) {
    enrichedContext.userPersonalization = await getUserPersonalizationContext(userId)
  }

  const serviceFn = agentServiceMap[agentType]
  if (!serviceFn) {
    return {
      success: false,
      summary: `No service bridge available for agent type: ${agentType}`,
      errors: [`Unknown agent type: ${agentType}`],
    }
  }

  try {
    return await serviceFn(action, enrichedContext)
  } catch (error) {
    return {
      success: false,
      summary: `Service bridge error for ${agentType}: ${(error as Error).message}`,
      errors: [(error as Error).message],
    }
  }
}

export default {
  executeAgentServiceAction,
  getUserPersonalizationContext,
  getCachedUserPersonalization,
  invalidatePersonalizationCache,
  leadAgentAction,
  tradeAgentAction,
  complianceAgentAction,
  onboardingAgentAction,
  revenueAgentAction,
}
