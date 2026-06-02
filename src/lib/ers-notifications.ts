/**
 * ERS Change Notification System
 *
 * Detects significant changes in ERS scores and generates notifications.
 * Currently logs to console (MVP); can be extended to send emails, Slack, or
 * in-app notifications.
 */

import { type ErsResult, type ErsBreakdown, parseBreakdown } from "./ers-scoring"

// ---- Types -----------------------------------------------------------

export interface ErsChangeEvent {
  clientId: string
  clientName: string
  previousScore: number
  newScore: number
  previousLevel: string
  newLevel: string
  delta: number
  significantChange: boolean
  changedDimensions: Array<{
    dimension: string
    previous: number
    current: number
    delta: number
  }>
  message: string
  timestamp: Date
}

// ---- Thresholds -------------------------------------------------------

const SIGNIFICANT_DELTA = 10      // Score change >= 10 points is significant
const LEVEL_THRESHOLDS = {
  "export-ready": 80,
  developing: 50,
  "needs-work": 0,
}

// ---- Detection --------------------------------------------------------

/**
 * Compare a new ERS result with a previous breakdown (from snapshot) and
 * generate a change event if the difference is significant.
 */
export function detectErsChange(
  clientId: string,
  clientName: string,
  newResult: ErsResult,
  previousBreakdownJson: string | null | undefined,
): ErsChangeEvent | null {
  const previousBreakdown = parseBreakdown(previousBreakdownJson)
  if (!previousBreakdown) return null

  const previousTotal = Object.values(previousBreakdown).reduce((sum, d) => sum + d.score, Math.round(0))

  const delta = newResult.total - previousTotal
  const previousLevel = previousTotal >= 80 ? "export-ready" : previousTotal >= 50 ? "developing" : "needs-work"

  // Detect which dimensions changed
  const changedDimensions: ErsChangeEvent["changedDimensions"] = []
  for (const [dim, data] of Object.entries(newResult.breakdown)) {
    const prev = previousBreakdown[dim as keyof ErsBreakdown]?.score ?? 0
    const dimDelta = data.score - prev
    if (dimDelta !== 0) {
      changedDimensions.push({
        dimension: dim,
        previous: prev,
        current: data.score,
        delta: dimDelta,
      })
    }
  }

  const levelChanged = previousLevel !== newResult.readinessLevel
  const significantChange = Math.abs(delta) >= SIGNIFICANT_DELTA || levelChanged

  if (!significantChange) return null

  // Build a human-readable message
  const direction = delta > 0 ? "improved" : "declined"
  const levelNote = levelChanged ? ` — readiness level changed from "${previousLevel}" to "${newResult.readinessLevel}"` : ""

  const changedSummary = changedDimensions
    .filter((d) => Math.abs(d.delta) >= 3)
    .map((d) => `${d.dimension}: ${d.previous}→${d.current}`)
    .join(", ")

  const message = `ERS score for ${clientName} ${direction} by ${Math.abs(delta)} points (${previousTotal}→${newResult.total})${levelNote}. ${changedSummary ? `Key changes: ${changedSummary}` : ""}`

  return {
    clientId,
    clientName,
    previousScore: previousTotal,
    newScore: newResult.total,
    previousLevel,
    newLevel: newResult.readinessLevel,
    delta,
    significantChange: true,
    changedDimensions,
    message,
    timestamp: new Date(),
  }
}

/**
 * Get the previous ERS snapshot for a client to compare against.
 */
export async function getPreviousErsSnapshot(clientId: string): Promise<{ totalScore: number; breakdown: string } | null> {
  try {
    const { prisma } = await import("@/lib/db")
    const snapshot = await prisma.ersSnapshot.findFirst({
      where: { clientId },
      orderBy: { snapshotDate: "desc" },
      skip: 1, // Skip the most recent (which was just created)
    })
    if (!snapshot) return null
    return { totalScore: snapshot.totalScore, breakdown: snapshot.breakdown }
  } catch {
    return null
  }
}

/**
 * Log a change event — in MVP this logs to console, can be extended to DB/email/Slack.
 */
export async function logErsChangeEvent(event: ErsChangeEvent): Promise<void> {
  console.log(`[ERS Change] ${event.message}`)

  // In future: persist to DB, send email notification, post to Slack, etc.
  if (Math.abs(event.delta) >= 15) {
    console.warn(`[ERS Alert] Large score change (${event.delta} pts) for ${event.clientName}`)
  }
  if (event.newLevel === "needs-work" && event.previousLevel !== "needs-work") {
    console.warn(`[ERS Alert] ${event.clientName} dropped to "needs-work" level`)
  }
}
