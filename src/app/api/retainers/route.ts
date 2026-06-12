import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { getOrgScope, orgWhereClause } from "@/lib/get-org-scope"

export const GET = withAuth(async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  const scope = await getOrgScope(session.user.id)
  const where: any = orgWhereClause(scope, { userIdField: "userId" })
  if (status) where.status = status

  const retainers = await prisma.retainer.findMany({
    where,
    include: { client: { select: { name: true, company: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(retainers)
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()

  // Verify client belongs to user
  const client = await prisma.client.findFirst({
    where: { id: body.clientId, userId: session.user.id },
  })
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const retainer = await prisma.retainer.create({
    data: {
      clientId: body.clientId,
      name: body.name,
      amountUsd: parseFloat(body.amountUsd),
      billingCycle: body.billingCycle || "monthly",
      status: body.status || "active",
      startDate: body.startDate,
      nextBillingDate: body.nextBillingDate || null,
      notes: body.notes || null,
      userId: session.user.id,
    },
    include: { client: { select: { name: true, company: true } } },
  })

  await prisma.activity.create({
    data: {
      type: "retainer_created",
      description: `Retainer ${retainer.name} created ($${retainer.amountUsd}/mo)`,
      entityType: "retainer",
      entityId: retainer.id,
      userId: session.user.id,
    },
  })

  return NextResponse.json(retainer, { status: 201 })
})
