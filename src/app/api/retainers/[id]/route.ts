import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (_req: NextRequest, { params, session }) => {
  const { id } = await params
  const retainer = await prisma.retainer.findFirst({
    where: { id, userId: session.user.id },
    include: { client: { select: { name: true, company: true } } },
  })
  if (!retainer) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(retainer)
})

export const PATCH = withAuth(async (req: NextRequest, { params, session }) => {
  const { id } = await params
  const body = await req.json()
  const retainer = await prisma.retainer.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.amountUsd !== undefined && { amountUsd: parseFloat(body.amountUsd) }),
      ...(body.billingCycle !== undefined && { billingCycle: body.billingCycle }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.startDate !== undefined && { startDate: body.startDate }),
      ...(body.nextBillingDate !== undefined && { nextBillingDate: body.nextBillingDate }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.clientId !== undefined && { clientId: body.clientId }),
    },
  })
  if (retainer.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const updated = await prisma.retainer.findUnique({
    where: { id },
    include: { client: { select: { name: true, company: true } } },
  })
  return NextResponse.json(updated)
})
