import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest, { session }) => {
  const userId = session.user.id as string
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 50)
  const offset = Number(url.searchParams.get("offset")) || 0

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.payment.count({ where: { userId } }),
  ])

  return NextResponse.json({
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      status: p.status,
      tier: p.tier,
      provider: p.provider,
      createdAt: p.createdAt.toISOString(),
    })),
    total,
    limit,
    offset,
  })
})
