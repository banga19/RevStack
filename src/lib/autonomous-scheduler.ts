/**
 * Autonomous Scheduler — Background Agent Runtime
 *
 * Instead of a manual Hermes frontend page, this scheduler runs continuously
 * in the background, monitoring database state and triggering autonomous agent
 * operations when conditions are met.
 *
 * Architecture:
 *   - Two-tier model: GPT-4o-mini for lightweight monitoring/classification,
 *     GPT-4o for complex multi-agent planning and execution.
 *   - Event-driven: triggers on new leads, compliance expiry, stuck onboarding, etc.
 *   - Periodic sweeps: scheduled via cron every 6 hours (in addition to the daily full sweep)
 *
 * The scheduler is NOT a long-running process — it's invoked by cron endpoints
 * and runs its checks synchronously within a single request lifecycle, then
 * returns. For long-running agent operations, it delegates to the Hermes agent
 * which runs them asynchronously via setImmediate.
 */

import { prisma } from "./db"
import { centralBrain } from "./hermes-central-brain"
import { hermesAgent } from "./hermes-agent"
import { qualifyLead } from "./qualify-lead"

// ============================================================
// Types
// ============================================================

export interface SweepResult {
  triggered: boolean
  operationsTriggered: number
  operations: Array<{
    id: string
    trigger: string
    status: string
  }>
  alerts: string[]
  metrics: Record<string, number>
  durationMs: number
}

interface TriggerCondition {
  name: string
  priority: "critical" | "high" | "medium" | "low"
  check: () => Promise<TriggerResult>
}

interface TriggerResult {
  shouldTrigger: boolean
  objective?: string
  alert?: string
  metrics?: Record<string, number>
}

// ============================================================
// Trigger Conditions
// ============================================================

/**
 * Check 1: New unprocessed leads that need qualification
 */
async function checkNewLeads(): Promise<TriggerResult> {
  const newLeads = await prisma.lead.findMany({
    where: { status: "new" },
    select: { id: true, companyName: true, industry: true, country: true, phone: true, whatsapp: true, email: true, createdAt: true },
  })

  if (newLeads.length === 0) {
    return { shouldTrigger: false, metrics: { newLeads: 0 } }
  }

  // Use lightweight pre-qualification (GPT-4o-mini level logic, no LLM call needed)
  const qualifiedCount = newLeads.filter((l) => {
    const { status } = qualifyLead(l)
    return status === "qualified"
  }).length

  return {
    shouldTrigger: newLeads.length >= 3 || qualifiedCount >= 2,
    objective: `Sweep ${newLeads.length} unprocessed leads: ${qualifiedCount} pre-qualified for immediate follow-up. ` +
      `Automatically qualify via scoring algorithm, sync qualified leads to pipeline, ` +
      `and schedule WhatsApp follow-ups for warm prospects.`,
    metrics: { newLeads: newLeads.length, preQualified: qualifiedCount },
  }
}

/**
 * Check 2: Compliance records approaching expiry
 */
async function checkExpiringCompliance(): Promise<TriggerResult> {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const expiringCount = await prisma.clientCompliance.count({
    where: {
      status: "obtained",
      expiresAt: { lte: thirtyDaysFromNow },
    },
  })

  if (expiringCount === 0) {
    return { shouldTrigger: false, metrics: { expiringCertifications: 0 } }
  }

  return {
    shouldTrigger: expiringCount >= 1,
    objective: `${expiringCount} certifications expiring within 30 days. ` +
      `Review each via QMe document processing, send renewal alerts via Make.com, ` +
      `and trigger Voiceflow compliance check dialogs for high-risk items.`,
    alert: `${expiringCount} certification(s) expiring within 30 days — compliance agent dispatched.`,
    metrics: { expiringCertifications: expiringCount },
  }
}

/**
 * Check 3: Clients stuck in onboarding
 */
