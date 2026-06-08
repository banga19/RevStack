/**
 * Hermes Analytics API
 *
 * Returns aggregated agent analytics for the Hermes AI analytics dashboard:
 *   - Summary stats (total runs, success rate, avg time, total processed)
 *   - Daily trend data for charts
 *   - Task type breakdown
 *   - Recent runs with details
 *   - Agent insights from the Hermes agent memory
 *
 * Protected by withAuth — any authenticated user can view.
 *
 * Usage:
 *   GET /api/hermes/analytics
 *   GET /api/hermes/analytics?days=30
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/abac-middleware"
import { prisma } from "@/lib/db"
import { hermesAgent } from "@/lib/hermes-agent"

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "14", 10), 1), 90)

  try {
    const since = new Date(Date.now() - days * 86_400_000)
    // For weekly comparison, fetch at least 8 weeks of data
    const weeksToFetch = Math.max(days + 56, 56) // at least 8 weeks
    const comparisonSince = new Date(Date.now() - weeksToFetch * 86_400_000)
    // For monthly comparison, fetch at least 7 months
    const monthsSince = new Date(Date.now() - 210 * 86_400_000) // ~7 months

    // ── Parallel queries ────────────────────────────────────
    const [
      allRuns,
      recentRuns,
      totalRunCount,
      completedWithinPeriod,
      typeAgg,
      statusAgg,
      dailyAgg,
      comparisonAgg,
    ] = await Promise.all([
      // All runs for aggregate stats
      prisma.hermesRun.findMany({
        select: { id: true, status: true, leadsProcessed: true, createdAt: true, completedAt: true },
      }),
      // Recent runs for the list view
      prisma.hermesRun.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      // Total count
      prisma.hermesRun.count(),
      // Completed in time range
      prisma.hermesRun.count({ where: { createdAt: { gte: since }, status: "completed" } }),
      // Group by taskType
      prisma.hermesRun.groupBy({
        by: ["taskType"],
        _count: { id: true },
        _max: { createdAt: true },
      }),
      // Group by status
      prisma.hermesRun.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      // Daily aggregation for trend chart
      prisma.hermesRun.findMany({
        where: { createdAt: { gte: since } },
        select: { status: true, createdAt: true, leadsProcessed: true },
        orderBy: { createdAt: "asc" },
      }),
      // Wider date range for week-over-week & month-over-month comparison + task type trends
      prisma.hermesRun.findMany({
        where: { createdAt: { gte: comparisonSince } },
        select: { status: true, createdAt: true, completedAt: true, id: true, taskType: true },
        orderBy: { createdAt: "asc" },
      }),
    ])

    // ── Compute summary stats ───────────────────────────────
    const completedCount = allRuns.filter((r) => r.status === "completed").length
    const failedCount = allRuns.filter((r) => r.status === "failed").length
    const totalLeadsProcessed = allRuns.reduce((sum, r) => sum + (r.leadsProcessed || 0), 0)
    const successRate = allRuns.length > 0 ? Math.round((completedCount / allRuns.length) * 100) : 0

    // Calculate average processing time for completed runs
    const completedWithDuration = allRuns.filter(
      (r) => r.status === "completed" && r.completedAt && r.createdAt
    ) as Array<{ createdAt: Date; completedAt: Date }>
    const avgDurationMs =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, r) => sum + (r.completedAt.getTime() - r.createdAt.getTime()), 0) /
          completedWithDuration.length
        : 0

    // ── Daily trend ─────────────────────────────────────────
    const dailyMap = new Map<string, { runs: number; completed: number; failed: number; leads: number }>()

    // Initialize all days in range
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 86_400_000)
      const key = d.toISOString().slice(0, 10)
      dailyMap.set(key, { runs: 0, completed: 0, failed: 0, leads: 0 })
    }

    for (const run of dailyAgg) {
      const key = run.createdAt.toISOString().slice(0, 10)
      const entry = dailyMap.get(key)
      if (entry) {
        entry.runs++
        if (run.status === "completed") entry.completed++
        if (run.status === "failed") entry.failed++
        entry.leads += run.leadsProcessed || 0
      }
    }

    const dailyTrend = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }))

    // ── Task type breakdown ─────────────────────────────────
    const typeBreakdown = typeAgg.map((t) => ({
      taskType: t.taskType,
      count: t._count.id,
      lastRun: t._max.createdAt?.toISOString() || null,
      percentage: totalRunCount > 0 ? Math.round((t._count.id / totalRunCount) * 100) : 0,
    }))

    // ── Status distribution ─────────────────────────────────
    const statusDistribution = statusAgg.map((s) => ({
      status: s.status,
      count: s._count.id,
    }))

    // ── Agent memory insights ───────────────────────────────
    let systemInsights: Array<{ agentType: string; title: string; description: string; timestamp: number }> = []
    try {
      // Get agent memory directly from the Hermes agent
      const systemStatus = hermesAgent.getSystemStatus()
      const operations = hermesAgent.getAllOperations().slice(0, 10)

      // Collect insights from operations
      systemInsights = operations.flatMap((op) =>
        op.insights.map((insight) => ({
          agentType: insight.agentType,
          title: insight.title,
          description: insight.description,
          timestamp: op.startedAt,
        }))
      )
    } catch {
      // Agent memory might not be initialized yet
    }

    // ── Week-over-week and month-over-month comparison ──────
    const weekOverWeek = computeWeeklyComparison(comparisonAgg)
    const monthOverMonth = computeMonthlyComparison(comparisonAgg, monthsSince)
    const taskTypeTrends = computeTaskTypeTrends(comparisonAgg)
    const durationTrends = computeDurationTrends(comparisonAgg)

    // ── Recent runs formatted ───────────────────────────────
    const recentRunsFormatted = recentRuns.map((r) => ({
      id: r.id,
      taskType: r.taskType,
      status: r.status,
      leadsProcessed: r.leadsProcessed,
      messagesQueued: r.messagesQueued,
      errorMessage: r.errorMessage,
      userId: r.userId,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() || null,
      input: r.input ? truncate(r.input, 200) : null,
      output: r.output ? truncate(r.output, 300) : null,
    }))

    return NextResponse.json({
      summary: {
        totalRuns: totalRunCount,
        completedCount,
        failedCount,
        successRate,
        totalLeadsProcessed,
        avgDurationMs: Math.round(avgDurationMs),
        avgDurationSeconds: Math.round(avgDurationMs / 1000),
        runsInPeriod: recentRuns.length,
        completedInPeriod: completedWithinPeriod,
      },
      dailyTrend,
      typeBreakdown,
      statusDistribution,
      insights: systemInsights.slice(0, 20),
      recentRuns: recentRunsFormatted,
      weekOverWeek,
      monthOverMonth,
      taskTypeTrends,
      durationTrends,
    })
  } catch (error: any) {
    console.error("[Hermes Analytics] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to load Hermes analytics",
        summary: {
          totalRuns: 0,
          completedCount: 0,
          failedCount: 0,
          successRate: 0,
          totalLeadsProcessed: 0,
          avgDurationMs: 0,
          avgDurationSeconds: 0,
          runsInPeriod: 0,
          completedInPeriod: 0,
        },
        dailyTrend: [],
        typeBreakdown: [],
        statusDistribution: [],
        insights: [],
        recentRuns: [],
        weekOverWeek: { weeks: [], current: null, previous: null, change: 0, trend: "flat" },
        monthOverMonth: { weeks: [], current: null, previous: null, change: 0, trend: "flat" },
        taskTypeTrends: [],
        durationTrends: { weeks: [], weekComparison: null, months: [], monthComparison: null },
      },
      { status: 200 }
    )
  }
})

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + "..."
}

// ── Week-over-week comparison ──────────────────────────────────────────────

/**
 * Compute per-week success rates for the last 8 complete weeks + current partial week.
 * Returns an array of weekly data points suitable for a bar chart,
 * plus a quick comparison between the most recent complete week and the week before.
 */
