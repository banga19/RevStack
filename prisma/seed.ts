import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Only create the admin user — no demo data.
  // New users start with an empty database and populate it as they go.

  const adminEmail = process.env.ADMIN_EMAIL || "admin@aibusinessos.com"
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123"

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existingAdmin) {
    console.log(`  Admin user already exists: ${adminEmail}`)
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 12)
    const now = new Date()
    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        subscriptionStatus: "active",
        subscriptionTier: "enterprise",
        subscriptionPlan: "monthly",
        subscriptionStartsAt: now,
      },
    })
    console.log("\n==============================================================")
    console.log("  ADMIN ACCOUNT CREATED")
    console.log("==============================================================")
    console.log(`  Email:    ${adminEmail}`)
    console.log(`  Password: ${adminPassword}`)
    console.log(`  URL:      http://localhost:3000/admin`)
    console.log("==============================================================\n")
  }

  // No demo data is seeded. All seed-data.ts arrays are intentionally empty.
  // To populate demo data for testing, add records to the arrays in src/lib/seed-data.ts.

  console.log("Database seeded successfully — no demo data (fresh start).")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
