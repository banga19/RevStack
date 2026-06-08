/**
 * Seed script: Sokogate Expanded Supplier/Buyer Data
 *
 * Currently seeds nothing so new users start fresh.
 * To populate Sokogate supplier data, add records and a PrismaClient to this file.
 *
 * Run: npx tsx prisma/seed-sokogate-expanded.ts
 */

async function main() {
  console.log("Sokogate expanded seed — no demo data (fresh start).")
  console.log("To populate Sokogate supplier data, add records and re-run.")
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
