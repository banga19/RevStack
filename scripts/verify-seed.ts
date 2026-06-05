import { PrismaClient } from "@prisma/client"

const p = new PrismaClient()

async function main() {
  const [clients, products, compliance, retainers, leads, activities, mrr] =
    await Promise.all([
      p.client.count({ where: { id: { startsWith: "soko-" } } }),
      p.clientProduct.count({ where: { clientId: { startsWith: "soko-" } } }),
      p.clientCompliance.count({ where: { clientId: { startsWith: "soko-" } } }),
      p.retainer.count({ where: { id: { startsWith: "soko-ret-" } } }),
      p.lead.count({ where: { id: { startsWith: "soko-lead-" } } }),
      p.activity.count({ where: { entityId: { startsWith: "soko-" } } }),
      p.retainer.aggregate({
        _sum: { amountUsd: true },
        where: { id: { startsWith: "soko-ret-" } },
      }),
    ])

  console.log("=".repeat(55))
  console.log("  📊 SOKOGATE SEED VERIFICATION")
  console.log("=".repeat(55))
  console.log(`  Clients (suppliers):   ${clients}`)
  console.log(`  Products:              ${products}`)
  console.log(`  Compliance records:    ${compliance}`)
  console.log(`  Retainers:             ${retainers}`)
  console.log(`  Leads:                 ${leads}`)
  console.log(`  Activity entries:      ${activities}`)
  console.log(`  Total MRR:             $${(mrr._sum.amountUsd || 0).toLocaleString()}/mo`)
  console.log("=".repeat(55))

  // Show all suppliers ranked by ERS with actual country from lead
  const clientList = await p.client.findMany({
    where: { id: { startsWith: "soko-" } },
    select: { id: true, name: true, corridor: true, ersScore: true, monthlyRetainer: true },
    orderBy: { ersScore: "desc" },
  })

  // Get countries from the Lead table (each client has a unique converted lead)
  const leadCountries = new Map<string, string>()
  const leadRecords = await p.lead.findMany({
    where: { clientId: { startsWith: "soko-" } },
    select: { clientId: true, country: true },
  })
  for (const l of leadRecords) {
    if (l.clientId) leadCountries.set(l.clientId, l.country || "N/A")
  }

  console.log("\n  ── Supplier Rankings (by ERS) ──")
  for (const c of clientList) {
    const country = leadCountries.get(c.id) || "N/A"
    const corridor = c.corridor || "korea-africa"
    console.log(`     ${c.name.padEnd(32)} ${country.padEnd(14)} ERS: ${String(c.ersScore || 0).padStart(2)}  $${c.monthlyRetainer}/mo  [${corridor}]`)
  }

  await p.$disconnect()
}

main()
