import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { getOrgScope, orgWhereClause } from "@/lib/get-org-scope"

export const GET = withAbac(RESOURCES.PROSPECTS, "read", async (_req, { params, session }) => {
  const { id } = await params
  const scope = await getOrgScope(session.user.id)
  const where: Record<string, any> = { id }
  const orgWhere = orgWhereClause(scope, { organizationIdField: "organizationId" })
  if (orgWhere.organizationId) {
    where.organizationId = orgWhere.organizationId
  } else {
    where.organizationId = session.user.id
  }

  const prospect = await prisma.prospect.findFirst({
    where,
    include: {
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      sequences: { include: { sequence: { select: { id: true, name: true, status: true } } } },
    },
  })

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
  }

  return NextResponse.json(prospect)
})

export const PUT = withAbac(RESOURCES.PROSPECTS, "write", async (req, { params, session }) => {
  const { id } = await params
  const scope = await getOrgScope(session.user.id)
  const where: Record<string, any> = { id }
  const orgWhere = orgWhereClause(scope, { organizationIdField: "organizationId" })
  if (orgWhere.organizationId) {
    where.organizationId = orgWhere.organizationId
  } else {
    where.organizationId = session.user.id
  }

  const existing = await prisma.prospect.findFirst({ where })
  if (!existing) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
  }

  const body = await req.json()
  const data: Record<string, any> = {}
  const fields = [
    "firstName", "lastName", "email", "phone", "whatsapp",
    "linkedin", "company", "title", "industry", "source", "enrichment",
  ]
  for (const field of fields) {
    if (field in body) {
      data[field] = body[field]?.trim ? body[field].trim() : body[field]
    }
  }

  const prospect = await prisma.prospect.update({
    where: { id },
    data,
  })

  return NextResponse.json(prospect)
})

export const DELETE = withAbac(RESOURCES.PROSPECTS, "write", async (_req, { params, session }) => {
  const { id } = await params
  const scope = await getOrgScope(session.user.id)
  const where: Record<string, any> = { id }
  const orgWhere = orgWhereClause(scope, { organizationIdField: "organizationId" })
  if (orgWhere.organizationId) {
    where.organizationId = orgWhere.organizationId
  } else {
    where.organizationId = session.user.id
  }

  const existing = await prisma.prospect.findFirst({ where })
  if (!existing) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
  }

  await prisma.prospect.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
