import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  const body = await req.json()
  const app = await prisma.tradeFinanceApplication.update({
    where: { id },
    data: {
      ...body,
      amount: body.amount ? parseFloat(body.amount) : undefined,
      appliedAt: body.appliedAt ? new Date(body.appliedAt) : undefined,
      approvedAt: body.approvedAt ? new Date(body.approvedAt) : undefined,
      disbursedAt: body.disbursedAt ? new Date(body.disbursedAt) : undefined,
    },
  })
  return NextResponse.json(app)
})

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  const { id } = await params
  await prisma.tradeFinanceApplication.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