async function checkStuckOnboarding(): Promise<TriggerResult> {
  const stuckClients = await prisma.client.findMany({
    where: { status: "onboarding" },
    select: { id: true, name: true, email: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
  })

  const stuckThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days without update
  const trulyStuck = stuckClients.filter((c) => new Date(c.updatedAt) < stuckThreshold)

  if (trulyStuck.length === 0) {
    return { shouldTrigger: false, metrics: { stuckOnboarding: 0 } }
  }

  return {
    shouldTrigger: trulyStuck.length >= 1,
    objective: `${trulyStuck.length} clients stuck in onboarding for over 7 days. ` +
      `Send personalized email reminders, trigger Make.com follow-up sequences, ` +
      `and create QMe document collection workflows.`,
    alert: `${trulyStuck.length} client(s) stuck in onboarding — onboarding agent dispatched.`,
    metrics: { stuckOnboarding: trulyStuck.length },
  }
}

/**
 * Check 4: Pending follow-ups that need to be sent
 */
async function checkPendingFollowups(): Promise<TriggerResult> {
  const pendingCount = await prisma.followup.count({
    where: {
      status: "pending",
      scheduledAt: { lte: new Date() },
    },
  })

  if (pendingCount === 0) {
    return { shouldTrigger: false, metrics: { pendingFollowups: 0 } }
  }

  return {
    shouldTrigger: pendingCount >= 5,
    objective: `${pendingCount} follow-ups are due for sending. ` +
      `Process all pending follow-ups, mark as sent, and log to message history.`,
    metrics: { pendingFollowups: pendingCount },
  }
}

/**
 * Check 5: Invoice generation for active retainers due for billing
 */
async function checkInvoiceGeneration(): Promise<TriggerResult> {
  const now = new Date()

  // Count active retainers where billing is due
  const activeRetainers = await prisma.retainer.findMany({
    where: { status: "active" },
    select: { id: true, nextBillingDate: true, startDate: true, billingCycle: true, createdAt: true },
  })

  let dueCount = 0
  for (const retainer of activeRetainers) {
    const nextBilling = retainer.nextBillingDate
      ? new Date(retainer.nextBillingDate)
      : computeTriggerNextBilling(retainer.startDate, retainer.billingCycle, retainer.createdAt)

    if (nextBilling && nextBilling <= now) {
      dueCount++
    }
  }

  if (dueCount === 0) {
    return { shouldTrigger: false, metrics: { retainersDue: 0 } }
  }

  return {
    shouldTrigger: dueCount >= 1,
    objective: `${dueCount} retainers are due for billing. Generate invoices for each active retainer, ` +
      `update next billing dates, and log invoice activity entries.`,
    alert: `${dueCount} retainer invoice(s) due for generation — RevStack Operations agent dispatched.`,
    metrics: { retainersDue: dueCount },
  }
}

/**
 * Helper to compute next billing date from startDate + billingCycle.
 */
function computeTriggerNextBilling(
  startDate: string,
  billingCycle: string,
  createdAt: Date
): Date | null {
  try {
    const start = new Date(startDate)
    if (isNaN(start.getTime())) return new Date(createdAt)

    const now = new Date()
    const next = new Date(start)

    while (next <= now) {
      if (billingCycle === "monthly") next.setMonth(next.getMonth() + 1)
      else if (billingCycle === "quarterly") next.setMonth(next.getMonth() + 3)
      else if (billingCycle === "annual") next.setFullYear(next.getFullYear() + 1)
      else break
    }

    return next
  } catch {
    return new Date(createdAt)
  }
}

/**
 * Check 6: Revenue report generation (triggered once daily)
 */
async function checkRevenueReport(isDailySweep: boolean): Promise<TriggerResult> {
  if (!isDailySweep) {
    return { shouldTrigger: false, metrics: {} }
  }

  return {
    shouldTrigger: true,
    objective: `Generate daily revenue report: calculate MRR from active retainers, ` +
      `compute pipeline value, count new leads and clients, and store summary in RAG knowledge base.`,
    metrics: {},
  }
}

/**
 * Check 7: Users who completed onboarding recently — trigger personalized welcome flow
 */
async function checkFreshOnboarding(): Promise<TriggerResult> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
  const recentlyOnboarded = await prisma.onboardingResponse.findMany({
    where: {
      completed: true,
      createdAt: { gte: thirtyMinutesAgo },
    },
    select: { userId: true, businessName: true, primaryGoal: true, industry: true },
    take: 5,
  })

  if (recentlyOnboarded.length === 0) {
    return { shouldTrigger: false, metrics: { freshOnboarding: 0 } }
  }

  const names = recentlyOnboarded.map((o) => o.businessName).join(", ")
  return {
    shouldTrigger: true,
    objective: `${recentlyOnboarded.length} user(s) completed onboarding in the last 30 minutes (${names}). ` +
      `Run personalized welcome workflows: ` +
      recentlyOnboarded.map((o) => `${o.businessName} goal="${o.primaryGoal || "general"}" in ${o.industry}`).join("; ") +
      `. Route each user to the most relevant agent based on their primary goal.`,
    alert: `${recentlyOnboarded.length} new user(s) onboarded — personalized welcome triggered.`,
    metrics: { freshOnboarding: recentlyOnboarded.length },
  }
}

