#!/usr/bin/env tsx
/**
 * Hermes Worker — Standalone Entrypoint
 *
 * Designed to be run as a separate container/process in production.
 * It imports the queue module which starts the BullMQ worker automatically.
 *
 * Usage:
 *   tsx workers/hermes-worker.ts
 *
 * Docker:
 *   CMD ["npx", "tsx", "workers/hermes-worker.ts"]
 *
 * Environment:
 *   REDIS_URL         (required) Redis connection string
 *   RUN_WORKER=true   (required in production) enables the worker process
 *   DATABASE_URL      (required) Prisma database connection
 */

// Force the worker to start even if NODE_ENV is production
process.env.RUN_WORKER = "true"

import "@/lib/hermes/queue"

// Log startup
console.log("[Hermes Worker] Started — waiting for jobs...")
console.log(`[Hermes Worker] Redis: ${process.env.REDIS_URL || "redis://localhost:6379"}`)
console.log(`[Hermes Worker] NODE_ENV: ${process.env.NODE_ENV || "development"}`)

// Keep the process alive
setInterval(() => {
  // Heartbeat — BullMQ handles reconnection internally
}, 30_000)
