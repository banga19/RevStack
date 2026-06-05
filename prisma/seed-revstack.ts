/**
 * Seed script: RevStack Revenue Automation Data
 * Creates realistic African trade business seed data.
 * Idempotent — safe to re-run.
 *
 * Run: npx tsx prisma/seed-revstack.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding RevStack data...")

  // Get admin user (create if doesn't exist)
  let adminUser = await prisma.user.findFirst({ where: { role: "admin" } })
  if (!adminUser) {
    const bcrypt = await import("bcryptjs").then((m) => m.default || m)
    const hashedPassword = await bcrypt.hash("admin123", 12)
    adminUser = await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@revstack.app",
        password: hashedPassword,
        role: "admin",
        subscriptionStatus: "active",
        subscriptionTier: "enterprise",
        subscriptionPlan: "monthly",
        subscriptionStartsAt: new Date(),
      },
    })
    console.log(`  Created admin user: ${adminUser.email}`)
  }

  // Clear existing RevStack data
  await prisma.hermesRun.deleteMany({})
  await prisma.activity.deleteMany({})
  await prisma.message.deleteMany({})
  await prisma.followup.deleteMany({})
  await prisma.retainer.deleteMany({})
  await prisma.lead.deleteMany({})
  console.log("  Cleared existing RevStack data")

  // ── Leads ──────────────────────────────────────────────
  const leadsData = [
    {
      id: "lead-sokogate", companyName: "Sokogate Technologies", contactName: "James Kamau",
      email: "james@sokogate.co.ke", phone: "+254712345678", whatsapp: "+254712345678",
      industry: "Technology", country: "Kenya", status: "qualified", qualificationScore: 90,
      source: "Website", notes: "Leading Kenyan agri-tech platform connecting farmers to markets. Strong digital infrastructure.",
    },
    {
      id: "lead-ultimo", companyName: "Ultimo Trading Ltd", contactName: "Amina Mwinyi",
      email: "amina@ultimotrading.co.ke", phone: "+254723456789", whatsapp: "+254723456789",
      industry: "Import/Export", country: "Kenya", status: "converted", qualificationScore: 85,
      source: "Referral", notes: "B2B trading company specializing in cross-border trade between Kenya, Tanzania, and UAE.",
    },
    {
      id: "lead-kenya-tea", companyName: "Kenya Tea Exporters Co", contactName: "Peter Kiprop",
      email: "peter@kenyatea.co.ke", phone: "+254734567890",
      industry: "Agriculture", country: "Kenya", status: "new",
      source: "LinkedIn", notes: "Large-scale tea exporter supplying to European and Middle Eastern markets.",
    },
    {
      id: "lead-nairobi-agri", companyName: "Nairobi Agri Solutions", contactName: "Grace Wanjiku",
      email: "grace@nairobiagri.co.ke", phone: "+254745678901", whatsapp: "+254745678901",
      industry: "Agriculture", country: "Kenya", status: "new",
      source: "Trade Show", notes: "Agri-input distributor with network of 500+ farmers across East Africa.",
    },
    {
      id: "lead-africa-spice", companyName: "East Africa Spice Hub", contactName: "Hassan Ali",
      email: "hassan@easpice.co.ke", phone: "+254756789012",
      industry: "Agriculture", country: "Kenya", status: "qualified", qualificationScore: 75,
      source: "Referral", notes: "Premium spice exporter specializing in cardamom, turmeric, and vanilla. Exporting to EU and Middle East.",
    },
  ]

  for (const lead of leadsData) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: lead,
      create: { ...lead, userId: adminUser.id },
    })
  }
  console.log(`  Seeded ${leadsData.length} leads`)

  // ── Clients (converted from leads) ─────────────────────
  // Check if Ultimo client already exists
  const existingUltimo = await prisma.client.findFirst({ where: { name: "Ultimo Trading Ltd" } })
  let ultimoClientId: string
  if (!existingUltimo) {
    const ultimo = await prisma.client.create({
      data: {
        name: "Ultimo Trading Ltd", company: "Ultimo Trading Ltd", email: "amina@ultimotrading.co.ke",
        phone: "+254723456789", status: "active", tier: "enterprise", monthlyRetainer: 1500,
        source: "referral", notes: "Strategic client — cross-border trade, AI lead qualification & CRM setup.",
        userId: adminUser.id, corridor: "kenya-uae",
        ersScore: 85, ersBreakdown: JSON.stringify({ documentation: 85, compliance: 80, exportHistory: 90, capacityVerified: 85 }),
      },
    })
    ultimoClientId = ultimo.id

    // Link lead to client via clientId foreign key only
    const ultimoLead = await prisma.lead.findUnique({ where: { id: "lead-ultimo" } })
    if (ultimoLead) {
      await prisma.lead.update({
        where: { id: "lead-ultimo" },
        data: { clientId: ultimoClientId },
      })
    }
  } else {
    ultimoClientId = existingUltimo.id
  }

  const existingSpiceHub = await prisma.client.findFirst({ where: { name: "East Africa Spice Hub" } })
  let spiceHubClientId: string
  if (!existingSpiceHub) {
    const spiceHub = await prisma.client.create({
      data: {
        name: "East Africa Spice Hub", company: "East Africa Spice Hub", email: "hassan@easpice.co.ke",
        phone: "+254756789012", status: "onboarding", tier: "growth", monthlyRetainer: 900,
        source: "referral", notes: "Premium spice exporter — needs WhatsApp outreach automation.",
        userId: adminUser.id,
        corridor: "east-africa-europe",
        ersScore: 75, ersBreakdown: JSON.stringify({ documentation: 70, compliance: 75, exportHistory: 80, capacityVerified: 75 }),
      },
    })
    spiceHubClientId = spiceHub.id
  } else {
    spiceHubClientId = existingSpiceHub.id
  }
  console.log("  Seeded/updated 2 clients")

  // ── Retainers ──────────────────────────────────────────
  const retainersData = [
    { id: "retainer-qualification", clientId: ultimoClientId, name: "AI Lead Qualification & CRM Setup",
      amountUsd: 1500, billingCycle: "monthly", status: "active", startDate: "2026-01-01",
      nextBillingDate: "2026-07-01", notes: "Full AI lead qualification pipeline + CRM integration.", userId: adminUser.id },
    { id: "retainer-whatsapp", clientId: spiceHubClientId, name: "WhatsApp Outreach Automation",
      amountUsd: 900, billingCycle: "monthly", status: "active", startDate: "2026-02-01",
      nextBillingDate: "2026-07-01", notes: "Automated WhatsApp follow-up sequences for spice buyers.", userId: adminUser.id },
  ]

  for (const r of retainersData) {
    await prisma.retainer.upsert({ where: { id: r.id }, update: r, create: r })
  }
  console.log(`  Seeded ${retainersData.length} retainers`)

  // ── Followups ──────────────────────────────────────────
  const followupsData = [
    { id: "fu-1", channel: "whatsapp", messageBody: "Hi James, following up on Sokogate Technologies' interest in our AI lead qualification platform. Would you be available for a 15-min demo this week?", status: "sent", scheduledAt: new Date("2026-06-01T10:00:00Z"), sentAt: new Date("2026-06-01T10:00:00Z") },
    { id: "fu-2", channel: "email", messageBody: "Dear Peter,\n\nThank you for connecting with us at the trade show. We'd love to show you how Mapato can help Kenya Tea Exporters automate their lead qualification and WhatsApp follow-ups.\n\nWould next Tuesday work for a quick call?\n\nBest regards,\nThe Mapato Team", status: "pending", scheduledAt: new Date("2026-06-10T09:00:00Z") },
    { id: "fu-3", channel: "whatsapp", messageBody: "Hi Grace! Just checking in — Nairobi Agri Solutions seems like a great fit for our platform. Want to schedule a quick chat this week?", status: "pending", scheduledAt: new Date("2026-06-12T14:00:00Z") },
  ]

  const allLeads = await prisma.lead.findMany()
  for (let i = 0; i < followupsData.length; i++) {
    const f = followupsData[i]
    await prisma.followup.upsert({
      where: { id: f.id },
      update: f,
      create: { ...f, leadId: allLeads[i]?.id || null, clientId: null },
    })
  }
  console.log(`  Seeded ${followupsData.length} follow-ups`)

  // ── Messages ────────────────────────────────────────────
  const messagesData = [
    { id: "msg-1", channel: "whatsapp", to: "lead-ultimo", body: "Welcome to Mapato! 🎉 Your AI revenue automation system is now active. Check your dashboard to get started.", status: "sent" },
    { id: "msg-2", channel: "email", to: "lead-sokogate", body: "Thank you for your interest in Mapato. We've received your details and will be in touch within 24 hours to schedule your personalized demo.", status: "sent" },
    { id: "msg-3", channel: "whatsapp", to: "lead-africa-spice", body: "Hi Hassan! Your East Africa Spice Hub profile is set up. You can now access the WhatsApp outreach automation tools.", status: "sent" },
  ]

  for (const m of messagesData) {
    await prisma.message.upsert({ where: { id: m.id }, update: m, create: m })
  }
  console.log(`  Seeded ${messagesData.length} messages`)

  // ── Activity (legacy entries) ───────────────────────────
  const activityData = [
    { type: "lead_created", description: "Lead Sokogate Technologies created", entityType: "lead", entityId: "lead-sokogate", userId: adminUser.id },
    { type: "lead_qualified", description: "Lead Sokogate Technologies qualified (score: 90)", entityType: "lead", entityId: "lead-sokogate", userId: adminUser.id },
    { type: "lead_qualified", description: "Lead Ultimo Trading Ltd qualified (score: 85)", entityType: "lead", entityId: "lead-ultimo", userId: adminUser.id },
    { type: "lead_qualified", description: "Lead East Africa Spice Hub qualified (score: 75)", entityType: "lead", entityId: "lead-africa-spice", userId: adminUser.id },
    { type: "client_onboarded", description: "Client Ultimo Trading Ltd onboarded successfully", entityType: "client", entityId: ultimoClientId, userId: adminUser.id },
    { type: "retainer_created", description: "Retainer AI Lead Qualification & CRM Setup created ($1500/mo)", entityType: "retainer", entityId: "retainer-qualification", userId: adminUser.id },
    { type: "message_sent", description: "Message sent via whatsapp to lead-ultimo", entityType: "message", entityId: "msg-1", userId: adminUser.id },
    { type: "hermes_run", description: "Hermes completed: qualify_leads", entityType: "hermes_run", entityId: "hermes-run-1", userId: adminUser.id },
  ]

  for (const a of activityData) {
    await prisma.activity.create({ data: a })
  }
  console.log(`  Seeded ${activityData.length} activity entries`)

  // ── Hermes Run ───────────────────────────────────────────
  await prisma.hermesRun.create({
    data: {
      id: "hermes-run-1",
      taskType: "qualify_leads",
      status: "completed",
      output: "Qualified 3 leads (2 qualified, 1 disqualified).",
      leadsProcessed: 3,
      messagesQueued: 0,
      userId: adminUser.id,
      completedAt: new Date(),
    },
  })
  console.log("  Seeded 1 hermes run")

  console.log("\n✅ RevStack seed complete!")
  console.log(`   ${leadsData.length} leads, 2 clients, ${retainersData.length} retainers`)
  console.log(`   ${followupsData.length} follow-ups, ${messagesData.length} messages`)
  console.log(`   ${activityData.length} activity entries, 1 hermes run`)
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
