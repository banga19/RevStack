import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  const { id } = await params
  const campaign = await prisma.outreachCampaign.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  })
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }
  return NextResponse.json(campaign)
})

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  const body = await req.json()
  const { steps, markConverted, unmarkConverted, ...campaignData } = body

  const data: Record<string, unknown> = { ...campaignData }

  if (markConverted) {
    data.convertedAt = new Date().toISOString()
    data.convertedToClientName = body.convertedToClientName || null
  }
  if (unmarkConverted) {
    data.convertedAt = null
    data.convertedToClientName = null
  }

  // Handle scheduled start
  if (body.scheduledAt) {
    data.startedAt = new Date(body.scheduledAt)
  }

  // Update with steps
  const campaign = await prisma.outreachCampaign.update({
    where: { id },
    data: {
      ...data,
      // Replace steps if provided
      ...(steps
        ? {
            steps: {
              deleteMany: {},
              create: steps.map((step: any, index: number) => ({
                stepNumber: index + 1,
                channel: step.channel || "email",
                subject: step.subject || null,
                messageBody: step.messageBody || "",
                delayDays: step.delayDays || 0,
                status: step.status || "pending",
              })),
            },
          }
        : {}),
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  })

  return NextResponse.json(campaign)
})

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  const { id } = await params
  await prisma.outreachCampaign.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
