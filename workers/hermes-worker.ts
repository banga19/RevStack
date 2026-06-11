#!/usr/bin/env tsx
/**
 * Hermes Worker — Standalone BullMQ Worker Process
 *
 * Runs the BullMQ worker for the Hermes autonomous sales pipeline.
 * This is intended to be deployed as a separate container/service
 * from the main Next.js web process so that background job processing
 * doesn't compete for resources with HTTP request handling.
 *
 * Usage:
 *   npx tsx workers/hermes-worker.ts
 *
 * Environment:
 *   REDIS_URL     (required) Redis connection string
 *   DATABASE_URL  (required) Prisma database connection
 *
 * In production, set RUN_WORKER=true in the worker container.
 * The main web process should NOT run the worker.
 *
 * The worker module in src/lib/hermes/queue.ts automatically starts
 * the worker when process.env.NODE_ENV is not "production" or when
 * RUN_WORKER=true is set. This file ensures the worker module is loaded
 * and keeps the process alive.
 */

async function main() {
  console.log("[Hermes Worker] Starting Hermes BullMQ worker...")
  console.log(`[Hermes Worker] Node env: ${process.env.NODE_ENV || "development"}`)
  console.log(`[Hermes Worker] Redis: ${process.env.REDIS_URL || "redis://localhost:6379"}`)

  // Force-enable the worker regardless of environment
  process.env.RUN_WORKER = "true"

  try {
    // Import the queue module — this starts the worker as a side effect
    const { worker, redis } = await import("../src/lib/hermes/queue")

    if (worker) {
      console.log("[Hermes Worker] ✅ Worker initialized and running")
      console.log("[Hermes Worker] Concurrency: 5 jobs, Lock: 60s, Stalled check: 30s")
    } else {
      console.warn("[Hermes Worker] ⚠️ Worker failed to start — check Redis connection")
    }

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log("\n[Hermes Worker] Shutting down gracefully...")
      if (worker) {
        await worker.close()
      }
      await redis.quit()
      process.exit(0)
    }

    process.on("SIGINT", shutdown)
    process.on("SIGTERM", shutdown)

    // Keep the process alive
    console.log("[Hermes Worker] Waiting for jobs... (Ctrl+C to stop)")
  } catch (error) {
    console.error("[Hermes Worker] ❌ Failed to start:", (error as Error).message)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("[Hermes Worker] Fatal error:", err)
  process.exit(1)
})
