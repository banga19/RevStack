import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { getOrgScope, orgWhereClause } from "@/lib/get-org-scope"

export const GET = withAbac(RESOURCES["call-recordings"], "read", async (_req, { params, session }) => {
  const { id } = await params
  const scope = await getOrgScope(session.user.id)
  const where: Record<string, any> = { id }
  const orgWhere = orgWhereClause(scope, { organizationIdField: "organizationId" })
  if (orgWhere.organizationId) {
    where.organizationId = orgWhere.organizationId
  } else {
    where.organizationId = session.user.id
  }

  const recording = await prisma.callRecording.findFirst({
    where,
    include: {
      prospect: {
        select: { id: true, firstName: true, lastName: true, company: true, email: true },
      },
    },
  })

  if (!recording) {
    return NextResponse.json({ error: "Call recording not found" }, { status: 404 })
  }

  return NextResponse.json(recording)
})

export const PUT = withAbac(RESOURCES["call-recordings"], "write", async (req, { params, session }) => {
  const { id } = await params
  const scope = await getOrgScope(session.user.id)
  const where: Record<string, any> = { id }
  const orgWhere = orgWhereClause(scope, { organizationIdField: "organizationId" })
  if (orgWhere.organizationId) {
    where.organizationId = orgWhere.organizationId
  } else {
    where.organizationId = session.user.id
  }

  const existing = await prisma.callRecording.findFirst({ where })
  if (!existing) {
    return NextResponse.json({ error: "Call recording not found" }, { status: 404 })
  }

  const body = await req.json()
  const data: Record<string, any> = {}
  const fields = [
    "status", "duration", "recordingUrl", "transcription",
    "summary", "sentiment", "talkingPoints", "actionItems",
    "objections", "coachingScore", "starredSnippets", "metadata",
  ]
  for (const field of fields) {
    if (field in body) {
      data[field] = body[field]
    }
  }

  const recording = await prisma.callRecording.update({
    where: { id },
    data,
    include: {
      prospect: {
        select: { id: true, firstName: true, lastName: true, company: true, email: true },
      },
    },
  })

  return NextResponse.json(recording)
})

export const DELETE = withAbac(RESOURCES["call-recordings"], "write", async (_req, { params, session }) => {
  const { id } = await params
  const scope = await getOrgScope(session.user.id)
  const where: Record<string, any> = { id }
  const orgWhere = orgWhereClause(scope, { organizationIdField: "organizationId" })
  if (orgWhere.organizationId) {
    where.organizationId = orgWhere.organizationId
  } else {
    where.organizationId = session.user.id
  }

  const existing = await prisma.callRecording.findFirst({ where })
  if (!existing) {
    return NextResponse.json({ error: "Call recording not found" }, { status: 404 })
  }

  await prisma.callRecording.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
