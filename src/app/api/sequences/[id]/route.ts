import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { getOrgScope, orgWhereClause } from "@/lib/get-org-scope"
import { hermesQueue } from "@/lib/hermes/queue"

export const GET = withAbac(RESOURCES.SEQUENCES, "read", async (_req, { params, session }) => {
  const { id } = await params
  const scope = await getOrgScope(session.user.id)
  const where: any = { id }
  const orgWhere = orgWhereClause(scope, { organizationIdField: "organizationId" })
  if (orgWhere.organizationId) {
    where.organizationId = orgWhere.organizationId
  } else {
    where.organizationId = session.user.id
  }

  const sequence = await prisma.sequence.findFirst({
    where,
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  })

  if (!sequence) {
    return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
  }

  return NextResponse.json(sequence)
})

export const PUT = withAbac(RESOURCES.SEQUENCES, "write", async (req, { params, session }) => {
  const { id } = await params
  const scope = await getOrgScope(session.user.id)
  const where: any = { id }
  const orgWhere = orgWhereClause(scope, { organizationIdField: "organizationId" })
  if (orgWhere.organizationId) {
    where.organizationId = orgWhere.organizationId
  } else {
    where.organizationId = session.user.id
  }

  const existing = await prisma.sequence.findFirst({ where })
  if (!existing) {
    return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
  }

  const body = await req.json()
  const {
    name,
    description,
    triggerType,
    status,
    steps,
  } = body

  const updateData: any = {}
  if (name !== undefined) updateData.name = name.trim() || existing.name
  if (description !== undefined) updateData.description = description?.trim() || null
  if (triggerType !== undefined) updateData.triggerType = triggerType
  if (status !== undefined) updateData.status = status

  if (Array.isArray(steps)) {
    await prisma.sequenceStep.deleteMany({ where: { sequenceId: id } })
    updateData.steps = {
      create: steps.map((step: any, index: number) => ({
        stepNumber: step.stepNumber ?? index + 1,
        channel: step.channel || "email",
        type: step.type || "send_message",
        subject: step.subject || null,
        messageBody: step.messageBody || "",
        callScript: step.callScript || null,
        delayHours: step.delayHours ?? 0,
        condition: step.condition || null,
        status: "pending",
      })),
    }
  }

  const sequence = await prisma.sequence.update({
    where: { id },
    data: updateData,
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  })

  return NextResponse.json(sequence)
})

export const DELETE = withAbac(RESOURCES.SEQUENCES, "write", async (_req, { params, session }) => {
  const { id } = await params
  const scope = await getOrgScope(session.user.id)
  const where: any = { id }
  const orgWhere = orgWhereClause(scope, { organizationIdField: "organizationId" })
  if (orgWhere.organizationId) {
    where.organizationId = orgWhere.organizationId
  } else {
    where.organizationId = session.user.id
  }

  const existing = await prisma.sequence.findFirst({ where })
  if (!existing) {
    return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
  }

  await prisma.sequence.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
