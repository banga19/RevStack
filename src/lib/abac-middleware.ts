/**
 * ABAC Middleware — Protects API route handlers using attribute-based access control.
 *
 * Wraps a route handler with automatic session + ABAC checks.
 *
 * Usage:
 *   import { withAbac } from "@/lib/abac-middleware"
 *   import { RESOURCES } from "@/lib/abac"
 *
 *   export const GET = withAbac(RESOURCES.DASHBOARD, "read", async (req, { session }) => {
 *     // Session is guaranteed to exist and user has access
 *     return NextResponse.json({ ok: true })
 *   })
 */

import { NextRequest, NextResponse } from "next/server"
import { checkAccessFromSession, type AbacResource, type AbacAction } from "@/lib/abac"

type RouteHandler = (
  req: NextRequest,
  context: { session: any; params: any }
) => Promise<NextResponse> | NextResponse

/**
 * Wrap an API route handler with ABAC access control.
 * If the user is not authenticated or lacks permission, returns 401/403.
 */
/**
 * Wrap an API route handler with ABAC access control.
 * If the user is not authenticated or lacks permission, returns 401/403.
 * Catches errors from the handler and returns a 500 JSON response.
 */
export function withAbac(
  resource: AbacResource,
  action: AbacAction = "read",
  handler: RouteHandler
): (req: NextRequest, context?: any) => Promise<NextResponse> {
  return async (req: NextRequest, context?: any) => {
    try {
      const { session, decision } = await checkAccessFromSession(resource, action)

      if (!session) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      }

      if (!decision.allowed) {
        return NextResponse.json(
          { error: decision.reason, code: "access_denied" },
          { status: 403 }
        )
      }

      return await handler(req, { session, params: context?.params || {} })
    } catch (error: any) {
      console.error("ABAC middleware error:", error)
      return NextResponse.json(
        { error: error?.message || "Internal server error" },
        { status: 500 }
      )
    }
  }
}

/**
 * Quick middleware that only checks authentication (no resource-level ABAC).
 * Useful for endpoints that just need a valid session.
 * Catches errors from the handler and returns a 500 JSON response.
 */
export function withAuth(
  handler: RouteHandler
): (req: NextRequest, context?: any) => Promise<NextResponse> {
  return async (req: NextRequest, context?: any) => {
    try {
      const { session } = await checkAccessFromSession("dashboard", "read")

      if (!session) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        )
      }

      return await handler(req, { session, params: context?.params || {} })
    } catch (error: any) {
      console.error("ABAC middleware error:", error)
      return NextResponse.json(
        { error: error?.message || "Internal server error" },
        { status: 500 }
      )
    }
  }
}
