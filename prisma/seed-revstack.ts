/**
 * Seed script: RevStack Revenue Automation Data
 *
 * Currently seeds nothing so new users start fresh.
 * To populate RevStack data, add records and a PrismaClient to this file.
 *
 * Run: npx tsx prisma/seed-revstack.ts
 */

async function main() {
  console.log("RevStack seed — no demo data (fresh start).")
  console.log("To populate RevStack data, add records and re-run.")
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
