import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { planTasks, clients, revenueEntries, contentArticles, documents, financialSnapshots, clientProducts, complianceRecords, tradeFinanceApps } from "../src/lib/seed-data"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Clear existing data
  await prisma.tradeFinanceApplication.deleteMany()
  await prisma.clientCompliance.deleteMany()
  await prisma.clientProduct.deleteMany()
  await prisma.pipelineAction.deleteMany()
  await prisma.revenueEntry.deleteMany()
  await prisma.outreachCampaign.deleteMany()
  await prisma.contentArticle.deleteMany()
  await prisma.onboardingResponse.deleteMany()
  await prisma.user.deleteMany()
  await prisma.document.deleteMany()
  await prisma.financialSnapshot.deleteMany()
  await prisma.planTask.deleteMany()
  await prisma.client.deleteMany()

  // Seed admin user (password: admin123)
  const adminEmail = process.env.ADMIN_EMAIL || "admin@aibusinessos.com"
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123"
  const hashedPassword = await bcrypt.hash(adminPassword, 12)
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    },
  })
  console.log("\n==============================================================")
  console.log("  ADMIN ACCOUNT CREATED")
  console.log("==============================================================")
  console.log(`  Email:    ${adminEmail}`)
  console.log(`  Password: ${adminPassword}`)
  console.log(`  URL:      http://localhost:3000/admin`)
  console.log("==============================================================\n")

  // Seed plan tasks FIRST (independent)
  for (const task of planTasks) {
    await prisma.planTask.create({ data: task })
  }
  console.log(`Seeded ${planTasks.length} plan tasks`)

  // Seed clients ONLY for admin user for demonstration/reference
  // New users will NOT get any demo data - their dashboard will be empty until they add data
  if (adminUser.id) {
    for (const client of clients) {
      await prisma.client.create({
        data: {
          ...client,
          userId: adminUser.id,
        }
      })
    }
    console.log(`Seeded ${clients.length} clients (owned by admin only)`)
  }

  // Seed client products
  const clientMap = new Map<string, string>()
  const seededClients = await prisma.client.findMany()
  for (const c of seededClients) {
    clientMap.set(c.name, c.id)
  }

  for (const prod of clientProducts) {
    const clientId = clientMap.get(prod.clientName)
    if (clientId) {
      const { clientName, ...productData } = prod
      await prisma.clientProduct.create({
        data: { ...productData, clientId },
      })
    }
  }
  console.log(`Seeded ${clientProducts.length} client products`)

  // Seed compliance records
  const productMap = new Map<string, string>()
  const seededProducts = await prisma.clientProduct.findMany()
  for (const p of seededProducts) {
    productMap.set(`${p.clientId}-${p.name}`, p.id)
  }

  for (const rec of complianceRecords) {
    const clientId = clientMap.get(rec.clientName)
    if (clientId) {
      let productId: string | undefined
      if (rec.productName) {
        productId = productMap.get(`${clientId}-${rec.productName}`)
      }
      const { clientName, productName, ...complianceData } = rec
      await prisma.clientCompliance.create({
        data: {
          ...complianceData,
          clientId,
          productId: productId || null,
          appliedAt: complianceData.appliedAt ? new Date(complianceData.appliedAt) : null,
          obtainedAt: complianceData.obtainedAt ? new Date(complianceData.obtainedAt) : null,
          expiresAt: complianceData.expiresAt ? new Date(complianceData.expiresAt) : null,
        },
      })
    }
  }
  console.log(`Seeded ${complianceRecords.length} compliance records`)

  // Seed trade finance applications
  for (const app of tradeFinanceApps) {
    const clientId = clientMap.get(app.clientName)
    if (clientId) {
      const { clientName, ...appData } = app
      await prisma.tradeFinanceApplication.create({
        data: {
          ...appData,
          clientId,
          amount: appData.amount || null,
          appliedAt: appData.appliedAt ? new Date(appData.appliedAt) : null,
          approvedAt: appData.approvedAt ? new Date(appData.approvedAt) : null,
          disbursedAt: appData.disbursedAt ? new Date(appData.disbursedAt) : null,
        },
      })
    }
  }
  console.log(`Seeded ${tradeFinanceApps.length} trade finance applications`)

  // Seed revenue entries
  for (const entry of revenueEntries) {
    await prisma.revenueEntry.create({ data: entry })
  }
  console.log(`Seeded ${revenueEntries.length} revenue entries`)

  // Seed content articles
  for (const article of contentArticles) {
    await prisma.contentArticle.create({ data: article })
  }
  console.log(`Seeded ${contentArticles.length} content articles`)

  // Seed documents
  for (const doc of documents) {
    await prisma.document.create({ data: doc })
  }
  console.log(`Seeded ${documents.length} documents`)

  // Seed financial snapshots
  for (const snap of financialSnapshots) {
    await prisma.financialSnapshot.create({ data: snap })
  }
  console.log(`Seeded ${financialSnapshots.length} financial snapshots`)

  console.log("Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
