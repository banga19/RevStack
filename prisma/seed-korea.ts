/**
 * Seed script: Korean Corridor Pilot Data
 *
 * Currently seeds nothing so new users start fresh.
 * To populate pilot cohorts, add cohort data and a PrismaClient to this file.
 *
 * Run: npx tsx prisma/seed-korea.ts
 */

async function main() {
  console.log("Korean corridor pilot seed — no demo data (fresh start).")
  console.log("To populate pilot cohorts, add cohort data and re-run.")
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
