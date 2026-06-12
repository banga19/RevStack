import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

function isAllowedTradeStatus(input: string) {
  return ["draft", "submitted", "under-review", "approved", "disbursed", "rejected"].includes(input)
}

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json().catch(() => ({}))
  const program = typeof body.program === "string" ? body.program : "afdb-afawa"
  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount || 0)
  const currency = typeof body.currency === "string" ? body.currency : "USD"
  const status = isAllowedTradeStatus(typeof body.status === "string" ? body.status : "") ? body.status : "draft"
  const clientId = typeof body.clientId === "string" ? body.clientId : null
  const notes = typeof body.notes === "string" ? body.notes : null

  if (!["afdb-afawa", "sokogate-pay-escrow", "letter-of-credit", "export-credit", "other"].includes(program)) {
    return NextResponse.json({ error: "Invalid program" }, { status: 400 })
  }

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 })
  }

  const owner = await prisma.user.findFirst({
    where: { id: session.user.id, clients: { some: { id: clientId } } },
    select: { id: true },
  })

  if (!owner) {
    return NextResponse.json({ error: "clientId is not owned by the current user" }, { status: 400 })
  }

  const application = await prisma.tradeFinanceApplication.create({
    data: {
      clientId,
      program,
      amount,
      currency,
      status,
      notes,
      appliedAt: status === "submitted" ? new Date() : null,
    },
  })

  return NextResponse.json({ application }, { status: 201 })
})

export const GET = withAuth(async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, clients: { select: { id: true } } },
  })

  const clientIds = (user?.clients ?? []).map((c) => c.id)
  if (clientIds.length === 0) {
    return NextResponse.json({ applications: [] })
  }

  const applications = await prisma.tradeFinanceApplication.findMany({
    where: {
      clientId: { in: clientIds },
      ...(clientId && clientIds.includes(clientId) ? { clientId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json({ applications })
})
