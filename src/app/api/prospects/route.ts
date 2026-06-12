import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { getOrgScope, orgWhereClause } from "@/lib/get-org-scope"

export const GET = withAbac(RESOURCES.PROSPECTS, "read", async (_req, { session }) => {
  const scope = await getOrgScope(session.user.id)
  const where = orgWhereClause(scope, { organizationIdField: "organizationId" })

  const prospects = await prisma.prospect.findMany({
    where,
    include: {
      activities: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { activities: true, sequences: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json(prospects)
})

export const POST = withAbac(RESOURCES.PROSPECTS, "write", async (req, { session }) => {
  const body = await req.json()
  const scope = await getOrgScope(session.user.id)
  const organizationId = scope.organizationId || session.user.id

  const {
    firstName,
    lastName,
    email,
    phone,
    whatsapp,
    linkedin,
    company,
    title,
    industry,
    source,
    enrichment,
  } = body

  if (!firstName && !lastName && !email && !phone && !company) {
    return NextResponse.json(
      { error: "At least one identifier (name, email, phone, or company) is required" },
      { status: 400 }
    )
  }

  const prospect = await prisma.prospect.create({
    data: {
      organizationId,
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      linkedin: linkedin?.trim() || null,
      company: company?.trim() || null,
      title: title?.trim() || null,
      industry: industry?.trim() || null,
      source: source?.trim() || "manual",
      enrichment: enrichment || null,
    },
  })

  return NextResponse.json(prospect, { status: 201 })
})
