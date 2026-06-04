/**
 * ABAC — Attribute-Based Access Control
 *
 * Defines access policies based on user attributes:
 *   - Role: admin, user
 *   - Subscription status: trial, active, expired, past_due, canceled
 *   - Subscription tier: starter, growth, enterprise
 *   - Resource: the specific API resource or page being accessed
 *   - Action: read, write, admin, deploy, etc.
 *
 * Usage (server-side):
 *   import { checkAccess, RESOURCES } from "@/lib/abac"
 *   const decision = await checkAccess(session.user, RESOURCES.ADMIN, "admin")
 *   if (!decision.allowed) return NextResponse.json({ error: decision.reason }, { status: 403 })
 *
 * Usage (client-side):
 *   import { useAbac } from "@/lib/use-abac"
 *   const { canAccess } = useAbac()
 *   if (!canAccess("admin")) return <AccessDenied />
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// ============================================================
// Types
// ============================================================

export interface AbacUser {
  id: string
  role: string
  subscriptionStatus: string
  subscriptionTier: string | null
}

export interface AbacDecision {
  allowed: boolean
  reason: string
  grants: string[]
}

export type AbacAction = "read" | "write" | "admin" | "deploy" | "manage"
export type AbacResource =
  | "dashboard"
  | "admin"
  | "operations"
  | "god-mode"
  | "pipeline"
  | "trade"
  | "korea"
  | "content"
  | "outreach"
  | "financial"
  | "pricing"
  | "onboarding"
  | "docs"
  | "plan"
  | "clients"
  | "subscription"
  | "payments"
  | "revenue"

// ============================================================
// Resources as constants (for type-safe references)
// ============================================================

export const RESOURCES: Record<AbacResource, AbacResource> = {
  dashboard: "dashboard",
  admin: "admin",
  operations: "operations",
  "god-mode": "god-mode",
  pipeline: "pipeline",
  trade: "trade",
  korea: "korea",
  content: "content",
  outreach: "outreach",
  financial: "financial",
  pricing: "pricing",
  onboarding: "onboarding",
  docs: "docs",
  plan: "plan",
  clients: "clients",
  subscription: "subscription",
  payments: "payments",
  revenue: "revenue",
}

// ============================================================
// Policy Evaluation
// ============================================================

interface PolicyRule {
  description: string
  evaluate: (user: AbacUser) => boolean
  grant: string
}

interface ResourcePolicies {
  [action: string]: PolicyRule[]
}

// ============================================================
// Policy Definitions
// ============================================================

const policies: Record<string, ResourcePolicies> = {
  // ── Admin Panel ──────────────────────────────────────────
  admin: {
    read: [
      { description: "Admin role required", evaluate: (u) => u.role === "admin", grant: "admin:read" },
    ],
    write: [
      { description: "Admin role required", evaluate: (u) => u.role === "admin", grant: "admin:write" },
    ],
    admin: [
      { description: "Admin role required", evaluate: (u) => u.role === "admin", grant: "admin:admin" },
    ],
  },

  // ── God Mode ─────────────────────────────────────────────
  "god-mode": {
    read: [
      {
        description: "Admin or enterprise active subscription",
        evaluate: (u) =>
          u.role === "admin" ||
          (u.subscriptionStatus === "active" && u.subscriptionTier === "enterprise") ||
          (u.subscriptionStatus === "trial" && u.subscriptionTier === "enterprise"),
        grant: "god-mode:read",
      },
    ],
    deploy: [
      {
        description: "Admin or enterprise active subscription",
        evaluate: (u) =>
          u.role === "admin" ||
          (u.subscriptionStatus === "active" && u.subscriptionTier === "enterprise"),
        grant: "god-mode:deploy",
      },
    ],
  },

  // ── Operations ───────────────────────────────────────────
  operations: {
    read: [
      {
        description: "Admin or any active subscription/trial",
        evaluate: (u) =>
          u.role === "admin" ||
          u.subscriptionStatus === "active" ||
          u.subscriptionStatus === "trial",
        grant: "operations:read",
      },
    ],
    write: [
      {
        description: "Admin or any active subscription",
        evaluate: (u) =>
          u.role === "admin" || u.subscriptionStatus === "active",
        grant: "operations:write",
      },
    ],
    deploy: [
      {
        description: "Admin or enterprise active subscription",
        evaluate: (u) =>
          u.role === "admin" ||
          (u.subscriptionStatus === "active" && u.subscriptionTier === "enterprise"),
        grant: "operations:deploy",
      },
    ],
  },

  // ── Dashboard ────────────────────────────────────────────
  dashboard: {
    read: [
      {
        description: "Admin or any active subscription/trial",
        evaluate: (u) =>
          u.role === "admin" ||
          u.subscriptionStatus === "active" ||
          u.subscriptionStatus === "trial",
        grant: "dashboard:read",
      },
    ],
  },

  // ── Trade & Korea ────────────────────────────────────────
  trade: {
    read: [
      {
        description: "Admin or active/growth+ subscription or trial",
        evaluate: (u) =>
          u.role === "admin" ||
          u.subscriptionStatus === "active" ||
          u.subscriptionStatus === "trial",
        grant: "trade:read",
      },
    ],
    write: [
      {
        description: "Admin or active subscription (growth+)",
        evaluate: (u) =>
          u.role === "admin" ||
          (u.subscriptionStatus === "active" &&
            (u.subscriptionTier === "growth" || u.subscriptionTier === "enterprise")),
        grant: "trade:write",
      },
    ],
  },

  korea: {
    read: [
      { description: "Admin or any active subscription/trial", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active" || u.subscriptionStatus === "trial", grant: "korea:read" },
    ],
  },

  // ── Pipeline, Content, Outreach ──────────────────────────
  pipeline: {
    read: [
      { description: "Admin or active/trial user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active" || u.subscriptionStatus === "trial", grant: "pipeline:read" },
    ],
    write: [
      { description: "Admin or active user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active", grant: "pipeline:write" },
    ],
  },

  content: {
    read: [
      { description: "Admin or active/trial user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active" || u.subscriptionStatus === "trial", grant: "content:read" },
    ],
    write: [
      { description: "Admin or active user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active", grant: "content:write" },
    ],
  },

  outreach: {
    read: [
      { description: "Admin or active/trial user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active" || u.subscriptionStatus === "trial", grant: "outreach:read" },
    ],
    write: [
      { description: "Admin or active user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active", grant: "outreach:write" },
    ],
  },

  // ── Financial & Revenue ─────────────────────────────────
  financial: {
    read: [
      { description: "Admin or active growth+ user", evaluate: (u) => u.role === "admin" || (u.subscriptionStatus === "active" && (u.subscriptionTier === "growth" || u.subscriptionTier === "enterprise")), grant: "financial:read" },
    ],
  },

  revenue: {
    read: [
      { description: "Admin or active user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active", grant: "revenue:read" },
    ],
  },

  // ── Clients & CRM ────────────────────────────────────────
  clients: {
    read: [
      { description: "Admin or active/trial user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active" || u.subscriptionStatus === "trial", grant: "clients:read" },
    ],
    write: [
      { description: "Admin or active user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active", grant: "clients:write" },
    ],
  },

  // ── Subscription & Payments ──────────────────────────────
  subscription: {
    read: [
      { description: "Any authenticated user", evaluate: (u) => true, grant: "subscription:read" },
    ],
    write: [
      { description: "Admin or any non-expired user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus !== "expired", grant: "subscription:write" },
    ],
  },

  payments: {
    read: [
      { description: "Any authenticated user", evaluate: (u) => true, grant: "payments:read" },
    ],
    write: [
      { description: "Any authenticated user", evaluate: (u) => true, grant: "payments:write" },
    ],
  },

  // ── Onboarding ───────────────────────────────────────────
  onboarding: {
    read: [
      { description: "Any authenticated user", evaluate: (u) => true, grant: "onboarding:read" },
    ],
    write: [
      { description: "Any authenticated user", evaluate: (u) => true, grant: "onboarding:write" },
    ],
  },

  // ── Docs, Plan ──────────────────────────────────────────
  docs: {
    read: [
      { description: "Admin or active/trial user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active" || u.subscriptionStatus === "trial", grant: "docs:read" },
    ],
  },

  plan: {
    read: [
      { description: "Admin or active/trial user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active" || u.subscriptionStatus === "trial", grant: "plan:read" },
    ],
    write: [
      { description: "Admin or active user", evaluate: (u) => u.role === "admin" || u.subscriptionStatus === "active", grant: "plan:write" },
    ],
  },
}

// ============================================================
// Core Access Check
// ============================================================

/**
 * Check if a user has access to a resource with a given action.
 * Evaluates all matching policy rules and returns the decision.
 */
