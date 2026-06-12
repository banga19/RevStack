import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { getOrgScope, orgWhereClause } from "@/lib/get-org-scope"

export const GET = withAbac(RESOURCES.PROSPECTS, "read", async (_req, { params, session }) => {
  const { id } = await params
  const scope = await getOrgScope(session.user.id)
  const where: Record<string, any> = { prospectId: id }
  const orgWhere = orgWhereClause(scope, { organizationIdField: "organizationId" })

  const prospect = await prisma.prospect.findFirst({
    where: {
      id,
      ...(orgWhere.organizationId ? { organizationId: orgWhere.organizationId } : { organizationId: session.user.id }),
    },
  })

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
  }

  const { searchParams } = new URL(_req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200)
  const offset = parseInt(searchParams.get("offset") || "0", 10)

  const [activities, total] = await Promise.all([
    prisma.prospectActivity.findMany({
      where: { prospectId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.prospectActivity.count({ where: { prospectId: id } }),
  ])

  return NextResponse.json({ activities, total, limit, offset })
})
