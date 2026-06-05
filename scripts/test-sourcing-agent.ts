/**
 * Sourcing Agent Test
 *
 * Tests the Sokogate integration + supplier matching engine to show
 * how the sourcing agent pulls products and supplier details.
 *
 * Run: npx tsx scripts/test-sourcing-agent.ts
 */

import { SokogateIntegration } from "../src/lib/sokogate-integration"
import { matchSuppliers, type BuyerProfile, type SupplierProfile } from "../src/lib/supplier-matching"

async function main() {
  console.log("=".repeat(72))
  console.log("🧪 Sourcing Agent Test — Sokogate Integration + Supplier Matching")
  console.log("=".repeat(72))

  // ── 1. Initialize the Sokogate Integration ──────────────────────
  const sokogate = new SokogateIntegration()
  console.log(`\n📋 Integration status: ${sokogate.summary()}\n`)

  // ── 2. Get ALL suppliers (products & details) ──────────────────
  console.log("─".repeat(72))
  console.log("📦 STEP 1: Fetch ALL suppliers (products & details)")
  console.log("─".repeat(72))

  const { suppliers } = await sokogate.getSuppliers()
  console.log(`\nFound ${suppliers.length} suppliers:\n`)
  for (const s of suppliers) {
    console.log(`  🏢 ${s.companyName}`)
    console.log(`     Contact:  ${s.contactName} (${s.email})`)
    console.log(`     Country:  ${s.country}`)
    console.log(`     Products: ${s.commodities.join(", ")}`)
    console.log(`     Certs:    ${s.certifications.join(", ") || "None"}`)
    console.log(`     ERS:      ${s.exportReadinessScore}/100`)
    console.log(`     Capacity: ${s.monthlyCapacity || "N/A"}`)
    console.log(`     Status:   ${s.status}`)
    console.log()
  }

  // ── 3. Filter suppliers by commodity ────────────────────────────
  console.log("─".repeat(72))
  console.log("🔍 STEP 2: Filter suppliers by commodity 'Coffee'")
  console.log("─".repeat(72))

  const coffeeSuppliers = await sokogate.getSuppliers({ commodity: "Coffee" })
  console.log(`\nCoffee suppliers: ${coffeeSuppliers.suppliers.length}`)
  for (const s of coffeeSuppliers.suppliers) {
    console.log(`  → ${s.companyName} — ${s.commodities.join(", ")} (ERS: ${s.exportReadinessScore})`)
  }

  // ── 4. Filter suppliers by ERS threshold ────────────────────────
  console.log("\n" + "─".repeat(72))
  console.log("📊 STEP 3: Filter suppliers by ERS >= 75")
  console.log("─".repeat(72))

  const highErsSuppliers = await sokogate.getSuppliers({ minErsScore: 75 })
  console.log(`\nHigh-ERS suppliers (>= 75): ${highErsSuppliers.suppliers.length}`)
  for (const s of highErsSuppliers.suppliers) {
    console.log(`  → ${s.companyName} — ERS: ${s.exportReadinessScore}/100`)
  }

  // ── 5. Get buyers (potential sourcing partners) ────────────────
  console.log("\n" + "─".repeat(72))
  console.log("🤝 STEP 4: Fetch buyers (sourcing demand side)")
  console.log("─".repeat(72))

  const { buyers } = await sokogate.getBuyers()
  console.log(`\nActive buyers: ${buyers.length}\n`)
  for (const b of buyers) {
    console.log(`  🏭 ${b.companyName} (${b.country})`)
    console.log(`     Contact:  ${b.contactName}`)
    console.log(`     Looking for: ${b.procurementInterests.join(", ")}`)
    console.log(`     Requires: ${b.requiredCertifications.join(", ") || "No specific certs"}`)
    console.log()
  }

  // ── 6. Filter buyers by procurement interest ───────────────────
  console.log("─".repeat(72))
  console.log("🎯 STEP 5: Filter buyers interested in 'Coffee'")
  console.log("─".repeat(72))

  const coffeeBuyers = await sokogate.getBuyers({ interest: "Coffee" })
  console.log(`\nBuyers interested in coffee: ${coffeeBuyers.buyers.length}`)
  for (const b of coffeeBuyers.buyers) {
    console.log(`  → ${b.companyName} (${b.country})`)
  }

  // ── 7. Create a corridor match ─────────────────────────────────
  console.log("\n" + "─".repeat(72))
  console.log("🔗 STEP 6: Create a supplier-buyer corridor match")
  console.log("─".repeat(72))

  const { match } = await sokogate.findMatches("soko-sup-1", "soko-buy-2")
  if (match) {
    console.log(`\n  Match created: ${match.id}`)
    console.log(`  Score: ${match.matchScore}/100`)
    console.log(`  Breakdown:`)
    console.log(`    • Product Fit:          ${match.matchBreakdown.productFit}/100`)
    console.log(`    • Cert Compatibility:   ${match.matchBreakdown.certificationCompatibility}/100`)
    console.log(`    • Volume Fit:           ${match.matchBreakdown.volumeFit}/100`)
    console.log(`    • Logistics Feasibility:${match.matchBreakdown.logisticsFeasibility}/100`)
    console.log(`    • Price Competitiveness:${match.matchBreakdown.priceCompetitiveness}/100`)
    console.log(`  Status: ${match.status}`)
  }

  // ── 8. Run the Supplier Matching Engine ────────────────────────
  console.log("\n" + "─".repeat(72))
  console.log("🧠 STEP 7: Supplier Matching Engine — full algorithmic scoring")
  console.log("─".repeat(72))

  // Convert Sokogate suppliers to the matching engine's format
  const supplierProfiles: SupplierProfile[] = suppliers.map((s) => ({
    id: s.id,
    name: s.companyName,
    country: s.country,
    commodity: s.commodities.join(", "),
    certifications: s.certifications,
    ersScore: s.exportReadinessScore,
    exportVolume: s.monthlyCapacity,
    pricing: s.pricing,
  }))

  // Define a buyer profile
  const buyer: BuyerProfile = {
    name: "Seoul Food Corp",
    industry: "Food & Beverage",
    procurementFocus: ["Coffee", "Tea", "Cocoa"],
    requiredCertifications: ["HACCP", "Organic", "Halal"],
    minErsScore: 65,
  }

  console.log(`\n  Buyer: ${buyer.name} (${buyer.industry})`)
  console.log(`  Seeking: ${buyer.procurementFocus?.join(", ") || "All"}`)
  console.log(`  Requirements: ${buyer.requiredCertifications?.join(", ") || "None specified"}\n`)

  const matchResults = matchSuppliers(buyer, supplierProfiles)

  console.log(`  Matches found: ${matchResults.length}\n`)
  for (const mr of matchResults) {
    console.log(`  ${mr.matchScore >= 70 ? "✅" : mr.matchScore >= 50 ? "⚠️" : "❌"} ${mr.supplierName} (${mr.supplierCountry})`)
    console.log(`     Match Score: ${mr.matchScore}/100`)
    console.log(`     Product Fit: ${mr.productFitScore}/40 | Compliance: ${mr.complianceScore}/35 | Capacity: ${mr.capacityScore}/25`)
    console.log(`     Matched Commodities: ${mr.matchedCommodities.join(", ") || "None"}`)
    console.log(`     Certs Matched: ${mr.matchedCertifications.join(", ") || "None"}`)
    if (mr.gapCertifications.length > 0) {
      console.log(`     ⚠️  Missing Certs: ${mr.gapCertifications.join(", ")}`)
    }
    console.log(`     Reasoning:`)
    for (const r of mr.reasoning) {
      console.log(`       • ${r}`)
    }
    console.log()
  }

  // ── 9. Active matches ──────────────────────────────────────────
  console.log("─".repeat(72))
  console.log("📋 STEP 8: Active corridor matches")
  console.log("─".repeat(72))

  const { matches } = await sokogate.getActiveMatches()
  console.log(`\nActive matches: ${matches.length}\n`)
  for (const m of matches) {
    const sup = suppliers.find((s) => s.id === m.supplierId)
    const b = buyers.find((b) => b.id === m.buyerId)
    console.log(`  🔗 ${sup?.companyName || "Unknown"} ↔ ${b?.companyName || "Unknown"}`)
    console.log(`     Score: ${m.matchScore}/100 | Status: ${m.status}`)
    console.log()
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log("=".repeat(72))
  console.log("✅ TEST COMPLETE — Sourcing Agent Summary")
  console.log("=".repeat(72))
  console.log(`
  Integration Mode: ${sokogate.summary()}
  Suppliers Found:  ${suppliers.length}
  Buyers Found:     ${buyers.length}
  Corridor Matches: ${matches.length}
  Matching Engine:  ${matchResults.length} scored matches for Seoul Food Corp
  `)
}

main().catch(console.error)
