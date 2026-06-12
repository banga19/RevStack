import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { getOrgScope, orgWhereClause } from "@/lib/get-org-scope"

export const GET = withAbac(RESOURCES["call-recordings"], "read", async (_req, { session }) => {
  const scope = await getOrgScope(session.user.id)
  const where = orgWhereClause(scope, { organizationIdField: "organizationId" })

  const recordings = await prisma.callRecording.findMany({
    where,
    include: {
      prospect: {
        select: { id: true, firstName: true, lastName: true, company: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json(recordings)
})

export const POST = withAbac(RESOURCES["call-recordings"], "write", async (req, { session }) => {
  const scope = await getOrgScope(session.user.id)
  const organizationId = scope.organizationId || session.user.id
  const body = await req.json()

  const {
    prospectId,
    direction,
    callSid,
    recordingSid,
    recordingUrl,
    duration,
    status,
    metadata,
  } = body

  if (!direction || !status) {
    return NextResponse.json({ error: "direction and status are required" }, { status: 400 })
  }

  if (prospectId) {
    const prospect = await prisma.prospect.findFirst({
      where: { id: prospectId, organizationId },
    })
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }
  }

  const recording = await prisma.callRecording.create({
    data: {
      organizationId,
      prospectId: prospectId || null,
      repId: session.user.id,
      direction,
      status,
      duration: duration || null,
      recordingUrl: recordingUrl || null,
      metadata: metadata || null,
    },
    include: {
      prospect: {
        select: { id: true, firstName: true, lastName: true, company: true, email: true },
      },
    },
  })

  return NextResponse.json(recording, { status: 201 })
})
