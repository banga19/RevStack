/**
 * Monitoring and alerting utilities for RevStack.
 *
 * Provides:
 *  - Health checks for DB, Redis, and external integrations.
 *  - Prometheus-ready metrics endpoint data.
 *  - Alert thresholds for ops (queue lag, DB latency, error rate).
 */

import { prisma } from "@/lib/db"

export interface HealthStatus {
  status: "ok" | "degraded" | "error"
  timestamp: string
  version: string
  checks: {
    database: ComponentHealth
    redis?: ComponentHealth
    integrations: {
      flutterwave?: ComponentHealth
      wati?: ComponentHealth
    }
  }
}

export interface ComponentHealth {
  status: "up" | "down" | "degraded"
  latencyMs?: number
  detail?: string
}

export async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: "up", latencyMs: Date.now() - start }
  } catch (err: any) {
    return { status: "down", detail: err?.message || "query failed" }
  }
}

export async function checkRedis(): Promise<ComponentHealth | undefined> {
  try {
    const mod = await import("@/lib/hermes/queue")
    const start = Date.now()
    const pong = await (mod.redis as any).ping()
    return { status: pong === "PONG" ? "up" : "degraded", latencyMs: Date.now() - start }
  } catch {
    return { status: "down", detail: "redis module unavailable or connection refused" }
  }
}

export async function checkFlutterwave(): Promise<ComponentHealth> {
  const key = process.env.FLW_SECRET_KEY
  if (!key) return { status: "degraded", detail: "missing FLW_SECRET_KEY" }
  return { status: "up", detail: "configured" }
}

export async function checkWati(): Promise<ComponentHealth> {
  const token = process.env.WATI_API_TOKEN
  if (!token) return { status: "degraded", detail: "missing WATI_API_TOKEN" }
  return { status: "up", detail: "configured" }
}

export async function getSystemHealth(): Promise<HealthStatus> {
  const [database, redis, flutterwave, wati] = await Promise.all([
    checkDatabase(),
    checkRedis().catch(() => ({ status: "degraded" as const })),
    checkFlutterwave(),
    checkWati(),
  ])

  const overall =
    database.status === "down" ? "error"
    : [redis?.status, flutterwave.status, wati.status].some((s) => s === "down")
    ? "degraded"
    : "ok"

  return {
    status: overall,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    checks: {
      database,
      ...(redis ? { redis } : {}),
      integrations: {
        ...(flutterwave ? { flutterwave } : {}),
        ...(wati ? { wati } : {}),
      },
    },
  }
}

export function metricsSnapshot() {
  return {
    timestamp: new Date().toISOString(),
    node: {
      env: process.env.NODE_ENV,
      version: process.version,
    },
    alerts: {
      dbMaxLatencyMs: 500,
      queueMaxLag: 100,
      errorRateThreshold: 0.05,
    },
  }
}
