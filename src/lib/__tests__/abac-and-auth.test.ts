import { describe, it, expect, vi } from "vitest"

/**
 * ABAC policy enforcement tests
 */

type AbacUser = { id: string; role: string; subscriptionStatus: string; subscriptionTier: string | null }

interface PolicyRule {
  evaluate: (u: AbacUser) => boolean
  grant: string
}

interface ResourcePolicies {
  [action: string]: PolicyRule[]
}

const abacPolicies: Record<string, ResourcePolicies> = {
  "god-mode": {
    read: [
      {
        evaluate: (u) =>
          u.role === "admin" ||
          (u.subscriptionStatus === "active" && u.subscriptionTier === "enterprise") ||
          (u.subscriptionStatus === "trial" && u.subscriptionTier === "enterprise"),
        grant: "god-mode:read",
      },
    ],
    deploy: [
      {
        evaluate: (u) =>
          u.role === "admin" ||
          (u.subscriptionStatus === "active" && u.subscriptionTier === "enterprise"),
        grant: "god-mode:deploy",
      },
    ],
  },
  "hermes-runs": {
    admin: [
      { evaluate: (u) => u.role === "admin", grant: "hermes-runs:admin" },
    ],
  },
  admin: {
    read: [{ evaluate: (u) => u.role === "admin", grant: "admin:read" }],
    admin: [{ evaluate: (u) => u.role === "admin", grant: "admin:admin" }],
    write: [{ evaluate: (u) => u.role === "admin", grant: "admin:write" }],
  },
}

function checkAccess(user: AbacUser, resource: string, action: string): { allowed: boolean; grants: string[] } {
  const resourcePolicies = abacPolicies[resource]
  if (!resourcePolicies) return { allowed: false, grants: [] }
  const actionPolicies = resourcePolicies[action]
  if (!actionPolicies) return { allowed: false, grants: [] }

  const grants: string[] = []
  for (const rule of actionPolicies) {
    if (rule.evaluate(user)) grants.push(rule.grant)
  }
  return grants.length > 0 ? { allowed: true, grants } : { allowed: false, grants: [] }
}

const admin = (): AbacUser => ({ id: "admin-1", role: "admin", subscriptionStatus: "active", subscriptionTier: "enterprise" })
const user = (status = "active", tier: string | null = null): AbacUser => ({ id: "user-1", role: "user", subscriptionStatus: status, subscriptionTier: tier })

describe("ABAC — god-mode resource enforcement", () => {
  it("denies god-mode read to starter users", () => {
    expect(checkAccess(user("active", "starter"), "god-mode", "read").allowed).toBe(false)
  })

  it("denies god-mode read to expired enterprise users", () => {
    expect(checkAccess(user("expired", "enterprise"), "god-mode", "read").allowed).toBe(false)
  })

  it("denies god-mode deploy to trial users even with enterprise", () => {
    expect(checkAccess(user("trial", "enterprise"), "god-mode", "deploy").allowed).toBe(false)
  })

  it("allows god-mode read for admin", () => {
    expect(checkAccess(admin(), "god-mode", "read").allowed).toBe(true)
  })

  it("allows god-mode deploy for active enterprise users", () => {
    expect(checkAccess(user("active", "enterprise"), "god-mode", "deploy").allowed).toBe(true)
  })
})

describe("ABAC — hermes-runs resource enforcement", () => {
  it("denies hermes-runs admin to non-admin", () => {
    expect(checkAccess(user("active", "enterprise"), "hermes-runs", "admin").allowed).toBe(false)
  })

  it("allows hermes-runs admin for admin role", () => {
    expect(checkAccess(admin(), "hermes-runs", "admin").allowed).toBe(true)
    expect(checkAccess(admin(), "hermes-runs", "admin").grants).toContain("hermes-runs:admin")
  })
})

describe("ABAC — admin resource boundary checks", () => {
  it("denies admin read to non-admin user", () => {
    expect(checkAccess(user("active", "enterprise"), "admin", "read").allowed).toBe(false)
  })

  it("denies admin write to non-admin", () => {
    expect(checkAccess(user("active", "enterprise"), "admin", "write").allowed).toBe(false)
  })

  it("denies admin admin action to non-admin", () => {
    expect(checkAccess(user("active", "enterprise"), "admin", "admin").allowed).toBe(false)
  })

  it("allows all admin actions to role=admin", () => {
    for (const action of ["read", "write", "admin"] as const) {
      expect(checkAccess(admin(), "admin", action).allowed).toBe(true)
    }
  })
})

describe("ABAC — hermes-runs guardrails", () => {
  it("denies hermes-runs to starter-tier user", () => {
    expect(checkAccess(user("active", "starter"), "hermes-runs", "admin").allowed).toBe(false)
  })

  it("denies hermes-runs to expired user even if admin-tier", () => {
    expect(checkAccess(user("expired", "enterprise"), "hermes-runs", "admin").allowed).toBe(false)
  })
})
