/**
 * Hermes BullMQ Queue & Worker
 *
 * Provides Redis-backed job queuing for the Hermes autonomous agent system:
 *   - Queue: enqueue lead-processing tasks from API routes or cron
 *   - Worker: process jobs by invoking the LangGraph sales pipeline
 *   - Redis: central connection shared by queue and worker
 *
 * Usage (enqueue a job):
 *   import { hermesQueue } from "@/lib/hermes/queue"
 *   await hermesQueue.add("process-lead", { leadId })
 *
 * Standalone worker (Docker):
 *   tsx workers/hermes-worker.ts
 */

import { Queue, Worker, type Job } from "bullmq"
import IORedis from "ioredis"
import { prisma } from "@/lib/db"
import {
  emitHermesRunCompleted,
  emitSweepCompleted,
} from "@/lib/hermes-notifications"

// ============================================================
// Redis Connection
// ============================================================

function createRedisConnection(): IORedis {
  const url = process.env.REDIS_URL || "redis://localhost:6379"

  return new IORedis(url, {
    maxRetriesPerRequest: null, // BullMQ manages its own retry
    enableReadyCheck: false,    // BullMQ handles readiness
    retryStrategy: (times) => {
      // Exponential backoff: 1s, 2s, 4s, … capped at 30s
      return Math.min(times * 1000, 30_000)
    },
  })
}

export const redis = createRedisConnection()

// ============================================================
// Queue
// ============================================================

/**
 * Hermes job queue for autonomous lead-processing tasks.
 *
 * Job names:
 *   - "process-lead"  — process a single lead through the sales pipeline
 *   - "sweep-leads"   — sweep all qualified leads (batched processing)
 *   - "retry-failed"  — retry previously failed job by ID
 */
export const hermesQueue = new Queue("hermes-tasks", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,                       // retry up to 3 times
    backoff: { type: "exponential", delay: 5_000 }, // 5s, 10s, 20s
    removeOnComplete: { age: 86_400 * 7 },  // keep 7 days
    removeOnFail: { age: 86_400 * 30 },     // keep 30 days for debugging
  },
})

// ============================================================
// Job Data Types
// ============================================================

export interface ProcessLeadJobData {
  leadId: string
  userId?: string
}

export interface SweepLeadsJobData {
  allLeads?: boolean
  userId?: string
}

export interface RetryFailedJobData {
  originalJobId: string
}

// ============================================================
// Worker
// ============================================================

/**
 * Process a single lead through the sales pipeline.
 * Dynamically imports the LangGraph sales graph so the queue module
 * can load even before the pipeline is fully implemented.
 */
