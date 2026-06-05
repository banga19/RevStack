import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const POST = withAuth(async (_req: NextRequest, { params, session }) => {
  const { id } = await params
  const existing = await prisma.followup.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const followup = await prisma.followup.update({
    where: { id },
    data: { status: "sent", sentAt: new Date() },
  })

  // Log to messages
  const to = existing.leadId || existing.clientId || "unknown"
  await prisma.message.create({
    data: {
      channel: existing.channel,
      to,
      body: existing.messageBody,
      status: "sent",
      leadId: existing.leadId || undefined,
      clientId: existing.clientId || undefined,
    },
  })

  await prisma.activity.create({
    data: {
      type: "followup_sent",
      description: `Follow-up sent via ${existing.channel}`,
      entityType: "followup",
      entityId: id,
      userId: session.user.id,
    },
  })

  return NextResponse.json(followup)
})