// ── Task type success rate trends ─────────────────────────────────────────

/**
 * Compute per-task-type weekly success rates for WoW trend comparison.
 * Returns the last 2 weeks for each task type with change and trend direction.
 */
function computeTaskTypeTrends(
  runs: Array<{ status: string; taskType: string; createdAt: Date }>
): Array<{
  taskType: string
  current: { label: string; successRate: number; total: number }
  previous: { label: string; successRate: number; total: number }
  change: number
  trend: "up" | "down" | "flat"
  weeklyHistory: Array<{ label: string; successRate: number; total: number }>
}> {
  // 1. Group runs by taskType, then by ISO week
  const typeWeekMap = new Map<string, Map<string, { completed: number; failed: number; total: number }>>()

  for (const run of runs) {
    const taskType = run.taskType || "unknown"
    const d = new Date(run.createdAt)
    const year = d.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const diff = d.getTime() - startOfYear.getTime()
    const dayOfYear = Math.floor(diff / 86_400_000)
    const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
    const weekKey = `${year}-W${String(weekNumber).padStart(2, "0")}`

    let weekMap = typeWeekMap.get(taskType)
    if (!weekMap) {
      weekMap = new Map()
      typeWeekMap.set(taskType, weekMap)
    }

    let entry = weekMap.get(weekKey)
    if (!entry) {
      entry = { completed: 0, failed: 0, total: 0 }
      weekMap.set(weekKey, entry)
    }
    entry.total++
    if (run.status === "completed") entry.completed++
    if (run.status === "failed") entry.failed++
  }

  // 2. Build result for each task type
  const results: Array<{
    taskType: string
    current: { label: string; successRate: number; total: number }
    previous: { label: string; successRate: number; total: number }
    change: number
    trend: "up" | "down" | "flat"
    weeklyHistory: Array<{ label: string; successRate: number; total: number }>
  }> = []

  for (const [taskType, weekMap] of typeWeekMap.entries()) {
    const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b))

    const weeklyHistory = sortedWeeks.map(([label, data]) => ({
      label,
      successRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      total: data.total,
    }))

    // Only include task types with at least 2 weeks of data for comparison
    if (weeklyHistory.length < 2) continue

    const prev = weeklyHistory[weeklyHistory.length - 2]
    const curr = weeklyHistory[weeklyHistory.length - 1]
    const change = curr.successRate - prev.successRate
    const trend: "up" | "down" | "flat" = change > 5 ? "up" : change < -5 ? "down" : "flat"

    results.push({
      taskType,
      current: { label: curr.label, successRate: curr.successRate, total: curr.total },
      previous: { label: prev.label, successRate: prev.successRate, total: prev.total },
      change,
      trend,
      weeklyHistory,
    })
  }

  // Sort by volume (total runs of current week) descending
  return results.sort((a, b) => b.current.total - a.current.total)
}

