/**
 * Seed script: Sokogate Expanded Supplier/Buyer Data
 *
 * Populates the database with the expanded 12 suppliers as client records
 * with products and compliance records, plus RevStack leads & retainers.
 *
 * This makes the Hermes agent's trade/sourcing pipeline work against
 * real database records instead of just the Sokogate simulation.
 *
 * Idempotent — safe to re-run.
 *
 * Run: npx tsx prisma/seed-sokogate-expanded.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// ── Expanded Supplier Data ────────────────────────────────────────

interface SupplierSeed {
  companyName: string
  contactName: string
  email: string
  phone: string
  country: string
  products: Array<{
    name: string
    category: string
    certifications: string
    exportVolume: string
    unit: string
    pricing: string
  }>
  complianceRecords: Array<{
    certificationType: string
    status: string
    issuer?: string
    notes?: string
  }>
  ersScore: number
  monthlyRetainer: number
}

const suppliers: SupplierSeed[] = [
  {
    companyName: "Kenya Coffee Exporters Ltd",
    contactName: "James Kamau", email: "james@kenyacoffee.co.ke", phone: "+254712345678",
    country: "Kenya", ersScore: 78, monthlyRetainer: 1500,
    products: [{ name: "Specialty Arabica Coffee", category: "agriculture", certifications: "HACCP, Organic", exportVolume: "2000", unit: "kg/month", pricing: "$8.50/kg FOB Mombasa" }],
    complianceRecords: [
      { certificationType: "haccp", status: "obtained", issuer: "KEBS" },
      { certificationType: "organic", status: "obtained", issuer: "Ecocert" },
    ],
  },
  {
    companyName: "Tanzania Tea Growers Co-op",
    contactName: "Amina Mwinyi", email: "amina@tanzaniatea.co.tz", phone: "+255712345678",
    country: "Tanzania", ersScore: 72, monthlyRetainer: 1200,
    products: [
      { name: "Premium Black Tea", category: "agriculture", certifications: "HACCP, Halal", exportVolume: "5000", unit: "kg/month", pricing: "$3.20/kg FOB Dar es Salaam" },
      { name: "Green Tea", category: "agriculture", certifications: "HACCP, Halal", exportVolume: "2000", unit: "kg/month", pricing: "$2.80/kg FOB Dar es Salaam" },
    ],
    complianceRecords: [
      { certificationType: "haccp", status: "obtained", issuer: "TBS" },
      { certificationType: "halal", status: "obtained", issuer: "Halal Authority Tanzania" },
    ],
  },
  {
    companyName: "DRC Cobalt Supply Co.",
    contactName: "Pierre Kasongo", email: "pierre@drc-cobalt.cd", phone: "+243812345678",
    country: "DRC", ersScore: 62, monthlyRetainer: 3000,
    products: [{ name: "Cobalt Hydroxide", category: "minerals", certifications: "Conflict-free", exportVolume: "200", unit: "tons/month", pricing: "$35,000/ton CIF Busan" }],
    complianceRecords: [
      { certificationType: "conflict-free", status: "obtained", issuer: "ICGLR" },
    ],
  },
  {
    companyName: "Ghana Cocoa Processing Co.",
    contactName: "Kwame Asante", email: "kwame@ghanacocoa.gh", phone: "+233512345678",
    country: "Ghana", ersScore: 80, monthlyRetainer: 2500,
    products: [
      { name: "Cocoa Butter", category: "agriculture", certifications: "UTZ, Rainforest Alliance, Organic", exportVolume: "5000", unit: "tons/year", pricing: "$4,200/ton FOB Tema" },
      { name: "Cocoa Powder", category: "agriculture", certifications: "UTZ, Rainforest Alliance, Organic", exportVolume: "3000", unit: "tons/year", pricing: "$3,800/ton FOB Tema" },
      { name: "Cocoa Liquor", category: "agriculture", certifications: "UTZ, Rainforest Alliance", exportVolume: "2000", unit: "tons/year", pricing: "$4,500/ton FOB Tema" },
    ],
    complianceRecords: [
      { certificationType: "organic", status: "obtained", issuer: "Ecocert" },
      { certificationType: "utz", status: "obtained", issuer: "UTZ" },
      { certificationType: "rainforest-alliance", status: "obtained", issuer: "Rainforest Alliance" },
    ],
  },
  {
    companyName: "Ethiopian Spice Traders PLC",
    contactName: "Tesfaye Abebe", email: "tesfaye@ethiospice.com", phone: "+251912345678",
    country: "Ethiopia", ersScore: 75, monthlyRetainer: 900,
    products: [
      { name: "Cardamom", category: "agriculture", certifications: "Organic, HACCP, Fair Trade", exportVolume: "300", unit: "kg/month", pricing: "$14.00/kg FOB Addis Ababa" },
      { name: "Turmeric", category: "agriculture", certifications: "Organic, HACCP", exportVolume: "250", unit: "kg/month", pricing: "$5.50/kg FOB Addis Ababa" },
      { name: "Ginger", category: "agriculture", certifications: "Organic", exportVolume: "250", unit: "kg/month", pricing: "$4.80/kg FOB Addis Ababa" },
    ],
    complianceRecords: [
      { certificationType: "organic", status: "obtained", issuer: "Ecocert" },
      { certificationType: "haccp", status: "obtained", issuer: "Ethiopian Standards Agency" },
      { certificationType: "fair-trade", status: "obtained", issuer: "Fair Trade International" },
    ],
  },
  {
    companyName: "Mozambique Macadamia Growers",
    contactName: "Helena dos Santos", email: "helena@mozmacadamia.co.mz", phone: "+258823456789",
    country: "Mozambique", ersScore: 70, monthlyRetainer: 1100,
    products: [
      { name: "Macadamia Nuts", category: "agriculture", certifications: "HACCP, Organic, Halal", exportVolume: "1000", unit: "kg/month", pricing: "$14.50/kg FOB Beira" },
      { name: "Cashew Nuts", category: "agriculture", certifications: "HACCP, Halal", exportVolume: "500", unit: "kg/month", pricing: "$8.00/kg FOB Beira" },
    ],
    complianceRecords: [
      { certificationType: "haccp", status: "obtained", issuer: "Mozambique Standards" },
      { certificationType: "organic", status: "in-progress", issuer: "Ecocert", notes: "Application submitted" },
      { certificationType: "halal", status: "obtained", issuer: "Halal Authority" },
    ],
  },
  {
    companyName: "Uganda Cotton Exporters Ltd",
    contactName: "Sarah Nakato", email: "sarah@ugandacotton.co.ug", phone: "+256712345678",
    country: "Uganda", ersScore: 68, monthlyRetainer: 1000,
    products: [
      { name: "Organic Cotton Fiber", category: "agriculture", certifications: "GOTS, Organic, Fair Trade", exportVolume: "2000", unit: "tons/year", pricing: "$2.80/kg FOB Kampala" },
      { name: "Cotton Yarn", category: "manufactured-goods", certifications: "GOTS, Organic", exportVolume: "500", unit: "tons/year", pricing: "$4.50/kg FOB Kampala" },
    ],
    complianceRecords: [
      { certificationType: "gots", status: "obtained", issuer: "GOTS International" },
      { certificationType: "organic", status: "obtained", issuer: "Ecocert" },
      { certificationType: "fair-trade", status: "obtained", issuer: "Fair Trade International" },
    ],
  },
  {
    companyName: "Senegal Seafood Corp",
    contactName: "Mamadou Diallo", email: "mdiallo@senegalseafood.sn", phone: "+221773456789",
    country: "Senegal", ersScore: 76, monthlyRetainer: 2000,
    products: [
      { name: "Frozen Shrimp", category: "seafood", certifications: "HACCP, Halal, ISO 9001, BAP", exportVolume: "300", unit: "tons/month", pricing: "$8.50/kg FOB Dakar" },
      { name: "Octopus", category: "seafood", certifications: "HACCP, Halal", exportVolume: "150", unit: "tons/month", pricing: "$12.00/kg FOB Dakar" },
      { name: "Tuna", category: "seafood", certifications: "HACCP, ISO 9001", exportVolume: "50", unit: "tons/month", pricing: "$6.50/kg FOB Dakar" },
    ],
    complianceRecords: [
      { certificationType: "haccp", status: "obtained", issuer: "MEPA Senegal" },
      { certificationType: "halal", status: "obtained", issuer: "Halal Authority" },
      { certificationType: "iso-9001", status: "obtained", issuer: "SGS" },
      { certificationType: "bap", status: "obtained", issuer: "GAA" },
    ],
  },
  {
    companyName: "Zambia Copper Mines Ltd",
    contactName: "Chanda Bwalya", email: "chanda@zambiacopper.co.zm", phone: "+260977123456",
    country: "Zambia", ersScore: 82, monthlyRetainer: 5000,
    products: [
      { name: "Copper Cathode", category: "minerals", certifications: "ISO 9001, ISO 14001, Conflict-free", exportVolume: "5000", unit: "tons/month", pricing: "$8,800/ton CIF Busan" },
    ],
    complianceRecords: [
      { certificationType: "iso-9001", status: "obtained", issuer: "SGS" },
      { certificationType: "iso-14001", status: "obtained", issuer: "SGS" },
      { certificationType: "conflict-free", status: "obtained", issuer: "ICGLR" },
    ],
  },
  {
    companyName: "Nigeria Palm Oil Refinery",
    contactName: "Chioma Okafor", email: "chioma@nigeriapalm.ng", phone: "+2348031234567",
    country: "Nigeria", ersScore: 65, monthlyRetainer: 1800,
    products: [
      { name: "Refined Palm Oil", category: "agriculture", certifications: "HACCP, ISO 9001, Organic", exportVolume: "8000", unit: "tons/month", pricing: "$950/ton FOB Lagos" },
      { name: "Shea Butter", category: "agriculture", certifications: "HACCP, Organic", exportVolume: "2000", unit: "tons/month", pricing: "$2,500/ton FOB Lagos" },
    ],
    complianceRecords: [
      { certificationType: "haccp", status: "obtained", issuer: "NAFDAC" },
      { certificationType: "iso-9001", status: "obtained", issuer: "SGS" },
      { certificationType: "organic", status: "in-progress", issuer: "Ecocert", notes: "Documentation phase" },
    ],
  },
  {
    companyName: "Morocco Textile Works",
    contactName: "Youssef Benali", email: "youssef@moroccotextile.ma", phone: "+212612345678",
    country: "Morocco", ersScore: 74, monthlyRetainer: 1600,
    products: [
      { name: "Cotton Fabric", category: "manufactured-goods", certifications: "GOTS, Organic, ISO 9001, OEKO-TEX", exportVolume: "30000", unit: "units/month", pricing: "$15.00/unit FOB Casablanca" },
      { name: "Leather Goods", category: "manufactured-goods", certifications: "ISO 9001, OEKO-TEX", exportVolume: "20000", unit: "units/month", pricing: "$25.00/unit FOB Casablanca" },
    ],
    complianceRecords: [
      { certificationType: "gots", status: "obtained", issuer: "GOTS International" },
      { certificationType: "organic", status: "obtained", issuer: "Ecocert" },
      { certificationType: "iso-9001", status: "obtained", issuer: "SGS" },
      { certificationType: "oeko-tex", status: "obtained", issuer: "OEKO-TEX" },
    ],
  },
  {
    companyName: "South Africa Wine Estates",
    contactName: "Pieter van der Merwe", email: "pieter@sawines.co.za", phone: "+272112345678",
    country: "South Africa", ersScore: 78, monthlyRetainer: 1400,
    products: [
      { name: "Chenin Blanc", category: "agriculture", certifications: "HACCP, Organic, Fair Trade", exportVolume: "20000", unit: "cases/year", pricing: "$60.00/case FOB Cape Town" },
      { name: "Cabernet Sauvignon", category: "agriculture", certifications: "HACCP, Organic", exportVolume: "18000", unit: "cases/year", pricing: "$72.00/case FOB Cape Town" },
      { name: "Brandy", category: "agriculture", certifications: "HACCP", exportVolume: "12000", unit: "cases/year", pricing: "$45.00/case FOB Cape Town" },
    ],
    complianceRecords: [
      { certificationType: "haccp", status: "obtained", issuer: "SABS" },
      { certificationType: "organic", status: "obtained", issuer: "Ecocert" },
      { certificationType: "fair-trade", status: "obtained", issuer: "Fair Trade International" },
    ],
  },
]

async function main() {
  console.log("\n🌱 Seeding Sokogate Expanded Supplier Data...\n")

  // Get admin user
  const adminUser = await prisma.user.findFirst({ where: { role: "admin" } })
  if (!adminUser) {
    console.error("  ❌ No admin user found. Run `prisma/seed.ts` first.")
    process.exit(1)
  }
  console.log(`  ✅ Using admin user: ${adminUser.email}\n`)

  // Clear existing supplier-related data
  await prisma.clientCompliance.deleteMany({
    where: { clientId: { startsWith: "soko-" } },
  })
  await prisma.clientProduct.deleteMany({
    where: { clientId: { startsWith: "soko-" } },
  })
  await prisma.lead.deleteMany({ where: { id: { startsWith: "soko-lead-" } } })
  await prisma.client.deleteMany({ where: { id: { startsWith: "soko-" } } })
  await prisma.retainer.deleteMany({ where: { id: { startsWith: "soko-ret-" } } })
  await prisma.activity.deleteMany({ where: { entityId: { startsWith: "soko-" } } })
  console.log("  Cleared existing Sokogate seed data")

  // Seed each supplier as a client with products and compliance records
  let clientIndex = 0
  for (const sup of suppliers) {
    clientIndex++
    const clientId = `soko-client-${clientIndex}`
    const leadId = `soko-lead-${clientIndex}`
    const retainerId = `soko-ret-${clientIndex}`

    // Create client
    const client = await prisma.client.create({
      data: {
        id: clientId,
        name: sup.companyName,
        company: sup.companyName,
        email: sup.email,
        phone: sup.phone,
        status: "active",
        tier: sup.monthlyRetainer >= 2500 ? "enterprise" : sup.monthlyRetainer >= 1500 ? "growth" : "starter",
        monthlyRetainer: sup.monthlyRetainer,
        source: "sokogate-platform",
        corridor: "korea-africa",
        ersScore: sup.ersScore,
        ersBreakdown: JSON.stringify({
          documentation: Math.round(sup.ersScore * 0.3),
          compliance: Math.round(sup.ersScore * 0.3),
          exportHistory: Math.round(sup.ersScore * 0.25),
          capacityVerified: Math.round(sup.ersScore * 0.15),
        }),
        notes: `${sup.companyName} — ${sup.country}. ERS: ${sup.ersScore}/100. Registered via Sokogate platform.`,
        userId: adminUser.id,
      },
    })

    // Create lead
    await prisma.lead.create({
      data: {
        id: leadId,
        companyName: sup.companyName,
        contactName: sup.contactName,
        email: sup.email,
        phone: sup.phone,
        country: sup.country,
        status: "converted",
        qualificationScore: sup.ersScore,
        source: "sokogate-platform",
        notes: `Converted supplier from Sokogate. ERS: ${sup.ersScore}/100.`,
        userId: adminUser.id,
        clientId: client.id,
      },
    })

    // Create products
    for (let pi = 0; pi < sup.products.length; pi++) {
      const prod = sup.products[pi]
      const product = await prisma.clientProduct.create({
        data: {
          id: `soko-prod-${clientIndex}-${pi + 1}`,
          clientId: client.id,
          name: prod.name,
          category: prod.category,
          certifications: prod.certifications,
          exportVolume: prod.exportVolume,
          unit: prod.unit,
          pricing: prod.pricing,
          description: `${prod.name} — ${sup.companyName}`,
        },
      })

      // Create compliance records per product
      for (let ci = 0; ci < sup.complianceRecords.length; ci++) {
        const rec = sup.complianceRecords[ci]
        const certNames = rec.certificationType.split(",").map((c) => c.trim())
        for (const cert of certNames) {
          // Only link product-level certs that match the product's listed certs
          const productCerts = prod.certifications.toLowerCase()
          if (productCerts.includes(cert.toLowerCase())) {
            await prisma.clientCompliance.create({
              data: {
                id: `soko-comp-${clientIndex}-${pi + 1}-${ci + 1}`,
                clientId: client.id,
                productId: product.id,
                certificationType: cert,
                status: rec.status,
                issuer: rec.issuer || null,
                notes: rec.notes || null,
                obtainedAt: rec.status === "obtained" ? new Date("2026-01-15") : null,
                expiresAt: rec.status === "obtained" ? new Date("2027-01-15") : null,
              },
            })
          }
        }
      }
    }

    // Create retainer
    await prisma.retainer.create({
      data: {
        id: retainerId,
        clientId: client.id,
        name: `${sup.companyName} — Sokogate Trade Corridor Retainer`,
        amountUsd: sup.monthlyRetainer,
        billingCycle: "monthly",
        status: "active",
        startDate: "2026-01-01",
        nextBillingDate: "2026-07-01",
        notes: `Trade corridor retainer for ${sup.companyName}. ERS: ${sup.ersScore}/100.`,
        userId: adminUser.id,
      },
    })

    // Create activity entry
    await prisma.activity.create({
      data: {
        type: "client_created",
        description: `Client ${sup.companyName} seeded from Sokogate expanded data (ERS: ${sup.ersScore})`,
        entityType: "client",
        entityId: client.id,
        userId: adminUser.id,
      },
    })

    console.log(`  ✅ ${clientIndex.toString().padStart(2, " ")}. ${sup.companyName.padEnd(32)} | ${sup.country.padEnd(14)} | ERS: ${sup.ersScore} | $${sup.monthlyRetainer}/mo | ${sup.products.length} product(s)`)
  }

  console.log(`\n  ── Summary ──`)
  console.log(`     Suppliers seeded: ${suppliers.length}`)
  console.log(`     Total products:   ${suppliers.reduce((s, p) => s + p.products.length, 0)}`)
  console.log(`     Total retainers:  ${suppliers.length}`)
  console.log(`     Total MRR:        $${suppliers.reduce((s, p) => s + p.monthlyRetainer, 0).toLocaleString()}/mo`)

  console.log(`\n✅ Sokogate expanded seed complete!`)
  console.log(`   ${suppliers.length} suppliers (as clients + products + retainers)`)
  console.log(`   ${suppliers.reduce((s, p) => s + p.products.length, 0)} products with compliance records`)
  console.log(`   Total MRR: $${suppliers.reduce((s, p) => s + p.monthlyRetainer, 0).toLocaleString()}/mo`)
  console.log(`\n   ℹ️  To also seed leads/followups/retainers (RevStack), run:`)
  console.log(`      npx tsx prisma/seed-revstack.ts`)
  console.log(`   ℹ️  To run the Hermes full pipeline, set OPENAI_API_KEY and run:`)
  console.log(`      npx tsx scripts/test-hermes-trade-pipeline.ts`)
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
