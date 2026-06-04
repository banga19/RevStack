import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")
  const where = clientId ? { clientId } : {}
  const apps = await prisma.tradeFinanceApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(apps)
})

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const app = await prisma.tradeFinanceApplication.create({
    data: {
      clientId: body.clientId,
      program: body.program,
      amount: body.amount ? parseFloat(body.amount) : null,
      currency: body.currency || "USD",
      status: body.status || "draft",
      notes: body.notes || null,
      appliedAt: body.appliedAt ? new Date(body.appliedAt) : null,
      approvedAt: body.approvedAt ? new Date(body.approvedAt) : null,
      disbursedAt: body.disbursedAt ? new Date(body.disbursedAt) : null,
    },
  })
  return NextResponse.json(app, { status: 201 })
})