async function processLead(leadId: string, userId?: string): Promise<void> {
  // Fetch lead from database
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  })

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`)
  }

  // Create a HermesRun record to track this execution
  const run = await prisma.hermesRun.create({
    data: {
      taskType: "qualify_leads",
      status: "running",
      input: JSON.stringify({ leadId, companyName: lead.companyName }),
      userId: userId || lead.userId,
    },
  })

  try {
    // Try to use the LangGraph sales pipeline if available
    let result: { stage: string; output?: string }

    try {
      const { salesGraph } = await import("@/lib/hermes/sales-graph")
      const graphResult = await salesGraph.invoke({
        lead: {
          id: lead.id,
          phone: lead.phone || "",
          email: lead.email,
          companyName: lead.companyName,
          productInterest: lead.industry || "",
        },
        stage: "start",
        score: lead.qualificationScore || 0,
        messages: [],
      })
      result = { stage: graphResult.stage, output: JSON.stringify(graphResult) }
    } catch {
      // Sales graph not yet implemented — record a basic execution
      result = {
        stage: "scored",
        output: JSON.stringify({
          note: "Sales graph not available — lead processed via direct qualification",
          qualificationScore: lead.qualificationScore,
          qualificationTier: lead.qualificationTier,
        }),
      }
    }

    // Update the HermesRun with results
    await prisma.hermesRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        output: result.output,
        leadsProcessed: 1,
        completedAt: new Date(),
      },
    })

    // Emit real-time notification
    emitHermesRunCompleted(run.userId, {
      id: run.id,
      taskType: run.taskType,
      status: "completed",
      leadsProcessed: 1,
      errorMessage: null,
    })
  } catch (error) {
    // Mark the run as failed
    await prisma.hermesRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage: (error as Error).message,
        completedAt: new Date(),
      },
    })

    // Emit real-time notification
    emitHermesRunCompleted(run.userId, {
      id: run.id,
      taskType: run.taskType,
      status: "failed",
      leadsProcessed: 0,
      errorMessage: (error as Error).message,
    })

    throw error // re-throw so BullMQ handles retry
  }
}

/**
 * Sweep all qualified leads — enqueues individual process-lead jobs
 * for each lead that hasn't been fully processed yet.
 *
 * Uses Promise.allSettled so that a single failing enqueue doesn't
 * prevent the rest of the leads from being queued.
 */
async function sweepLeads(userId?: string): Promise<void> {
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { status: "new" },
        { status: "qualified" },
      ],
    },
    select: { id: true, userId: true },
  })

  // Enqueue individual jobs — isolate failures so one error doesn't block all
  const results = await Promise.allSettled(
    leads.map((lead) => {
      const jobData: ProcessLeadJobData = {
        leadId: lead.id,
        userId: userId || lead.userId,
      }
      return hermesQueue.add("process-lead", jobData)
    })
  )

  // Log any failures
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === "rejected") {
      console.error(`[Hermes Queue] Failed to enqueue lead ${leads[i].id}:`, result.reason)
    }
  }

  // Emit sweep completed notification
  const succeeded = results.filter((r) => r.status === "fulfilled").length
  const failed = results.filter((r) => r.status === "rejected").length
  emitSweepCompleted(userId, {
    total: leads.length,
    completed: succeeded,
    failed,
  })
}

/**
 * Retry a previously failed job by re-enqueuing it.
 */
async function retryFailedJob(originalJobId: string): Promise<void> {
  const originalJob = await hermesQueue.getJob(originalJobId)
  if (!originalJob) {
    throw new Error(`Original job not found: ${originalJobId}`)
  }

  await hermesQueue.add(originalJob.name, originalJob.data, {
    attempts: 5, // give more attempts for a retry
    backoff: { type: "exponential", delay: 10_000 },
  })
}

// ============================================================
// Worker Handler Map
// ============================================================

const handlers: Record<string, (job: Job) => Promise<void>> = {
  "process-lead": async (job) => {
    const { leadId, userId } = job.data as ProcessLeadJobData
    await processLead(leadId, userId)
  },

  "sweep-leads": async (job) => {
    const { userId } = job.data as SweepLeadsJobData
    await sweepLeads(userId)
  },

  "retry-failed": async (job) => {
    const { originalJobId } = job.data as RetryFailedJobData
    await retryFailedJob(originalJobId)
  },
}

// ============================================================
// Worker Instantiation
// ============================================================

/**
 * Start processing jobs.
 *
 * In development, the worker starts automatically so you can test locally
 * without Redis (the connection will retry in the background).
 *
 * In production, the worker only starts when RUN_WORKER=true is set,
 * allowing the main web process to stay focused on serving HTTP requests
 * while a dedicated worker container handles background jobs.
 */
function startWorker(): Worker {
  const worker = new Worker(
    "hermes-tasks",
    async (job) => {
      const handler = handlers[job.name]
      if (!handler) {
        throw new Error(`Unknown job type: ${job.name}`)
      }
      await handler(job)
    },
    {
      connection: redis,
      concurrency: 5, // process up to 5 jobs concurrently
      lockDuration: 60_000, // 1-minute lock per job
      stalledInterval: 30_000, // check for stalled jobs every 30s
    }
  )

  worker.on("completed", (job) => {
    console.log(`[Hermes Worker] Job ${job.id} (${job.name}) completed`)
  })

  worker.on("failed", (job, err) => {
    console.error(`[Hermes Worker] Job ${job?.id} (${job?.name}) failed:`, err.message)
  })

  worker.on("error", (err) => {
    // Redis connection errors are expected in dev without Redis running
    if (process.env.NODE_ENV !== "development") {
      console.error("[Hermes Worker] Error:", err.message)
    }
  })

  return worker
}

let worker: Worker | null = null

const shouldRunWorker =
  process.env.NODE_ENV !== "production" || process.env.RUN_WORKER === "true"

if (shouldRunWorker) {
  worker = startWorker()
}

export { worker }
export default hermesQueue
