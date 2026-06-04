/**
 * Subscription Gate Middleware
 *
 * Blocks access to protected API routes when the user's trial has expired
 * and they don't have an active subscription. Admin users bypass this gate.
 *
 * Protected API routes (non-public endpoints):
 *   - /api/god-mode
 *   - /api/subscription (POST/PATCH/DELETE — mutating operations)
 *   - /api/clients, /api/clients/*
 *   - /api/pipeline-actions, /api/pipeline-actions/*
 *   - /api/outreach, /api/outreach/*
 *   - /api/content, /api/content/*
 *   - /api/revenue, /api/revenue/*
 *   - /api/documents, /api/documents/*
 *   - /api/korea/*
 *   - /api/dashboard
 *   - /api/admin/*
 *   - /api/plan/*
 *   - /api/operations/*
 *
 * Public API routes (no subscription check needed):
 *   - /api/auth/*           — Auth endpoints
 *   - /api/cron/*            — Cron job endpoints
 *   - /api/health            — Health check
 *   - /api/csrf              — CSRF token
 *   - /api/subscribe         — Newsletter signup (public)
 *   - /api/pricing           — Public pricing data
 *   - /api/payments/*        — Payment webhooks (validated separately)
 *   - /api/push/*            — Push notification endpoints
 *   - /api/subscription (GET) — Read-only check
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ============================================================
// Public API route prefixes — no subscription check
// ============================================================

const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/cron/",
  "/api/health",
  "/api/csrf",
  "/api/subscribe",
  "/api/pricing",
  "/api/payments/webhook",
  "/api/push/",
]

// API routes that are ALWAYS allowed (GET read-only for subscription info)
const ALWAYS_ALLOWED_API = [
  "/api/subscription",
  "/api/ers/snapshots",
]

function isPublicApiRoute(pathname: string, method: string): boolean {
  // Check public prefixes
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true
  }

  // GET requests to specific allowed endpoints
  if (method === "GET" && ALWAYS_ALLOWED_API.some((p) => pathname.startsWith(p))) {
    return true
  }

  return false
}

function isProtectedApiRoute(pathname: string): boolean {
  // Only check /api/* routes
  if (!pathname.startsWith("/api/")) return false

  // If not a public route, it's protected
  return true
}

// ============================================================
// Middleware
// ============================================================

export default function proxy() {
  // Subscription gating is handled by:
  //   1. Client-side SubscriptionGate component (src/components/subscription-gate.tsx)
  //   2. Server-side subscription-gate.ts utility for route handlers
  //
  // This proxy is intentionally empty — all gating logic lives in the components
  // and utilities where full user context (DB fetch) is available.
}
