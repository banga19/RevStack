import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { getOrgScope, orgWhereClause } from "@/lib/get-org-scope"

export const GET = withAbac(RESOURCES.SEQUENCES, "read", async (req, { session }) => {
  const scope = await getOrgScope(session.user.id)
  const where = orgWhereClause(scope, { organizationIdField: "organizationId" })

  const sequences = await prisma.sequence.findMany({
    where,
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(sequences)
})

export const POST = withAbac(RESOURCES.SEQUENCES, "write", async (req, { session }) => {
  const body = await req.json()
  const {
    name,
    description,
    triggerType,
    steps,
    status,
  } = body

  const scope = await getOrgScope(session.user.id)
  const organizationId = scope.organizationId || session.user.id

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Sequence name is required" }, { status: 400 })
  }

  const sequence = await prisma.sequence.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      triggerType: triggerType || "manual",
      status: status || "draft",
      organizationId,
      steps: steps?.length
        ? {
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
        : undefined,
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  })

  return NextResponse.json(sequence, { status: 201 })
})
