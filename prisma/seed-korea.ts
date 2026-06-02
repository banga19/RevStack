/**
 * Seed script: Korean Corridor Pilot Data
 * Creates all 4 pilot cohorts with 20 total participants.
 * Idempotent — safe to re-run.
 *
 * Run: npx tsx prisma/seed-korea.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding Korean corridor pilot data...")

  // Clear all existing pilot data
  await prisma.sokogatePilotParticipant.deleteMany({})
  await prisma.sokogatePilotCohort.deleteMany({})
  console.log("  Cleared existing pilot data")

  // ──────────────────────────────────────────────
  // Cohort 1: Agriculture
  // ──────────────────────────────────────────────
  const cohort1 = await prisma.sokogatePilotCohort.create({
    data: {
      id: "cohort-1-agriculture",
      name: "Cohort 1: Agriculture",
      type: "Coffee, tea, nuts, spices",
      count: 5,
      enrolled: 5,
      startMonth: "Month 1",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-08-31"),
      status: "Recruiting",
      notes: "Agricultural exporters targeting Korea specialty coffee, tea, and snack markets.",
    },
  })

  const cohort1Participants = [
    { id: "participant-kenya-coffee", cohortId: cohort1.id, companyName: "Kenya Coffee Exporters Ltd", contactName: "James Kamau", contactEmail: "james@kenyacoffee.co.ke", country: "Kenya", commodity: "Specialty Arabica coffee, Grade AA", trialStartedAt: new Date("2026-06-01"), trialEndsAt: new Date("2026-08-31"), status: "active", notes: "Leading Kenyan coffee exporter. 2000 kg/month to EU. HACCP certified. ERS: 78." },
    { id: "participant-tanzania-tea", cohortId: cohort1.id, companyName: "Tanzania Tea Growers Co-op", contactName: "Amina Mwinyi", contactEmail: "amina@tanzaniatea.co.tz", country: "Tanzania", commodity: "Premium black tea, orthodox & CTC grades", trialStartedAt: new Date("2026-06-01"), trialEndsAt: new Date("2026-08-31"), status: "active", notes: "500+ smallholders cooperative. 5000 kg/month. Halal certified. ERS: 72." },
    { id: "participant-ethiopia-spice", cohortId: cohort1.id, companyName: "Ethiopian Spice Traders", contactName: "Tesfaye Abebe", contactEmail: "tesfaye@ethiospice.com", country: "Ethiopia", commodity: "Premium spices (cardamom, turmeric, ginger)", trialStartedAt: new Date("2026-06-01"), trialEndsAt: new Date("2026-08-31"), status: "active", notes: "Addis Ababa-based spice exporter. 1000 kg/month. Organic certified. ERS: 65." },
    { id: "participant-uganda-nuts", cohortId: cohort1.id, companyName: "Uganda Nut Processors Ltd", contactName: "Grace Okello", contactEmail: "grace@ugandanuts.co.ug", country: "Uganda", commodity: "Macadamia nuts, cashews, sesame seeds", trialStartedAt: new Date("2026-06-01"), trialEndsAt: new Date("2026-08-31"), status: "invited", notes: "Kampala-based nut processor. 3000 kg/month. HACCP certified. ERS: 58." },
    { id: "participant-rwanda-coffee", cohortId: cohort1.id, companyName: "Rwanda Mountain Coffee", contactName: "Jean-Pierre Habimana", contactEmail: "jp@rwandacoffee.rw", country: "Rwanda", commodity: "Single-origin Arabica coffee, fully washed", trialStartedAt: new Date("2026-06-15"), trialEndsAt: new Date("2026-09-14"), status: "invited", notes: "Premium Rwandan coffee exporter. 1500 kg/month. Organic & Fair Trade certified. ERS: 82." },
  ]

  for (const p of cohort1Participants) {
    await prisma.sokogatePilotParticipant.upsert({ where: { id: p.id }, update: p, create: p })
  }
  console.log(`  Cohort 1: Agriculture — ${cohort1Participants.length} participants`)

  // ──────────────────────────────────────────────
  // Cohort 2: Minerals & Metals
  // ──────────────────────────────────────────────
  const cohort2 = await prisma.sokogatePilotCohort.create({
    data: {
      id: "cohort-2-minerals",
      name: "Cohort 2: Minerals & Metals",
      type: "Titanium, graphite, copper, cobalt",
      count: 5,
      enrolled: 5,
      startMonth: "Month 2",
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-09-30"),
      status: "Planning",
      notes: "Mineral and metal exporters targeting Korean industrial & electronics supply chains.",
    },
  })

  const cohort2Participants = [
    { id: "participant-tanzania-graphite", cohortId: cohort2.id, companyName: "Tanzania Graphite Resources", contactName: "Hassan Mwamba", contactEmail: "hassan@tzgraphite.co.tz", country: "Tanzania", commodity: "Flake graphite, high-purity 94-97% C", trialStartedAt: new Date("2026-07-01"), trialEndsAt: new Date("2026-09-30"), status: "invited", notes: "Large-scale graphite mine in Morogoro. 5000 tons/year capacity. ERS: 68. Korean battery manufacturers target." },
    { id: "participant-drc-cobalt", cohortId: cohort2.id, companyName: "DRC Cobalt Supply Co.", contactName: "Pierre Kasongo", contactEmail: "pierre@drc-cobalt.cd", country: "DRC", commodity: "Cobalt hydroxide, 99.8% purity", trialStartedAt: new Date("2026-07-01"), trialEndsAt: new Date("2026-09-30"), status: "invited", notes: "Lubumbashi-based cobalt exporter. 200 tons/month. Conflict-free certified. ERS: 62." },
    { id: "participant-zambia-copper", cohortId: cohort2.id, companyName: "Zambia Copper Export Corp", contactName: "Chilufya Banda", contactEmail: "chilufya@zambia-copper.zm", country: "Zambia", commodity: "Electrolytic copper cathode, Grade A", trialStartedAt: new Date("2026-07-01"), trialEndsAt: new Date("2026-09-30"), status: "invited", notes: "Lusaka-based copper trader. 1000 tons/month. ISO 9001 certified. ERS: 74. Korean electronics manufacturers." },
    { id: "participant-kenya-titanium", cohortId: cohort2.id, companyName: "Kenya Titanium Mining Ltd", contactName: "Faith Wanjiku", contactEmail: "faith@kenyatitanium.co.ke", country: "Kenya", commodity: "Ilmenite, rutile, zircon sands", trialStartedAt: new Date("2026-07-01"), trialEndsAt: new Date("2026-09-30"), status: "invited", notes: "Coastal Kenya mineral sands operation. 100,000 tons/year ilmenite. ERS: 56. Korean paint & pigment industry." },
    { id: "participant-mozambique-graphite", cohortId: cohort2.id, companyName: "Mozambique Mining Ventures", contactName: "Carlos dos Santos", contactEmail: "carlos@mozmining.mz", country: "Mozambique", commodity: "Vein graphite, 99% purity", trialStartedAt: new Date("2026-07-15"), trialEndsAt: new Date("2026-10-14"), status: "invited", notes: "Cabo Delgado graphite project. 3000 tons/year. ERS: 45. Needs compliance support for Korean import." },
  ]

  for (const p of cohort2Participants) {
    await prisma.sokogatePilotParticipant.upsert({ where: { id: p.id }, update: p, create: p })
  }
  console.log(`  Cohort 2: Minerals & Metals — ${cohort2Participants.length} participants`)

  // ──────────────────────────────────────────────
  // Cohort 3: Manufactured Goods
  // ──────────────────────────────────────────────
  const cohort3 = await prisma.sokogatePilotCohort.create({
    data: {
      id: "cohort-3-manufactured",
      name: "Cohort 3: Manufactured Goods",
      type: "Textiles, processed foods, leather goods",
      count: 5,
      enrolled: 5,
      startMonth: "Month 3",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-10-31"),
      status: "Planning",
      notes: "Manufactured goods exporters targeting Korean consumer and industrial markets.",
    },
  })

  const cohort3Participants = [
    { id: "participant-uganda-textiles", cohortId: cohort3.id, companyName: "Uganda Cotton & Textiles Ltd", contactName: "Sarah Nakato", contactEmail: "sarah@ugtextiles.co.ug", country: "Uganda", commodity: "Organic cotton fabric, finished garments", trialStartedAt: new Date("2026-08-01"), trialEndsAt: new Date("2026-10-31"), status: "invited", notes: "Kampala-based textile manufacturer. 50,000 meters/month. GOTS certified, Organic. ERS: 70." },
    { id: "participant-kenya-processed", cohortId: cohort3.id, companyName: "Kenya Agro-Processors", contactName: "Peter Mwangi", contactEmail: "peter@kenyaagro.co.ke", country: "Kenya", commodity: "Processed foods: dried fruits, juices, sauces", trialStartedAt: new Date("2026-08-01"), trialEndsAt: new Date("2026-10-31"), status: "invited", notes: "Nairobi food processor. 2000 kg/month dried mangoes, 5000 L/month juices. HACCP, FDA reg. ERS: 67." },
    { id: "participant-ethiopia-leather", cohortId: cohort3.id, companyName: "Ethiopian Leather Industries", contactName: "Meron Alemu", contactEmail: "meron@ethioleather.et", country: "Ethiopia", commodity: "Finished leather, leather goods (bags, shoes)", trialStartedAt: new Date("2026-08-01"), trialEndsAt: new Date("2026-10-31"), status: "invited", notes: "Addis Ababa tannery. 100,000 sq ft/month. ISO certified. ERS: 63. Korean fashion & automotive market." },
    { id: "participant-kenya-soapstone", cohortId: cohort3.id, companyName: "Kenya Artisan Exports", contactName: "Grace Otieno", contactEmail: "grace@kenyaartisan.co.ke", country: "Kenya", commodity: "Soapstone carvings, handicrafts, home decor", trialStartedAt: new Date("2026-08-01"), trialEndsAt: new Date("2026-10-31"), status: "invited", notes: "Kisumu-based artisan cooperative. 5000 pieces/month. FLO certified. ERS: 52. Korean home decor market." },
    { id: "participant-rwanda-construction", cohortId: cohort3.id, companyName: "Rwanda Building Materials Ltd", contactName: "Patrick Mugabo", contactEmail: "patrick@rwandabuild.rw", country: "Rwanda", commodity: "Clay bricks, roof tiles, stone aggregates", trialStartedAt: new Date("2026-08-15"), trialEndsAt: new Date("2026-11-14"), status: "invited", notes: "Kigali construction materials supplier. 50,000 units/month. ERS: 48. Korean construction firms in Africa." },
  ]

  for (const p of cohort3Participants) {
    await prisma.sokogatePilotParticipant.upsert({ where: { id: p.id }, update: p, create: p })
  }
  console.log(`  Cohort 3: Manufactured Goods — ${cohort3Participants.length} participants`)

  // ──────────────────────────────────────────────
  // Cohort 4: Mixed Commodities
  // ──────────────────────────────────────────────
  const cohort4 = await prisma.sokogatePilotCohort.create({
    data: {
      id: "cohort-4-mixed",
      name: "Cohort 4: Mixed Commodities",
      type: "Pan-Africa → Korea (diverse)",
      count: 5,
      enrolled: 5,
      startMonth: "Month 4",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-11-30"),
      status: "Planning",
      notes: "Final pilot cohort — diverse African exporters targeting broad Korean market segments.",
    },
  })

  const cohort4Participants = [
    { id: "participant-ghana-cocoa", cohortId: cohort4.id, companyName: "Ghana Cocoa Processing Co.", contactName: "Kwame Asante", contactEmail: "kwame@ghanacocoa.gh", country: "Ghana", commodity: "Cocoa butter, cocoa powder, cocoa liquor", trialStartedAt: new Date("2026-09-01"), trialEndsAt: new Date("2026-11-30"), status: "invited", notes: "Tema-based cocoa processor. 10,000 tons/year. UTZ, Rainforest Alliance certified. ERS: 80. Korean confectionery." },
    { id: "participant-nigeria-oil", cohortId: cohort4.id, companyName: "Nigeria Palm Oil Corp", contactName: "Chioma Obi", contactEmail: "chioma@nigeriapalm.ng", country: "Nigeria", commodity: "Red palm oil, palm kernel oil, shea butter", trialStartedAt: new Date("2026-09-01"), trialEndsAt: new Date("2026-11-30"), status: "invited", notes: "Lagos-based processor. 5000 tons/month palm oil. HACCP, Organic. ERS: 66. Korean food & cosmetics industry." },
    { id: "participant-sa-wine", cohortId: cohort4.id, companyName: "South Africa Premium Wines", contactName: "Johan van der Merwe", contactEmail: "johan@sawines.co.za", country: "South Africa", commodity: "Premium wines, brandy, fruit juices", trialStartedAt: new Date("2026-09-01"), trialEndsAt: new Date("2026-11-30"), status: "invited", notes: "Stellenbosch winery cooperative. 500,000 liters/year. Organic, Fair Trade. ERS: 85. Korean luxury market." },
    { id: "participant-senegal-fish", cohortId: cohort4.id, companyName: "Senegal Seafood Exporters", contactName: "Fatou Diop", contactEmail: "fatou@senegalseafood.sn", country: "Senegal", commodity: "Frozen fish, octopus, shrimp, tuna", trialStartedAt: new Date("2026-09-01"), trialEndsAt: new Date("2026-11-30"), status: "invited", notes: "Dakar-based seafood exporter. 2000 tons/year. HACCP, EU certified. ERS: 73. Korean seafood market demand." },
    { id: "participant-egypt-cotton", cohortId: cohort4.id, companyName: "Egyptian Cotton Exports", contactName: "Ahmed Hassan", contactEmail: "ahmed@egyptcotton.eg", country: "Egypt", commodity: "Extra-long staple cotton, cotton yarn", trialStartedAt: new Date("2026-09-01"), trialEndsAt: new Date("2026-11-30"), status: "invited", notes: "Alexandria-based cotton exporter. 10,000 bales/year. GOTS certified. ERS: 76. Korean textile manufacturers." },
  ]

  for (const p of cohort4Participants) {
    await prisma.sokogatePilotParticipant.upsert({ where: { id: p.id }, update: p, create: p })
  }
  console.log(`  Cohort 4: Mixed Commodities — ${cohort4Participants.length} participants`)

  // ──────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────
  const total = cohort1Participants.length + cohort2Participants.length + cohort3Participants.length + cohort4Participants.length
  console.log(`\n Korean corridor pilot seed complete!`)
  console.log(`   Total cohorts: 4 (20 companies)`)
  console.log(`   C1 Agriculture: ${cohort1Participants.length} companies`)

  console.log(`   C2 Minerals & Metals: ${cohort2Participants.length} companies`)
  console.log(`   C3 Manufactured Goods: ${cohort3Participants.length} companies`)
  console.log(`   C4 Mixed Commodities: ${cohort4Participants.length} companies`)
  console.log(`   Total: ${total} participants across 13 African countries`)
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