// ── Duration Trends (WoW / MoM) ───────────────────────────────────────────

/**
 * Compute per-week and per-month average duration trends for completed runs.
 * Returns weekly + monthly data points with current vs previous comparison.
 */
function computeDurationTrends(
  runs: Array<{ status: string; createdAt: Date; completedAt: Date | null }>
): {
  weeks: Array<{ label: string; avgDurationMs: number; avgDurationSeconds: number; total: number }>
  weekComparison: {
    current: { label: string; avgDurationSeconds: number; total: number } | null
    previous: { label: string; avgDurationSeconds: number; total: number } | null
    change: number
    trend: "faster" | "slower" | "stable"
  }
  months: Array<{ label: string; avgDurationMs: number; avgDurationSeconds: number; total: number }>
  monthComparison: {
    current: { label: string; avgDurationSeconds: number; total: number } | null
    previous: { label: string; avgDurationSeconds: number; total: number } | null
    change: number
    trend: "faster" | "slower" | "stable"
  }
} {
  const completedRuns = runs.filter(
    (r): r is { status: string; createdAt: Date; completedAt: Date } & typeof r =>
      r.status === "completed" && r.completedAt !== null
  )

  // Helper: compute avg duration from completed runs, grouped by key
  function computeDurationMap(
    runs: Array<{ createdAt: Date; completedAt: Date }>,
    getKey: (d: Date) => string
  ): Map<string, { totalDuration: number; count: number }> {
    const map = new Map<string, { totalDuration: number; count: number }>()
    for (const run of runs) {
      const key = getKey(run.createdAt)
      const duration = run.completedAt.getTime() - run.createdAt.getTime()
      const entry = map.get(key) || { totalDuration: 0, count: 0 }
      entry.totalDuration += duration
      entry.count++
      map.set(key, entry)
    }
    return map
  }

  // ── Weekly ───────────────────────────────────────────────
  function getWeekKey(d: Date): string {
    const year = d.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const diff = d.getTime() - startOfYear.getTime()
    const dayOfYear = Math.floor(diff / 86_400_000)
    const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
    return `${year}-W${String(weekNumber).padStart(2, "0")}`
  }

  const weeklyMap = computeDurationMap(completedRuns, getWeekKey)
  const sortedWeeks = Array.from(weeklyMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  const weeks = sortedWeeks.map(([label, data]) => ({
    label,
    avgDurationMs: Math.round(data.totalDuration / data.count),
    avgDurationSeconds: Math.round(data.totalDuration / data.count / 1000),
    total: data.count,
  }))

  // Weekly comparison
  let weekComparison = {
    current: null as { label: string; avgDurationSeconds: number; total: number } | null,
    previous: null as { label: string; avgDurationSeconds: number; total: number } | null,
    change: 0,
    trend: "stable" as "faster" | "slower" | "stable",
  }
  if (weeks.length >= 2) {
    const prev = weeks[weeks.length - 2]
    const curr = weeks[weeks.length - 1]
    const change = curr.avgDurationSeconds - prev.avgDurationSeconds
    weekComparison = {
      current: { label: curr.label, avgDurationSeconds: curr.avgDurationSeconds, total: curr.total },
      previous: { label: prev.label, avgDurationSeconds: prev.avgDurationSeconds, total: prev.total },
      change,
      trend: change < -5 ? "faster" : change > 5 ? "slower" : "stable",
    }
  }

  // ── Monthly ──────────────────────────────────────────────
  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  function getMonthKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}`
  }

  const monthlyMap = computeDurationMap(completedRuns, getMonthKey)
  const sortedMonths = Array.from(monthlyMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  const months = sortedMonths.map(([key, data]) => {
    const [year, monthIndex] = key.split("-")
    const label = `${MONTH_LABELS[parseInt(monthIndex)]} ${year}`
    return {
      label,
      avgDurationMs: Math.round(data.totalDuration / data.count),
      avgDurationSeconds: Math.round(data.totalDuration / data.count / 1000),
      total: data.count,
    }
  })

  // Monthly comparison
  let monthComparison = {
    current: null as { label: string; avgDurationSeconds: number; total: number } | null,
    previous: null as { label: string; avgDurationSeconds: number; total: number } | null,
    change: 0,
    trend: "stable" as "faster" | "slower" | "stable",
  }
  if (months.length >= 2) {
    const prev = months[months.length - 2]
    const curr = months[months.length - 1]
    const change = curr.avgDurationSeconds - prev.avgDurationSeconds
    monthComparison = {
      current: { label: curr.label, avgDurationSeconds: curr.avgDurationSeconds, total: curr.total },
      previous: { label: prev.label, avgDurationSeconds: prev.avgDurationSeconds, total: prev.total },
      change,
      trend: change < -5 ? "faster" : change > 5 ? "slower" : "stable",
    }
  }

  return { weeks, weekComparison, months, monthComparison }
}

function computeWeeklyComparison(
  runs: Array<{ status: string; createdAt: Date }>
): {
  weeks: Array<{ label: string; completed: number; failed: number; total: number; successRate: number }>
  current: { label: string; successRate: number; total: number } | null
  previous: { label: string; successRate: number; total: number } | null
  change: number
  trend: "up" | "down" | "flat"
} {
  // Group runs by ISO week
  const weekMap = new Map<string, { completed: number; failed: number; total: number }>()

  for (const run of runs) {
    const d = new Date(run.createdAt)
    const year = d.getFullYear()
    // Get ISO week number
    const startOfYear = new Date(year, 0, 1)
    const diff = d.getTime() - startOfYear.getTime()
    const dayOfYear = Math.floor(diff / 86_400_000)
    const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
    const key = `${year}-W${String(weekNumber).padStart(2, "0")}`

    let entry = weekMap.get(key)
    if (!entry) {
      entry = { completed: 0, failed: 0, total: 0 }
      weekMap.set(key, entry)
    }
    entry.total++
    if (run.status === "completed") entry.completed++
    if (run.status === "failed") entry.failed++
  }

  // Sort weeks chronologically and build result
  const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  const weeks = sortedWeeks.map(([label, data]) => ({
    label,
    completed: data.completed,
    failed: data.failed,
    total: data.total,
    successRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
  }))

  // Get the last two complete weeks for comparison
  const completeWeeks = weeks.filter((w) => w.total > 0)
  const prevIndex = completeWeeks.length - 2
  const currIndex = completeWeeks.length - 1

  const previous = prevIndex >= 0
    ? { label: completeWeeks[prevIndex].label, successRate: completeWeeks[prevIndex].successRate, total: completeWeeks[prevIndex].total }
    : null
  const current = currIndex >= 0
    ? { label: completeWeeks[currIndex].label, successRate: completeWeeks[currIndex].successRate, total: completeWeeks[currIndex].total }
    : null

  const change = current && previous ? current.successRate - previous.successRate : 0
  const trend: "up" | "down" | "flat" = change > 5 ? "up" : change < -5 ? "down" : "flat"

  return { weeks, current, previous, change, trend }
}

// ── Month-over-month comparison ────────────────────────────────────────────

/**
 * Compute per-month success rates for the last 6 complete months + current partial month.
 * Returns monthly data points for the chart and current vs previous comparison.
 */
function computeMonthlyComparison(
  runs: Array<{ status: string; createdAt: Date }>,
  _since: Date // kept for API consistency
): {
  months: Array<{ label: string; completed: number; failed: number; total: number; successRate: number }>
  current: { label: string; successRate: number; total: number } | null
  previous: { label: string; successRate: number; total: number } | null
  change: number
  trend: "up" | "down" | "flat"
} {
  // Group runs by month
  const monthMap = new Map<string, { completed: number; failed: number; total: number }>()

  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  for (const run of runs) {
    const d = new Date(run.createdAt)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`

    let entry = monthMap.get(key)
    if (!entry) {
      entry = { completed: 0, failed: 0, total: 0 }
      monthMap.set(key, entry)
    }
    entry.total++
    if (run.status === "completed") entry.completed++
    if (run.status === "failed") entry.failed++
  }

  // Sort months chronologically
  const sortedMonths = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  // Use "weeks" as the key name for consistency with the ComparisonData type,
  // even though the data represents months — the shape is identical.
  const months = sortedMonths.map(([key, data]) => {
    const [year, monthIndex] = key.split("-")
    const label = `${MONTH_LABELS[parseInt(monthIndex)]} ${year}`
    return {
      label,
      completed: data.completed,
      failed: data.failed,
      total: data.total,
      successRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }
  })

  // Get the last two complete months for comparison
  const completeMonths = months.filter((m) => m.total > 0)
  const prevIdx = completeMonths.length - 2
  const currIdx = completeMonths.length - 1

  const previous = prevIdx >= 0
    ? { label: completeMonths[prevIdx].label, successRate: completeMonths[prevIdx].successRate, total: completeMonths[prevIdx].total }
    : null
  const current = currIdx >= 0
    ? { label: completeMonths[currIdx].label, successRate: completeMonths[currIdx].successRate, total: completeMonths[currIdx].total }
    : null

  const change = current && previous ? current.successRate - previous.successRate : 0
  const trend: "up" | "down" | "flat" = change > 5 ? "up" : change < -5 ? "down" : "flat"

  return { weeks: months, current, previous, change, trend }
}