export function checkAccess(
  user: AbacUser,
  resource: AbacResource,
  action: AbacAction = "read"
): AbacDecision {
  const resourcePolicies = policies[resource]
  if (!resourcePolicies) {
    // No specific policy — deny by default
    return { allowed: false, reason: `No policy defined for resource: ${resource}`, grants: [] }
  }

  const actionPolicies = resourcePolicies[action]
  if (!actionPolicies) {
    // No specific action policy — deny
    return { allowed: false, reason: `No policy defined for action '${action}' on '${resource}'`, grants: [] }
  }

  const grants: string[] = []
  for (const rule of actionPolicies) {
    if (rule.evaluate(user)) {
      grants.push(rule.grant)
    }
  }

  if (grants.length > 0) {
    return { allowed: true, reason: `Granted via: ${grants.join(", ")}`, grants }
  }

  return { allowed: false, reason: `Access denied to '${resource}' for action '${action}'`, grants: [] }
}

/**
 * Convenience wrapper: get the session, build the AbacUser, and check access.
 * Returns a decision plus the session (so callers don't need to call auth() twice).
 */
export async function checkAccessFromSession(
  resource: AbacResource,
  action: AbacAction = "read"
): Promise<{ session: any; decision: AbacDecision }> {
  const session = await auth()
  if (!session?.user) {
    return {
      session: null,
      decision: { allowed: false, reason: "Not authenticated", grants: [] },
    }
  }

  // If user data may be stale in the session, refresh from DB
  let userAttrs: AbacUser
  if (session.user.role === "admin") {
    userAttrs = {
      id: session.user.id as string,
      role: "admin",
      subscriptionStatus: "active",
      subscriptionTier: "enterprise",
    }
  } else {
    // Fetch latest subscription data from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { role: true, subscriptionStatus: true, subscriptionTier: true },
    })
    userAttrs = {
      id: session.user.id as string,
      role: session.user.role as string,
      subscriptionStatus: dbUser?.subscriptionStatus || "trial",
      subscriptionTier: dbUser?.subscriptionTier || null,
    }
  }

  const decision = checkAccess(userAttrs, resource, action)
  return { session, decision }
}

export type { AbacResource as Resource }
export default { checkAccess, checkAccessFromSession, RESOURCES }
