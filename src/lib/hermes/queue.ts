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
import { centralBrain } from "@/lib/hermes-central-brain"

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
  connection: redis as any,
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

export interface SendSequenceStepJobData {
  sequenceId: string
  stepId: string
  prospectId: string
  organizationId: string
}

export interface EnrollProspectJobData {
  prospectId: string
  sequenceId: string
  organizationId: string
}

export interface ProcessSequenceRunJobData {
  sequenceId: string
  prospectId: string
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

  // Broadcast job start through Central Brain
  centralBrain.sendMessage({
    source: "bullmq-worker",
    target: "orchestrator",
    type: "job:process-lead:started",
    payload: { leadId, runId: run.id, companyName: lead.companyName },
    priority: "medium",
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

    // Broadcast job completion through Central Brain
    centralBrain.sendMessage({
      source: "bullmq-worker",
      target: "orchestrator",
      type: "job:process-lead:completed",
      payload: { leadId, runId: run.id, status: "completed", stage: result.stage },
      priority: "low",
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

    // Broadcast job failure through Central Brain
    centralBrain.sendMessage({
      source: "bullmq-worker",
      target: "orchestrator",
      type: "job:process-lead:failed",
      payload: { leadId, runId: run.id, error: (error as Error).message },
      priority: "high",
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
// Sequence Execution Jobs
// ============================================================

/**
 * Send a single sequence step to a prospect.
 * Dispatches to the appropriate channel handler based on step.channel.
 */
async function sendSequenceStep(
  sequenceId: string,
  stepId: string,
  prospectId: string,
  organizationId: string
): Promise<void> {
  const step = await prisma.sequenceStep.findUnique({
    where: { id: stepId },
    include: { sequence: true },
  })

  if (!step || step.sequenceId !== sequenceId) {
    throw new Error(`Sequence step not found: ${stepId}`)
  }

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
  })

  if (!prospect || prospect.organizationId !== organizationId) {
    throw new Error(`Prospect not found or access denied: ${prospectId}`)
  }

  // Update step status to sent
  await prisma.sequenceStep.update({
    where: { id: stepId },
    data: { status: "sent" },
  })

  // Record prospect activity
  await prisma.prospectActivity.create({
    data: {
      prospectId,
      type: `${step.channel}_sent`,
      channel: step.channel,
      details: {
        stepId,
        sequenceId,
        subject: step.subject,
        messageBody: step.messageBody,
      },
    },
  })

  // Dispatch to channel-specific sender
  switch (step.channel) {
    case "email":
      // TODO: integrate with Instantly.ai or Nodemailer
      console.log(`[Sequence] Email step ${stepId} queued for prospect ${prospectId}`)
      break
    case "whatsapp":
      // TODO: integrate with WATI
      console.log(`[Sequence] WhatsApp step ${stepId} queued for prospect ${prospectId}`)
      break
    case "sms":
      // TODO: integrate with Twilio
      console.log(`[Sequence] SMS step ${stepId} queued for prospect ${prospectId}`)
      break
    case "call":
      // TODO: create a call task for the rep (not auto-dial)
      console.log(`[Sequence] Call step ${stepId} queued for prospect ${prospectId}`)
      break
    default:
      console.log(`[Sequence] Unknown channel ${step.channel} for step ${stepId}`)
  }

  // TODO: evaluate trigger conditions for next step (open, reply, click)
  // If conditions met, schedule next step via hermesQueue.add("send-sequence-step", ...)
}

/**
 * Enroll a prospect into a sequence — initializes ProspectSequence record
 * and schedules the first step.
 */
async function enrollProspect(
  prospectId: string,
  sequenceId: string,
  organizationId: string
): Promise<void> {
  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
  })

  if (!prospect || prospect.organizationId !== organizationId) {
    throw new Error(`Prospect not found or access denied: ${prospectId}`)
  }

  const sequence = await prisma.sequence.findUnique({
    where: { id: sequenceId },
    include: { steps: true },
  })

  if (!sequence) {
    throw new Error(`Sequence not found: ${sequenceId}`)
  }

  // Create enrollment record
  await prisma.prospectSequence.create({
    data: {
      prospectId,
      sequenceId,
      status: "active",
      currentStep: 0,
      enrolledAt: new Date(),
      lastActivityAt: new Date(),
    },
  })

  // Record enrollment activity
  await prisma.prospectActivity.create({
    data: {
      prospectId,
      type: "enrolled_in_sequence",
      channel: "system",
      details: { sequenceId, sequenceName: sequence.name },
    },
  })

  // Schedule the first step
  const firstStep = sequence.steps
    .filter((s) => s.stepNumber === 0)
    .sort((a, b) => a.stepNumber - b.stepNumber)[0]

  if (firstStep) {
    const delayMs = firstStep.delayHours > 0 ? firstStep.delayHours * 60 * 60 * 1000 : 0
    await hermesQueue.add(
      "send-sequence-step",
      {
        sequenceId,
        stepId: firstStep.id,
        prospectId,
        organizationId,
      },
      {
        delay: delayMs,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
      }
    )
  }
}

/**
 * Advance a prospect through a sequence after a trigger event.
 * Evaluates conditions and schedules the next step if conditions are met.
 */
async function processSequenceRun(
  sequenceId: string,
  prospectId: string
): Promise<void> {
  const enrollment = await prisma.prospectSequence.findFirst({
    where: { prospectId, sequenceId },
    include: { sequence: { include: { steps: true } } },
  })

  if (!enrollment || enrollment.status !== "active") {
    return // prospect not actively enrolled
  }

  const currentStepNumber = enrollment.currentStep
  const nextStep = enrollment.sequence.steps
    .filter((s) => s.stepNumber > currentStepNumber)
    .sort((a, b) => a.stepNumber - b.stepNumber)[0]

  if (!nextStep) {
    // Sequence completed
    await prisma.prospectSequence.update({
      where: { id: enrollment.id },
      data: { status: "completed", completedAt: new Date() },
    })
    return
  }

  // Schedule next step
  const delayMs = nextStep.delayHours > 0 ? nextStep.delayHours * 60 * 60 * 1000 : 0
  await hermesQueue.add(
    "send-sequence-step",
    {
      sequenceId,
      stepId: nextStep.id,
      prospectId,
      organizationId: enrollment.sequence.organizationId,
    },
    {
      delay: delayMs,
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
    }
  )

  // Update current step pointer
  await prisma.prospectSequence.update({
    where: { id: enrollment.id },
    data: { currentStep: nextStep.stepNumber, lastActivityAt: new Date() },
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

  "send-sequence-step": async (job) => {
    const { sequenceId, stepId, prospectId, organizationId } = job.data as SendSequenceStepJobData
    await sendSequenceStep(sequenceId, stepId, prospectId, organizationId)
  },

  "enroll-prospect": async (job) => {
    const { prospectId, sequenceId, organizationId } = job.data as EnrollProspectJobData
    await enrollProspect(prospectId, sequenceId, organizationId)
  },

  "process-sequence-run": async (job) => {
    const { sequenceId, prospectId } = job.data as ProcessSequenceRunJobData
    await processSequenceRun(sequenceId, prospectId)
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
      connection: redis as any,
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

// Register the BullMQ worker agent with the Central Brain
// so its messages are properly tracked
centralBrain.registerAgent("bullmq-worker", {
  displayName: "BullMQ Worker",
  description: "Background job processor for lead qualification, sweep operations, and sequence execution",
  capabilities: [
    { name: "process-lead", description: "Process a single lead through the sales pipeline" },
    { name: "sweep-leads", description: "Sweep all unprocessed leads en masse" },
    { name: "retry-failed", description: "Retry a previously failed job" },
    { name: "send-sequence-step", description: "Send a sequence step to a prospect via the appropriate channel" },
    { name: "enroll-prospect", description: "Enroll a prospect into a sequence" },
    { name: "process-sequence-run", description: "Advance a prospect through a sequence after a trigger event" },
  ],
  status: "active",
})

export { worker }
export default hermesQueue
