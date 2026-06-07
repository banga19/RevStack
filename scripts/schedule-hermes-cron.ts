/**
 * Hermes Cron Schedule — One-Time BullMQ Repeatable Job Registration
 *
 * Run with: npx tsx scripts/schedule-hermes-cron.ts
 *
 * Registers repeatable jobs on the Hermes BullMQ queue so the autonomous
 * sales pipeline runs on a scheduled cadence without needing an external
 * cron service.
 *
 * Run this script once during deployment (or whenever schedules change):
 *
 *   # Register schedules only (safe to run multiple times)
 *   npx tsx scripts/schedule-hermes-cron.ts
 *
 *   # Register schedules AND trigger an immediate sweep
 *   npx tsx scripts/schedule-hermes-cron.ts --trigger-now
 *
 *   # Dry-run: show what would be scheduled without registering
 *   npx tsx scripts/schedule-hermes-cron.ts --dry-run
 *
 * Schedules registered:
 *   - quick-health-check  | every 6 hours  | 0 0,6,12,18 * * *
 *   - sweep-leads         | daily at 7 AM  | 0 7 * * *
 *   - retry-failed        | daily at 5 AM  | 0 5 * * *
 *
 * Environment:
 *   REDIS_URL   (optional, default: redis://localhost:6379)
 *   CRON_SECRET (optional, for triggering sweeps via API)
 */

import { Queue } from "bullmq"
import IORedis from "ioredis"

// ============================================================
// Configuration
// ============================================================

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

interface ScheduleEntry {
  jobName: string
  data: Record<string, unknown>
  pattern: string
  description: string
}

const SCHEDULES: ScheduleEntry[] = [
  {
    jobName: "sweep-leads",
    // isQuickSweep flag is forward-looking — handler in queue.ts can
    // later be updated to do lighter processing for the 6-hourly sweep
    data: { allLeads: true, isQuickSweep: true },
    pattern: "0 */6 * * *",
    description: "Quick lead sweep every 6 hours",
  },
  {
    jobName: "sweep-leads",
    data: { allLeads: true, isQuickSweep: false },
    pattern: "0 7 * * *",
    description: "Full daily lead sweep at 7 AM UTC",
  },
  {
    jobName: "retry-failed",
    data: { autoRetry: true },
    pattern: "0 5 * * *",
    description: "Retry failed jobs daily at 5 AM UTC",
  },
]

// ============================================================
// Helpers
// ============================================================

function log(msg: string): void {
  console.log(`  ${msg}`)
}

function divider(title: string): void {
  const line = "─".repeat(50)
  console.log(`\n${line}`)
  console.log(`  ${title}`)
  console.log(line)
}

