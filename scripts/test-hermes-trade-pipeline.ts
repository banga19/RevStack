/**
 * Hermes Agent — Trade/Sourcing Pipeline Demo
 *
 * Exercises the full autonomous pipeline end-to-end:
 * 1. Sokogate supplier discovery (simulated)
 * 2. Supplier matching engine (algorithmic scoring)
 * 3. Korean buyer corridor matching
 * 4. Trade corridor analysis with detailed breakdowns
 *
 * Run: npx tsx scripts/test-hermes-trade-pipeline.ts
 */

import { SokogateIntegration } from "../src/lib/sokogate-integration"
import { matchSuppliers, KOREAN_BUYER_PROFILES, type BuyerProfile, type SupplierProfile, type MatchResult } from "../src/lib/supplier-matching"
import { hermesAgent } from "../src/lib/hermes-agent"
import { agentMemory } from "../src/lib/agent-memory"

// ============================================================
// Utility: Pretty Print Helpers
// ============================================================

function hr(title: string) {
  const line = "─".repeat(72)
  console.log(`\n${line}`)
  console.log(`  ${title}`)
  console.log(line)
}

function heading(text: string) {
  console.log(`\n  ${text}`)
  console.log(`  ${"─".repeat(Math.min(text.length, 60))}`)
}

// ============================================================
// Main Pipeline Demo
// ============================================================

