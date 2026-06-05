import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  // Scope followups by the user's leads and clients
  const userLeads = await prisma.lead.findMany({ where: { userId: session.user.id }, select: { id: true } })
  const userClients = await prisma.client.findMany({ where: { userId: session.user.id }, select: { id: true } })
  const leadIds = userLeads.map((l) => l.id)
  const clientIds = userClients.map((c) => c.id)

  const where: any = {
    OR: [
      { leadId: { in: leadIds } },
      { clientId: { in: clientIds } },
    ],
  }
  if (status) where.status = status

  const followups = await prisma.followup.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
  })
  return NextResponse.json(followups)
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()
  const followup = await prisma.followup.create({
    data: {
      leadId: body.leadId || null,
      clientId: body.clientId || null,
      channel: body.channel || "whatsapp",
      messageBody: body.messageBody,
      status: body.status || "pending",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
    },
  })
  return NextResponse.json(followup, { status: 201 })
})
