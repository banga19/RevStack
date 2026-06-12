import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

type AbVariantConfig = {
  id: string
  name: string
  subject?: string
  messageBody: string
  channel: string
  targetPercentage: number
}

type AbTestExperiment = {
  id: string
  name: string
  description: string | null
  campaignId: string | null
  status: string // draft, running, completed
  variants: AbVariantConfig[]
  winnerVariantId: string | null
  createdAt: string
}

export const GET = withAuth(async (_req: NextRequest) => {
  const experimentsRaw = await prisma.outreachCampaign.findMany({
    where: { templateId: "ab-test" },
    select: {
      id: true,
      clientName: true,
      type: true,
      status: true,
      sentCount: true,
      replyCount: true,
      openedCount: true,
      clickedCount: true,
      bookedCount: true,
      createdAt: true,
      steps: { select: { id: true, messageBody: true, channel: true, subject: true, stepNumber: true, status: true, sentAt: true, openedCount: true, replyCount: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const experiments: AbTestExperiment[] = experimentsRaw.map((c) => {
    const metadata = c.type === "warm" ? { id: "a", name: "Variant A", channel: "whatsapp", messageBody: c.steps[0]?.messageBody || "", targetPercentage: 50 } : { id: "b", name: "Variant B", channel: "email", messageBody: c.steps[1]?.messageBody || "", targetPercentage: 50 }
    return {
      id: c.id,
      name: c.clientName || "A/B Test",
      description: `${c.type} campaign with ${c.steps.length} variants`,
      campaignId: c.id,
      status: c.status === "active" ? "running" : c.status === "completed" ? "completed" : "draft",
      variants: c.steps.length > 0 ? c.steps.map((s, i) => ({
        id: String(i),
        name: `Variant ${String.fromCharCode(65 + i)}`,
        subject: s.subject || undefined,
        messageBody: s.messageBody,
        channel: s.channel,
        targetPercentage: Math.round(100 / c.steps.length),
      })) : [metadata],
      winnerVariantId: null,
      createdAt: c.createdAt.toISOString(),
    }
  })

  return NextResponse.json(experiments)
})

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const { name, description, channel, subject, messageBody, variants, targetCount } = body

  // Create an A/B test as an outreach campaign with multi-step variants
  const campaign = await prisma.outreachCampaign.create({
    data: {
      clientName: name || "A/B Test",
      channel: channel || "whatsapp",
      type: "warm",
      status: "draft",
      templateId: "ab-test",
      subject: subject || null,
      messageBody: messageBody || null,
      targetCount: targetCount || 0,
      sentCount: 0,
      replyCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bounceCount: 0,
      bookedCount: 0,
      steps: variants?.length
        ? {
            create: variants.map((v: any, i: number) => ({
              stepNumber: i + 1,
              channel: v.channel || "whatsapp",
              subject: v.subject || null,
              messageBody: v.messageBody || "",
              delayDays: 0,
              status: "pending",
            })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  })

  return NextResponse.json({ id: campaign.id, name, description, status: "draft", variants: campaign.steps.map((s, i) => ({ id: String(i), name: `Variant ${String.fromCharCode(65 + i)}`, channel: s.channel, subject: s.subject, messageBody: s.messageBody, targetPercentage: 50 })), winnerVariantId: null, createdAt: campaign.createdAt.toISOString() }, { status: 201 })
})

export const PUT = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const { id, action } = body

  if (action === "start") {
    const campaign = await prisma.outreachCampaign.update({
      where: { id },
      data: { status: "active", startedAt: new Date() },
      include: { steps: true },
    })
    return NextResponse.json({ success: true, campaign })
  }

  if (action === "complete") {
    const campaign = await prisma.outreachCampaign.update({
      where: { id },
      data: { status: "completed", completedAt: new Date() },
      include: { steps: true },
    })

    // Determine winner: highest reply count per step
    let winnerIndex = 0
    let bestScore = -1
    campaign.steps.forEach((s, i) => {
      const score = (s.replyCount || 0) * 3 + (s.openedCount || 0)
      if (score > bestScore) {
        bestScore = score
        winnerIndex = i
      }
    })

    return NextResponse.json({
      success: true,
      campaign,
      winnerVariantId: String(winnerIndex),
      winnerName: `Variant ${String.fromCharCode(65 + winnerIndex)}`,
      winningScore: bestScore,
    })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
})