async function main() {
  console.log("\n" + "=".repeat(72))
  console.log("  🤖 HERMES AGENT — TRADE/SOURCING AUTONOMOUS PIPELINE")
  console.log("=".repeat(72))
  console.log("\n  Initializing Sokogate integration & supplier matching engine...")

  // ── 0. Initialize ──────────────────────────────────────────
  const sokogate = new SokogateIntegration()
  console.log(`  📋 ${sokogate.summary()}\n`)

  // ============================================================
  // PHASE 1: SUPPLIER DISCOVERY (Sokogate Integration)
  // ============================================================
  hr("PHASE 1: SUPPLIER DISCOVERY — Fetching products & suppliers from Sokogate")

  const { suppliers } = await sokogate.getSuppliers()
  console.log(`\n  ✅ Found ${suppliers.length} suppliers on Sokogate platform\n`)

  for (const s of suppliers) {
    console.log(`     🏢 ${s.companyName}`)
    console.log(`        Country:   ${s.country}`)
    console.log(`        Products:  ${s.commodities.join(", ")}`)
    console.log(`        Certs:     ${s.certifications.join(", ") || "None"}`)
    console.log(`        ERS Score: ${s.exportReadinessScore}/100`)
    console.log(`        Capacity:  ${s.monthlyCapacity || "N/A"}`)
    console.log(`        Status:    ${s.status}`)
    console.log()
  }

  // -- Filter by commodity ───────────────────────────────────
  heading("Commodity Filter: Coffee suppliers")
  const coffeeSuppliers = await sokogate.getSuppliers({ commodity: "Coffee" })
  for (const s of coffeeSuppliers.suppliers) {
    console.log(`     → ${s.companyName} — ${s.commodities.join(", ")}`)
  }

  // -- Filter by ERS threshold ───────────────────────────────
  heading("ERS Filter: Suppliers with score >= 75")
  const topSuppliers = await sokogate.getSuppliers({ minErsScore: 75 })
  for (const s of topSuppliers.suppliers) {
    console.log(`     → ${s.companyName} — ERS ${s.exportReadinessScore}/100`)
  }

  // ============================================================
  // PHASE 2: BUYER DISCOVERY (Demand Side)
  // ============================================================
  hr("PHASE 2: BUYER DISCOVERY — Who's looking to source from Africa?")

  const { buyers } = await sokogate.getBuyers()
  console.log(`\n  ✅ Found ${buyers.length} active buyers on Sokogate\n`)

  for (const b of buyers) {
    console.log(`     🏭 ${b.companyName} (${b.country})`)
    console.log(`        Looking for: ${b.procurementInterests.join(", ")}`)
    console.log(`        Requires:    ${b.requiredCertifications.join(", ") || "No specific certs"}`)
    console.log(`        Contact:     ${b.contactName}`)
    console.log()
  }

  // -- Cross-reference buyer interests with suppliers ────────
  heading("Cross-Reference: Buyers ↔ Products available")
  for (const buyer of buyers) {
    for (const interest of buyer.procurementInterests) {
      const matchingSuppliers = suppliers.filter((s) =>
        s.commodities.some((c) => c.toLowerCase().includes(interest.toLowerCase()))
      )
      if (matchingSuppliers.length > 0) {
        console.log(`     🔗 ${buyer.companyName} wants "${interest}" → ${matchingSuppliers.length} supplier(s) found`)
      }
    }
  }

  // ============================================================
  // PHASE 3: CORRIDOR MATCHING (Sokogate Match Engine)
  // ============================================================
  hr("PHASE 3: CORRIDOR MATCHING — Sokogate platform matches")

  const supplier1 = suppliers[0]?.id
  const buyer2 = buyers[1]?.id

  if (supplier1 && buyer2) {
    const { match } = await sokogate.findMatches(supplier1, buyer2)
    if (match) {
      const sup = suppliers.find((s) => s.id === match.supplierId)
      const b = buyers.find((b) => b.id === match.buyerId)
      console.log(`\n     🏢 ${sup?.companyName} ↔ 🏭 ${b?.companyName}`)
      console.log(`     Match Score: ${match.matchScore}/100`)
      console.log(`     Status:      ${match.status}`)
      console.log(`     Breakdown:`)
      console.log(`       Product Fit:           ${match.matchBreakdown.productFit}/100`)
      console.log(`       Cert Compatibility:    ${match.matchBreakdown.certificationCompatibility}/100`)
      console.log(`       Volume Fit:            ${match.matchBreakdown.volumeFit}/100`)
      console.log(`       Logistics Feasibility: ${match.matchBreakdown.logisticsFeasibility}/100`)
      console.log(`       Price Competitiveness: ${match.matchBreakdown.priceCompetitiveness}/100`)
    }
  }

  // View all existing active matches
  const { matches } = await sokogate.getActiveMatches()
  console.log(`\n  Active corridor matches: ${matches.length}`)
  for (const m of matches) {
    const sup = suppliers.find((s) => s.id === m.supplierId)
    const b = buyers.find((b) => b.id === m.buyerId)
    const badges = m.matchScore >= 80 ? "✅" : m.matchScore >= 60 ? "⚠️" : "❌"
    console.log(`     ${badges} ${sup?.companyName || "?"} ↔ ${b?.companyName || "?"}`)
    console.log(`        Score: ${m.matchScore}/100 • Status: ${m.status}`)
  }

  // ============================================================
  // PHASE 4: SUPPLIER MATCHING ENGINE (Algorithmic Scoring)
  // ============================================================
  hr("PHASE 4: SUPPLIER MATCHING ENGINE — Scoring against Korean buyer profiles")

  // Convert Sokogate suppliers to the matching engine format
  const supplierProfiles: SupplierProfile[] = suppliers.map((s) => ({
    id: s.id,
    name: s.companyName,
    country: s.country,
    commodity: s.commodities.join(", "),
    category: s.commodities[0],
    certifications: s.certifications,
    ersScore: s.exportReadinessScore,
    exportVolume: s.monthlyCapacity,
    pricing: s.pricing,
  }))

  // Run matching against ALL Korean buyer profiles
  const allKoreanMatches: Map<string, MatchResult[]> = new Map()

  for (const [buyerName, buyerProfile] of Object.entries(KOREAN_BUYER_PROFILES)) {
    const results = matchSuppliers(buyerProfile, supplierProfiles)
    const scored = results.filter((r) => r.matchScore > 0)
    if (scored.length > 0) {
      allKoreanMatches.set(buyerName, scored)
    }
  }

  // Display results by buyer
  for (const [buyerName, matches] of allKoreanMatches) {
    const profile = KOREAN_BUYER_PROFILES[buyerName]
    console.log(`\n  🇰🇷 Buyer: ${buyerName}`)
    console.log(`     Industry: ${profile.industry || "N/A"}`)
    console.log(`     Seeking:  ${profile.procurementFocus?.join(", ") || "Unspecified"}`)
    console.log(`     Cert req: ${profile.requiredCertifications?.join(", ") || "None"}`)
    console.log(`     Matches:  ${matches.length} supplier(s) found\n`)

    for (const mr of matches) {
      const badge = mr.matchScore >= 70 ? "✅" : mr.matchScore >= 50 ? "⚠️" : "❌"
      console.log(`     ${badge} ${mr.supplierName} (${mr.supplierCountry})`)
      console.log(`        Score: ${mr.matchScore}/100 | P:${mr.productFitScore}/40 C:${mr.complianceScore}/35 V:${mr.capacityScore}/25`)
      console.log(`        Commodities: ${mr.matchedCommodities.join(", ") || "—"}`)
      if (mr.gapCertifications.length > 0) {
        console.log(`        ⚠️  Missing certs: ${mr.gapCertifications.join(", ")}`)
      }
      for (const r of mr.reasoning) {
        console.log(`        • ${r}`)
      }
      console.log()
    }
  }

  // ============================================================
  // PHASE 5: TRADE CORRIDOR ANALYSIS
  // ============================================================
  hr("PHASE 5: TRADE CORRIDOR ANALYSIS — Summary & Insights")

  // Compute aggregate statistics
  const totalSupplierBuyerPairs = allKoreanMatches.size > 0
    ? Array.from(allKoreanMatches.values()).reduce((sum, m) => sum + m.length, 0)
    : 0

  const bestMatch = Array.from(allKoreanMatches.values())
    .flat()
    .sort((a, b) => b.matchScore - a.matchScore)[0]

  const totalSuppliers = supplierProfiles.length
  const totalBuyers = Object.keys(KOREAN_BUYER_PROFILES).length
  const matchedBuyers = allKoreanMatches.size

  console.log(`\n  📊 Pipeline Summary:`)
  console.log(`     Sokogate Suppliers:      ${suppliers.length}`)
  console.log(`     Active Buyers:           ${buyers.length}`)
  console.log(`     Korean Buyer Profiles:   ${totalBuyers}`)
  console.log(`     Buyers with Matches:     ${matchedBuyers}`)
  console.log(`     Total Supplier↔Buyer Pairs: ${totalSupplierBuyerPairs}`)
  console.log(`     Active Corridor Matches: ${matches.length}`)

  if (bestMatch) {
    console.log(`\n  🏆 Best Match:`)
    console.log(`     ${bestMatch.supplierName} ↔ ${bestMatch.buyerName}`)
    console.log(`     Score: ${bestMatch.matchScore}/100`)
  }

  console.log(`\n  💡 Top Supplier Recommendations by Buyer:`)
  for (const [buyerName, matches] of allKoreanMatches) {
    const top = matches[0]
    if (top) {
      const scoreLabel = top.matchScore >= 70 ? "high" : top.matchScore >= 50 ? "medium" : "low"
      console.log(`     🇰🇷 ${buyerName} → 1st: ${top.supplierName} (score: ${top.matchScore} — ${scoreLabel} fit)`)
    }
  }

  // ============================================================
  // PHASE 6: HERMES AGENT — Full Autonomous Pipeline Run
  // ============================================================
  hr("PHASE 6: HERMES AGENT — Full LangGraph autonomous pipeline execution")

  console.log(`
  Invoking Hermes agent with a trade-focused objective...
  This exercises the full pipeline:
    1. RAG context retrieval (business knowledge base)
    2. LLM-based multi-agent planning (LangGraph)
    3. Agent service bridge execution (trade agent)
    4. Agent memory storage (cross-session learning)
    5. Final consolidated report
  `)

  try {
    const operation = await hermesAgent.runOperation(
      "Scan Sokogate platform for new supplier-buyer corridor matches " +
      "across all Korean buyer profiles. Analyze product fit, certification " +
      "compatibility, and export capacity for each supplier. Report " +
      "the best corridor opportunities with actionable recommendations."
    )

    console.log(`  ✅ Hermes operation completed!`)
    console.log(`     Operation ID: ${operation.id}`)
    console.log(`     Status:       ${operation.status}`)
    console.log(`     Duration:     ${operation.completedAt ? ((operation.completedAt - operation.startedAt) / 1000).toFixed(1) + 's' : 'N/A'}`)
    console.log(`     Agents Used:  ${operation.plannedActions.map(a => a.agentType).join(', ')}`)
    console.log(`     Actions:      ${operation.plannedActions.length}`)

    console.log(`\n  ── Planned Actions ──`)
    for (const action of operation.plannedActions) {
      console.log(`     🤖 ${action.agentType.toUpperCase()}: ${action.action.substring(0, 80)}...`)
      console.log(`        Priority: ${action.priority} | Reasoning: ${action.reasoning.substring(0, 60)}`)
    }

    console.log(`\n  ── Execution Results ──`)
    for (const result of operation.results) {
      const statusIcon = result.result.success ? "✅" : "❌"
      console.log(`     ${statusIcon} ${result.action.agentType.toUpperCase()}: ${result.result.summary.substring(0, 100)}`)
      if (result.result.metrics && Object.keys(result.result.metrics).length > 0) {
        for (const [k, v] of Object.entries(result.result.metrics)) {
          console.log(`        📊 ${k}: ${v}`)
        }
      }
    }

    if (operation.errors.length > 0) {
      console.log(`\n  ⚠️  Errors encountered:`)
      for (const err of operation.errors) {
        console.log(`     • ${err.substring(0, 100)}`)
      }
    }

    console.log(`\n  ── Agent Memory Insights ──`)
    for (const insight of operation.insights) {
      console.log(`     💡 [${insight.agentType}] ${insight.title}`)
      console.log(`        ${insight.description.substring(0, 100)}`)
    }

  } catch (error) {
    console.log(`\n  ⚠️  Hermes agent direct invocation: ${(error as Error).message}`)
    console.log(`  (This is expected if OpenAI API key or database connection is missing.`)
    console.log(`   The component-level pipeline in Phases 1-5 ran successfully regardless.)`)
  }

  // Also show agent memory summary
  console.log(`\n  ── Agent Memory Stats ──`)
  console.log(`     ${agentMemory.getSummary()}`)

  console.log("\n" + "=".repeat(72))
  console.log("  ✅ TRADE/SOURCING PIPELINE DEMO COMPLETE")
  console.log("  • Phases 1-5: Component-level pipeline executed successfully")
  console.log(`  • Phase 6: Hermes full pipeline ${hermesAgent.getAllOperations().length > 0 ? 'executed' : 'attempted'}`)
  console.log("=".repeat(72) + "\n")
}

main().catch(console.error)
