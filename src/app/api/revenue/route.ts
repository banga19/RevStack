import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async () => {
  const revenue = await prisma.revenueEntry.findMany({ orderBy: { date: "asc" } })
  const snapshots = await prisma.financialSnapshot.findMany({ orderBy: { month: "asc" } })
  const clients = await prisma.client.findMany()
  return NextResponse.json({ revenue, snapshots, clients })
})

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const entry = await prisma.revenueEntry.create({
    data: {
      date: new Date(body.date),
      clientName: body.clientName || null,
      amount: parseFloat(body.amount),
      type: body.type || "retainer",
      category: body.category || null,
      note: body.note || null,
    },
  })
  return NextResponse.json(entry, { status: 201 })
})
