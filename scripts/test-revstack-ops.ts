/**
 * Test Script: RevStack Operations Agent
 *
 * Seeds test data (clients + retainers) then runs the revstack-ops agent
 * via the Hermes Central Brain to test invoice generation and client health scoring.
 *
 * Usage: npx tsx scripts/test-revstack-ops.ts
 */

import { prisma } from "@/lib/db"
import { revstackOperationsAgentAction } from "@/lib/agent-service-bridge"

async function seedTestData(userId: string) {
  console.log("\n─── Seeding Test Data ──────────────────────────")

  // Create clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        userId,
        name: "Ultimo Trading Ltd",
        company: "Ultimo Trading",
        email: "ultimo@example.com",
        phone: "+254700100001",
        status: "active",
        tier: "enterprise",
        monthlyRetainer: 4500,
        corridor: "china-africa",
        ersScore: 82,
        notes: "Premium retainer client. Coffee & tea exports to China.",
      },
    }),
    prisma.client.create({
      data: {
        userId,
        name: "Soko Fresh Produce",
        company: "Soko Fresh Ltd",
        email: "soko@example.com",
        phone: "+254700100002",
        status: "active",
        tier: "growth",
        monthlyRetainer: 2500,
        corridor: "korea-africa",
        ersScore: 68,
        notes: "Fresh produce exporter to Korea. Active engagement.",
      },
    }),
    prisma.client.create({
      data: {
        userId,
        name: "M-Pesa Global Traders",
        company: "M-Pesa Global",
        email: "mpesa@example.com",
        phone: "+254700100003",
        status: "onboarding",
        tier: "starter",
        monthlyRetainer: 1000,
        corridor: "africa-africa",
        ersScore: 45,
        notes: "New client. Still onboarding — low engagement.",
      },
    }),
    prisma.client.create({
      data: {
        userId,
        name: "East Africa Logistics Hub",
        company: "EA Logistics",
        email: "logistics@example.com",
        phone: "+254700100004",
        status: "active",
        tier: "growth",
        monthlyRetainer: 3000,
        corridor: "china-africa",
        ersScore: 75,
        notes: "Logistics & warehousing. Good compliance status.",
      },
    }),
    prisma.client.create({
      data: {
        userId,
        name: "Nairobi Commodities Exchange",
        company: "Nairobi Commodities",
        email: "nairobi@example.com",
        phone: "+254700100005",
        status: "qualified",
        tier: "starter",
        monthlyRetainer: 0,
        notes: "Qualified lead, no retainer yet.",
      },
    }),
  ])
  console.log(`  Created ${clients.length} test clients`)

  // Create retainers with varying start dates to test billing
  const now = new Date()
  const retainers = await Promise.all([
    prisma.retainer.create({
      data: {
        clientId: clients[0].id,
        userId,
        name: "Premium Trade Advisory Retainer",
        amountUsd: 4500,
        billingCycle: "monthly",
        status: "active",
        startDate: new Date(now.getFullYear(), now.getMonth() - 4, 1).toISOString(),
        nextBillingDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(), // Overdue
      },
    }),
    prisma.retainer.create({
      data: {
        clientId: clients[1].id,
        userId,
        name: "Soko Fresh Korea Corridor Retainer",
        amountUsd: 2500,
        billingCycle: "monthly",
        status: "active",
        startDate: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString(),
        nextBillingDate: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString(), // Overdue
      },
    }),
    prisma.retainer.create({
      data: {
        clientId: clients[2].id,
        userId,
        name: "Starter Onboarding Retainer",
        amountUsd: 1000,
        billingCycle: "monthly",
        status: "active",
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
        nextBillingDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(), // Due last month
      },
    }),
    prisma.retainer.create({
      data: {
        clientId: clients[3].id,
        userId,
        name: "EA Logistics Retainer",
        amountUsd: 3000,
        billingCycle: "quarterly",
        status: "active",
        startDate: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString(),
        nextBillingDate: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString(), // Overdue quarterly
      },
    }),
  ])
  console.log(`  Created ${retainers.length} test retainers`)

  // Add compliance records for some clients
  await Promise.all([
    prisma.clientCompliance.create({
      data: {
        clientId: clients[0].id,
        certificationType: "haccp",
        status: "obtained",
        issuer: "KEBS",
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        notes: "HACCP certified for coffee processing",
      },
    }),
    prisma.clientCompliance.create({
      data: {
        clientId: clients[0].id,
        certificationType: "organic",
        status: "obtained",
        issuer: "Ecocert",
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        notes: "Organic certification for export",
      },
    }),
    prisma.clientCompliance.create({
      data: {
        clientId: clients[1].id,
        certificationType: "halal",
        status: "obtained",
        issuer: "Halal Authority",
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        notes: "Halal certification",
      },
    }),
    prisma.clientCompliance.create({
      data: {
        clientId: clients[3].id,
        certificationType: "iso-9001",
        status: "in-progress",
        notes: "ISO 9001 certification in progress",
      },
    }),
  ])
  console.log("  Created compliance records")

  // Add some followups for engagement scoring
  await Promise.all([
    prisma.followup.create({
      data: {
        clientId: clients[0].id,
        channel: "email",
        status: "completed",
        messageBody: "Follow-up: Check in on Ultimo Trading progress",
        scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.followup.create({
      data: {
        clientId: clients[1].id,
        channel: "whatsapp",
        status: "completed",
        messageBody: "WhatsApp check-in with Soko Fresh",
        scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.followup.create({
      data: {
        clientId: clients[3].id,
        channel: "email",
        status: "completed",
        messageBody: "EA Logistics onboarding follow-up",
        scheduledAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
    }),
  ])
  console.log("  Created followup records for engagement scoring")

  return { clients, retainers }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗")
  console.log("║     RevStack Operations Agent — Test Run                ║")
  console.log("╚══════════════════════════════════════════════════════════╝")

  // Get the admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@aibusinessos.com"
  let user = await prisma.user.findUnique({ where: { email: adminEmail } })

  if (!user) {
    // Create admin user if not exists
    const bcrypt = await import("bcryptjs")
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 12)
    user = await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        subscriptionStatus: "active",
        subscriptionTier: "enterprise",
        subscriptionPlan: "monthly",
      },
    })
    console.log("\n  Created admin user")
  }
  console.log(`\n  Using user: ${user.email} (${user.id})`)

  // Clean up existing test data
  await prisma.invoice.deleteMany({ where: { userId: user.id } })
  await prisma.activity.deleteMany({ where: { userId: user.id } })
  await prisma.retainer.deleteMany({ where: { userId: user.id } })
  await prisma.clientCompliance.deleteMany({ where: { client: { userId: user.id } } })
  await prisma.followup.deleteMany({ where: { client: { userId: user.id } } })
  const existingClients = await prisma.client.findMany({ where: { userId: user.id }, select: { id: true } })
  await prisma.client.deleteMany({ where: { userId: user.id } })
  console.log(`  Cleaned up ${existingClients.length} existing clients and related data`)

  // Seed test data
  const { clients, retainers } = await seedTestData(user.id)

  // ── Run RevStack Operations Agent ──────────────────────────
  console.log("\n─── Running RevStack Operations Agent ────────────")
  console.log("  Action: generate-invoices + client-health-score\n")

  const result = await revstackOperationsAgentAction("all", {
    sessionId: `test-${user.id}`,
    objective: "Test RevStack Operations: Generate invoices for due retainers and score client health",
    startTime: Date.now(),
  })

  console.log("\n─── AGENT RESULT ─────────────────────────────────")
  console.log(`  Success: ${result.success}`)
  console.log(`  Summary: ${result.summary}`)
  if (result.metrics) {
    console.log("\n  Metrics:")
    for (const [key, value] of Object.entries(result.metrics)) {
      console.log(`    ${key}: ${value}`)
    }
  }
  if (result.details) {
    console.log("\n  Details:")
    console.log(result.details)
  }

  // ── Verify Results ─────────────────────────────────────────
  console.log("\n─── VERIFICATION ─────────────────────────────────")

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    include: { client: { select: { name: true } } },
    orderBy: { issuedAt: "desc" },
  })
  console.log(`\n  Invoices created: ${invoices.length}`)
  for (const inv of invoices) {
    console.log(`    ${inv.invoiceNumber} | ${inv.client.name} | $${inv.amountUsd} | ${inv.status} | Due: ${inv.dueDate.toLocaleDateString()}`)
  }

  const totalOutstanding = invoices
    .filter((i) => i.status === "draft" || i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amountUsd, 0)
  console.log(`  Total outstanding: $${totalOutstanding}`)

  const activities = await prisma.activity.findMany({
    where: { type: { in: ["invoice_generated", "client_health_alert"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  console.log(`\n  Activity entries created: ${activities.length}`)
  for (const a of activities) {
    console.log(`    [${a.type}] ${a.description.substring(0, 100)}`)
  }

  // Show updated retainers
  const updatedRetainers = await prisma.retainer.findMany({
    where: { userId: user.id },
    select: { name: true, nextBillingDate: true },
  })
  console.log(`\n  Updated nextBillingDate on retainers:`)
  for (const r of updatedRetainers) {
    console.log(`    ${r.name}: next billing → ${r.nextBillingDate}`)
  }

  // ── Summary ────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════╗")
  console.log("║     TEST COMPLETE                                       ║")
  console.log("╚══════════════════════════════════════════════════════════╝")
  console.log(`  Invoices created:   ${invoices.length}`)
  console.log(`  Outstanding total:  $${totalOutstanding}`)
  console.log(`  Overdue invoices:   ${invoices.filter((i) => i.status === "overdue").length}`)
  console.log(`  Activity entries:   ${activities.length}`)
  console.log(`\n  Open /revstack on the dashboard to see the widgets update!`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("Test failed:", e)
  process.exit(1)
})
