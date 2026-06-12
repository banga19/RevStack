/**
 * Organization Scope Helper
 *
 * Utility for scoping database queries to the user's organization.
 * Reuses the pattern from src/app/api/clients/route.ts.
 */

import { prisma } from "@/lib/db"

export interface OrgScope {
  organizationId: string | null
  userId: string
  isAdmin: boolean
}

/**
 * Get the organization scope for a user.
 * Returns the organizationId (if any) and whether the user is an admin.
 */
export async function getOrgScope(userId: string): Promise<OrgScope> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organizationId: true,
      role: true,
    },
  })

  return {
    organizationId: user?.organizationId || null,
    userId,
    isAdmin: user?.role === "admin",
  }
}

/**
 * Build a WHERE clause that scopes to the user's organization.
 * If the user has an org, returns an OR condition matching both
 * direct userId matches and org-scoped data.
 * If admin, returns empty (no scope restriction).
 */
export function orgWhereClause(
  scope: OrgScope,
  options: {
    userIdField?: string
    organizationIdField?: string
  } = {}
): Record<string, any> {
  const userIdField = options.userIdField || "userId"
  const orgIdField = options.organizationIdField || "organizationId"

  // Admin users bypass org scoping
  if (scope.isAdmin) return {}

  // If user has an org, scope to org + personal records
  if (scope.organizationId) {
    return {
      OR: [
        { [userIdField]: scope.userId },
        { [orgIdField]: scope.organizationId },
      ],
    }
  }

  // Fallback: scope to user only
  return { [userIdField]: scope.userId }
}
