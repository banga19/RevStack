import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url)
  const partnerId = url.searchParams.get("partnerId") || undefined
  if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 })

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { id: true, commissionRate: true, tier: true, referrals: { select: { id: true, commissionDue: true, status: true } } },
  })

  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

  const totalDue = partner.referrals.reduce((s, r) => s + (r.commissionDue || 0), 0)
  const pendingSettlements = partner.referrals
    .filter((r) => r.status === "pending" || r.status === "invited")
    .map((r) => ({ id: r.id, commissionDue: r.commissionDue, status: r.status }))

  return NextResponse.json({
    partnerId: partner.id,
    tier: partner.tier,
    commissionRate: partner.commissionRate,
    totalCommissionDue: totalDue,
    pendingSettlements,
  })
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json().catch(() => ({}))
  const partnerId = typeof body.partnerId === "string" ? body.partnerId : undefined
  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount || 0)
  const note = typeof body.note === "string" ? body.note : null

  if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 })
  if (amount <= 0) return NextResponse.json({ error: "amount must be positive" }, { status: 400 })

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } })
  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 })

  const ledger = await prisma.referral.create({
    data: {
      partnerId,
      commissionDue: amount,
      status: "pending",
    } as any,
  })

  return NextResponse.json({ ledger, note }, { status: 201 })
})
