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
import { agentMemory, type AgentType } from "./agent-memory"
import { ChatOpenAI } from "@langchain/openai"
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
}

// ============================================================
// LLM for analysis (shared)
// ============================================================

const llm = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0.3 })

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

  try {
    // 1. Fetch unprocessed leads from the database
    const unprocessedLeads = await prisma.client.findMany({
      where: { status: "lead" },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

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
// Trade Agent — Supplier Matching, Corridor Analysis
// ============================================================

export async function tradeAgentAction(
  rawAction: string,
  context: AgentServiceContext
): Promise<ServiceActionResult> {
  const results: string[] = []
  const metrics: Record<string, number> = {}

  try {
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

    metrics["suppliers_found"] = dbSuppliers.length

    // 2. Convert DB records to supplier profiles for the matching engine
    const supplierProfiles: SupplierProfile[] = dbSuppliers.map((s) => ({
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

    // 3. Run matching against all Korean buyer profiles (internal matching engine)
    let totalMatches = 0
    const allMatches: { buyer: string; matches: MatchResult[] }[] = []

    for (const [buyerName, buyerProfile] of Object.entries(KOREAN_BUYER_PROFILES)) {
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

    // 5. Store matches in agent memory as insights
    if (totalMatches > 0) {
      await agentMemory.addInsight(
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

  try {
    // 1. Fetch clients stuck in onboarding
    const onboardingClients = await prisma.client.findMany({
      where: { status: "onboarding" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "asc" },
      take: 20,
    })

    metrics["onboarding_stuck"] = onboardingClients.length
    results.push(`Found ${onboardingClients.length} clients stuck in onboarding`)

    // 2. Send email reminders for stuck clients
    let emailsSent = 0
    for (const client of onboardingClients.slice(0, 5)) {
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
    for (const client of onboardingClients.slice(0, 3)) {
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
    for (const client of onboardingClients.slice(0, 3)) {
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
    for (const client of onboardingClients.slice(0, 3)) {
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

  try {
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
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are the Revenue Agent. Analyze revenue data and provide financial insights."],
      ["human", `Total: $${metrics["total_revenue"]}, Monthly: $${metrics["monthly_revenue"]}, Active: ${activeClients}, Pipeline: $${metrics["pipeline_value"]}\nRaw action: ${rawAction}\n\nProvide a revenue analysis with growth recommendations.`],
    ])
    const analysis = await analysisPrompt.pipe(llm).pipe(new StringOutputParser()).invoke({})

    return {
      success: true,
      summary: `Revenue Agent: $${metrics["total_revenue"]} total, $${metrics["monthly_revenue"]} monthly, ${activeClients} active clients. Synced to Make.com and Zoho CRM.`,
      details: [analysis, ...results].join("\n"),
      metrics,
    }
  } catch (error) {
    return {
      success: false,
      summary: `Revenue Agent failed: ${(error as Error).message}`,
      errors: [(error as Error).message],
    }
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
}

/**
 * Execute an agent action using the appropriate real service integrations.
 * Falls back gracefully if a service is unavailable.
 */
export async function executeAgentServiceAction(
  agentType: string,
  action: string,
  context: AgentServiceContext
): Promise<ServiceActionResult> {
  const serviceFn = agentServiceMap[agentType]
  if (!serviceFn) {
    return {
      success: false,
      summary: `No service bridge available for agent type: ${agentType}`,
      errors: [`Unknown agent type: ${agentType}`],
    }
  }

  try {
    return await serviceFn(action, context)
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
  leadAgentAction,
  tradeAgentAction,
  complianceAgentAction,
  onboardingAgentAction,
  revenueAgentAction,
}
