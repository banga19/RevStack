import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { watiIntegration } from "@/lib/wati-integration"
import { sendCustomEmail } from "@/lib/email"

export const POST = withAuth(async (_req: NextRequest, { params }) => {
  const { id } = await params

  const campaign = await prisma.outreachCampaign.findUnique({
    where: { id },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  })

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  if (campaign.status === "active" || campaign.status === "completed") {
    return NextResponse.json({ error: "Campaign is already active or completed" }, { status: 400 })
  }

  const now = new Date()
  let totalSent = 0

  // Send each step sequentially
  for (const step of campaign.steps) {
    try {
      const resolvedBody = step.messageBody
        .replace(/\{\{sender\}\}/g, "Mapato Team")
        .replace(/\{\{name\}\}/g, campaign.clientName || "there")
        .replace(/\{\{company\}\}/g, "your company")

      if (step.channel === "whatsapp") {
        const result = await watiIntegration.sendMessage(
          "+254700000000", // placeholder — real number from client/lead record
          resolvedBody
        )
        if (result.success) {
          totalSent++
          await prisma.campaignStep.update({
            where: { id: step.id },
            data: { status: "sent", sentAt: now },
          })
        }
      } else if (step.channel === "email") {
        const result = await sendCustomEmail(
          "placeholder@example.com",
          step.subject || campaign.subject || "Message from {{sender}}".replace(/\{\{sender\}\}/g, "Mapato Team"),
          resolvedBody.replace(/\n/g, "<br>"),
          resolvedBody
        )
        if (result.success) {
          totalSent++
          await prisma.campaignStep.update({
            where: { id: step.id },
            data: { status: "sent", sentAt: now },
          })
        }
      }
    } catch (error) {
      console.error(`[Campaign Send] Step ${step.stepNumber} failed:`, error)
      await prisma.campaignStep.update({
        where: { id: step.id },
        data: { status: "skipped" },
      })
    }
  }

  // Update campaign status
  const updated = await prisma.outreachCampaign.update({
    where: { id },
    data: {
      status: totalSent > 0 ? "active" : "draft",
      sentCount: { increment: totalSent },
      startedAt: now,
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  })

  return NextResponse.json({
    ...updated,
    sentNow: totalSent,
    message: `Sent ${totalSent} of ${campaign.steps.length} steps`,
  })
})