// ============================================================
// Model Configuration
// ============================================================

/**
 * Model selection strategy:
 *
 * Routine monitoring & classification: No LLM needed — uses simple DB queries
 *   and the existing qualifyLead() scoring algorithm.
 *
 * Trigger decisioning: No LLM needed — rule-based checks.
 *
 * Agent planning & execution: GPT-4o (via hermes-agent.ts) — complex multi-step
 *   reasoning with LangGraph state management and real service integrations.
 *
 * Pattern analysis & insight discovery: GPT-4o (via agent-memory.ts) —
 *   nuanced analysis of operational patterns across agent runs.
 *
 * This two-tier approach keeps costs low (~90% of operations use zero LLM calls)
 * while reserving GPT-4o for the complex multi-agent workflows that need it.
 */

// ============================================================
// Main Sweep Function
// ============================================================

/**
 * Run a full autonomous sweep — checks all trigger conditions and
 * dispatches Hermes agent operations for any that need attention.
 *
 * @param isDailySweep - If true, runs revenue report generation (daily only)
 * @param cronUserId - User ID to attribute cron-triggered operations
 */
export async function runAutonomousSweep(
  isDailySweep: boolean = false,
  cronUserId: string = "cron:autonomous-scheduler"
): Promise<SweepResult> {
  const startTime = Date.now()
  const triggeredOperations: SweepResult["operations"] = []
  const alerts: string[] = []
  const allMetrics: Record<string, number> = {}
  const errors: string[] = []

  // Define all trigger conditions
  const triggers: TriggerCondition[] = [
    { name: "new-leads", priority: "high", check: checkNewLeads },
    { name: "expiring-compliance", priority: "critical", check: checkExpiringCompliance },
    { name: "stuck-onboarding", priority: "high", check: checkStuckOnboarding },
    { name: "pending-followups", priority: "medium", check: checkPendingFollowups },
    { name: "revenue-report", priority: "low", check: () => checkRevenueReport(isDailySweep) },
    { name: "invoice-generation", priority: "medium", check: checkInvoiceGeneration },
  ]

  // Evaluate all triggers
  for (const trigger of triggers) {
    try {
      const result = await trigger.check()

      // Merge metrics
      if (result.metrics) {
        Object.assign(allMetrics, result.metrics)
      }

      // Collect alerts
      if (result.alert) {
        alerts.push(result.alert)
      }

      // Trigger operation if condition met
      if (result.shouldTrigger && result.objective) {
        try {
          const operation = await hermesAgent.runOperation(result.objective, {
            userId: `${cronUserId}:${trigger.name}`,
          })
          triggeredOperations.push({
            id: operation.id,
            trigger: trigger.name,
            status: operation.status,
          })

          // Broadcast dispatch event through Central Brain
          centralBrain.sendMessage({
            source: "autonomous-scheduler",
            target: "*",
            type: "sweep:operation_dispatched",
            payload: {
              trigger: trigger.name,
              operationId: operation.id,
              priority: trigger.priority,
              objective: result.objective.substring(0, 200),
            },
            priority: trigger.priority === "critical" ? "critical" : trigger.priority === "high" ? "high" : "medium",
          })
        } catch (opError) {
          errors.push(`Failed to trigger ${trigger.name}: ${(opError as Error).message}`)
        }
      }
    } catch (checkError) {
      errors.push(`Trigger check failed for ${trigger.name}: ${(checkError as Error).message}`)
    }
  }

  // Log any errors as alerts
  for (const error of errors) {
    alerts.push(`[Error] ${error}`)
  }

  // Store sweep summary in agent memory via Central Brain
  if (triggeredOperations.length > 0) {
    try {
      await centralBrain.addInsight(
        "orchestrator",
        `Autonomous sweep: ${triggeredOperations.length} operations triggered`,
        `Sweep triggered ${triggeredOperations.length} operations: ` +
          triggeredOperations.map((op) => `${op.trigger} (${op.status})`).join(", ") +
          `. Alerts: ${alerts.length}. Duration: ${Date.now() - startTime}ms.`,
        "insight",
        { metrics: allMetrics, operationsCount: triggeredOperations.length, sweepDuration: Date.now() - startTime }
      )
    } catch {
      // Non-critical
    }
  }

  return {
    triggered: triggeredOperations.length > 0,
    operationsTriggered: triggeredOperations.length,
    operations: triggeredOperations,
    alerts,
    metrics: allMetrics,
    durationMs: Date.now() - startTime,
  }
}

