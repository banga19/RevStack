import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async () => {
  const campaigns = await prisma.outreachCampaign.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  })
  return NextResponse.json(campaigns)
})

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const {
    clientName,
    channel,
    type,
    subject,
    messageBody,
    scheduleType,
    scheduledAt,
    steps,
    status,
  } = body

  const campaign = await prisma.outreachCampaign.create({
    data: {
      clientName: clientName || null,
      channel: channel || "email",
      type: type || "cold",
      status: status || "draft",
      subject: subject || null,
      messageBody: messageBody || null,
      scheduleType: scheduleType || "immediate",
      startedAt: scheduledAt ? new Date(scheduledAt) : status === "active" ? new Date() : null,
      sentCount: 0,
      replyCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bounceCount: 0,
      bookedCount: 0,
      targetCount: body.targetCount || 0,
      steps: steps?.length
        ? {
            create: steps.map((step: any, index: number) => ({
              stepNumber: index + 1,
              channel: step.channel || channel || "email",
              subject: step.subject || null,
              messageBody: step.messageBody || "",
              delayDays: step.delayDays || 0,
              status: "pending",
            })),
          }
        : undefined,
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  })

  return NextResponse.json(campaign, { status: 201 })
})