function formatCron(p: string): string {
  const parts = p.split(" ")
  const labels: Record<string, string> = {
    "*/6": "every 6h",
    "*": "every",
  }
  const desc = SCHEDULES.find((s) => s.pattern === p)?.description || p
  return `${p.padEnd(18)} ${desc}`
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const triggerNow = args.includes("--trigger-now")

  console.log()
  console.log("╔══════════════════════════════════════════════════╗")
  console.log("║        Hermes Cron Schedule Registration        ║")
  console.log("╚══════════════════════════════════════════════════╝")

  if (dryRun) {
    log("🧪 DRY RUN — no changes will be made\n")
  }

  // ── Display environment ──────────────────────────────────
  divider("Environment")
  log(`Redis:   ${REDIS_URL}`)
  log(`Mode:    ${dryRun ? "dry-run" : triggerNow ? "register + trigger" : "register only"}`)
  log(`Node:    ${process.version}`)

  // ── Display planned schedules ────────────────────────────
  divider("Schedules to Register")
  for (const s of SCHEDULES) {
    log(`${s.jobName.padEnd(22)} ${formatCron(s.pattern)}`)
  }

  if (dryRun) {
    divider("Result")
    log("✅ Dry-run complete — no schedules registered.")
    console.log()
    process.exit(0)
  }

  // ── Connect to Redis ─────────────────────────────────────
  divider("Connecting to Redis")
  const redis = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 1000, 10_000),
  })

  redis.on("connect", () => log("✅ Connected to Redis"))
  redis.on("error", (err) => {
    console.error(`  ❌ Redis connection error: ${err.message}`)
  })

  // Wait for connection
  try {
    await redis.ping()
    log("  Redis ping OK")
  } catch (err: any) {
    console.error(`  ❌ Redis unreachable: ${err.message}`)
    console.error("  Run `docker-compose up -d redis` or set REDIS_URL.")
    process.exit(1)
  }

  // ── Create queue and register repeatable jobs ────────────
  divider("Registering Repeatable Jobs")
  const queue = new Queue("hermes-tasks", { connection: redis as any })

  let registered = 0
  let skipped = 0
  const errors: string[] = []

  for (const s of SCHEDULES) {
    try {
      // Check if this repeatable job already exists
      const repeatableJobs = await queue.getRepeatableJobs()
      const alreadyExists = repeatableJobs.some(
        (rj) =>
          rj.name === s.jobName &&
          rj.pattern === s.pattern &&
          rj.endDate === undefined
      )

      if (alreadyExists) {
        log(`⏭️  Already registered: ${s.jobName} @ ${s.pattern}`)
        skipped++
        continue
      }

      await queue.add(s.jobName, s.data, {
        repeat: { pattern: s.pattern },
        // Give more retries for cron-triggered jobs
        attempts: 5,
        backoff: { type: "exponential", delay: 10_000 },
        // Keep cron job results longer for monitoring
        removeOnComplete: { age: 86_400 * 14 }, // 14 days
        removeOnFail: { age: 86_400 * 60 },     // 60 days
      })

      log(`✅ Registered: ${s.jobName} @ ${s.pattern} — ${s.description}`)
      registered++
    } catch (err: any) {
      const msg = `❌ Failed to register ${s.jobName} @ ${s.pattern}: ${err.message}`
      log(msg)
      errors.push(msg)
    }
  }

  // ── Optionally trigger an immediate sweep ───────────────
  if (triggerNow) {
    divider("Triggering Immediate Sweep")
    try {
      await queue.add(
        "sweep-leads",
        { allLeads: true, triggeredBy: "schedule-hermes-cron" },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5_000 },
        }
      )
      log("✅ Immediate sweep-leads job enqueued")
    } catch (err: any) {
      log(`❌ Failed to enqueue immediate sweep: ${err.message}`)
      errors.push(err.message)
    }
  }

  // ── Summary ──────────────────────────────────────────────
  divider("Summary")
  log(`Registered: ${registered}`)
  log(`Skipped:    ${skipped}`)
  log(`Errors:     ${errors.length}`)

  if (registered > 0) {
    const repeatableJobs = await queue.getRepeatableJobs()
    log(`\n  Active repeatable jobs on queue:`)
    for (const rj of repeatableJobs) {
      log(`  • ${rj.name.padEnd(20)} @ ${rj.pattern}  (next: ${rj.next ? new Date(rj.next).toISOString() : "unknown"})`)
    }
  }

  if (errors.length > 0) {
    divider("Errors")
    for (const e of errors) {
      log(e)
    }
    console.log()
    await redis.quit()
    process.exit(1)
  }

  // ── Cleanup ──────────────────────────────────────────────
  await redis.quit()
  log("\n✅ Cron schedule registration complete.")

  if (triggerNow) {
    log("💡 The Hermes worker will pick up the immediate sweep on next poll.")
  }

  log("\n💡 To verify schedules, check the Hermes Queue Manager at /admin/hermes")
  log("💡 Or run: npx tsx scripts/schedule-hermes-cron.ts --dry-run")
  console.log()
}

main().catch((err) => {
  console.error(`\n  ❌ Fatal error: ${err.message}`)
  process.exit(1)
})