/**
 * Quick health check — lighter version of the full sweep that only checks
 * critical and high-priority conditions. Runs more frequently (every 6 hours).
 */
export async function runQuickHealthCheck(
  cronUserId: string = "cron:autonomous-scheduler"
): Promise<SweepResult> {
  const startTime = Date.now()
  const triggeredOperations: SweepResult["operations"] = []
  const alerts: string[] = []
  const allMetrics: Record<string, number> = {}
  const errors: string[] = []

  // Only check critical and high-priority triggers
  const quickTriggers: TriggerCondition[] = [
    { name: "new-leads", priority: "high", check: checkNewLeads },
    { name: "expiring-compliance", priority: "critical", check: checkExpiringCompliance },
    { name: "stuck-onboarding", priority: "high", check: checkStuckOnboarding },
    { name: "fresh-onboarding", priority: "medium", check: checkFreshOnboarding },
  ]

  for (const trigger of quickTriggers) {
    try {
      const result = await trigger.check()
      if (result.metrics) Object.assign(allMetrics, result.metrics)
      if (result.alert) alerts.push(result.alert)

      if (result.shouldTrigger && result.objective) {
        try {
          const operation = await hermesAgent.runOperation(result.objective, {
            userId: `${cronUserId}:quick:${trigger.name}`,
          })
          triggeredOperations.push({ id: operation.id, trigger: trigger.name, status: operation.status })
        } catch (opError) {
          errors.push(`Failed to trigger ${trigger.name}: ${(opError as Error).message}`)
        }
      }
    } catch (checkError) {
      errors.push(`Trigger check failed for ${trigger.name}: ${(checkError as Error).message}`)
    }
  }

  for (const error of errors) alerts.push(`[Error] ${error}`)

  return {
    triggered: triggeredOperations.length > 0,
    operationsTriggered: triggeredOperations.length,
    operations: triggeredOperations,
    alerts,
    metrics: allMetrics,
    durationMs: Date.now() - startTime,
  }
}
