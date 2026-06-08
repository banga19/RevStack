/**
 * Agent Memory API — Query Persisted Insights & Reports
 *
 * Provides historical access to agent memory data that survives restarts.
 *
 * GET /api/agent-memory/insights
 *   ?agentType=lead          — filter by agent type
 *   &category=pattern        — filter by category
 *   &days=30                 — only last N days
 *   &limit=50                — max results (default 50)
 *
 * GET /api/agent-memory/reports
 *   ?agentType=lead          — filter by agent type
 *   &days=90                 — only last N days
 *   &limit=20                — max results (default 20)
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

// ── GET: Insights ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "insights" // "insights" or "reports"

  if (type === "reports") {
    return getReports(searchParams)
  }

  return getInsights(searchParams)
}

// ── List Insights ──────────────────────────────────────────────────────────

async function getInsights(searchParams: URLSearchParams) {
  const agentType = searchParams.get("agentType")
  const category = searchParams.get("category")
  const days = searchParams.get("days")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)

  const where: Record<string, any> = {}

  if (agentType) {
    where.agentType = agentType
  }

  if (category) {
    where.category = category
  }

  if (days) {
    const since = new Date(Date.now() - parseInt(days, 10) * 86_400_000)
    where.createdAt = { gte: since }
  }

  const [insights, total] = await Promise.all([
    prisma.agentInsight.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.agentInsight.count({ where }),
  ])

  return NextResponse.json({
    insights: insights.map((i) => ({
      ...i,
      metadata: i.metadata ? safeParseJson(i.metadata) : {},
    })),
    total,
    limit,
  })
}

// ── List Reports ───────────────────────────────────────────────────────────

async function getReports(searchParams: URLSearchParams) {
  const agentType = searchParams.get("agentType")
  const days = searchParams.get("days")
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)

  const where: Record<string, any> = {}

  if (agentType) {
    where.agentType = agentType
  }

  if (days) {
    const since = new Date(Date.now() - parseInt(days, 10) * 86_400_000)
    where.createdAt = { gte: since }
  }

  const [reports, total] = await Promise.all([
    prisma.agentReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.agentReport.count({ where }),
  ])

  return NextResponse.json({
    reports: reports.map((r) => ({
      ...r,
      actions: safeParseJson(r.actions),
      metrics: safeParseJson(r.metrics),
      insightRefs: safeParseJson(r.insightRefs),
      nextActions: safeParseJson(r.nextActions),
    })),
    total,
    limit,
  })
}

// ── Safe JSON parse helper ─────────────────────────────────────────────────

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}
