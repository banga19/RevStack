import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)
  const channel = searchParams.get("channel")
  const leadId = searchParams.get("leadId")

  // Scope messages by the user's leads and clients
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
  if (channel) where.channel = channel
  if (leadId) where.leadId = leadId

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  })
  return NextResponse.json(messages)
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()
  const message = await prisma.message.create({
    data: {
      channel: body.channel,
      to: body.to,
      body: body.body,
      status: body.status || "sent",
      leadId: body.leadId || null,
      clientId: body.clientId || null,
    },
  })

  await prisma.activity.create({
    data: {
      type: "message_sent",
      description: `Message sent via ${message.channel} to ${message.to}`,
      entityType: "message",
      entityId: message.id,
      userId: session.user.id,
    },
  })

  return NextResponse.json(message, { status: 201 })
})
