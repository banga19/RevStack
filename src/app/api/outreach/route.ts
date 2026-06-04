import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async () => {
  const campaigns = await prisma.outreachCampaign.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(campaigns)
})

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const campaign = await prisma.outreachCampaign.create({
    data: {
      clientId: body.clientId || null,
      clientName: body.clientName || null,
      channel: body.channel || "email",
      type: body.type || "cold",
      status: "draft",
      templateId: body.templateId || null,
      sentCount: 0,
      replyCount: 0,
      bookedCount: 0,
      startedAt: body.status === "active" ? new Date() : null,
    },
  })
  return NextResponse.json(campaign, { status: 201 })
})
