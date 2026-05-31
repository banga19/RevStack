import { PrismaClient } from "@prisma/client"
import { planTasks, clients, revenueEntries, contentArticles, documents, financialSnapshots } from "../src/lib/seed-data"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Clear existing data
  await prisma.pipelineAction.deleteMany()
  await prisma.revenueEntry.deleteMany()
  await prisma.outreachCampaign.deleteMany()
  await prisma.contentArticle.deleteMany()
  await prisma.document.deleteMany()
  await prisma.financialSnapshot.deleteMany()
  await prisma.planTask.deleteMany()
  await prisma.client.deleteMany()

  // Seed plan tasks
  for (const task of planTasks) {
    await prisma.planTask.create({ data: task })
  }
  console.log(`Seeded ${planTasks.length} plan tasks`)

  // Seed clients
  for (const client of clients) {
    await prisma.client.create({ data: client })
  }
  console.log(`Seeded ${clients.length} clients`)

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
