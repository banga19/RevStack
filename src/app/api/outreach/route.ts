import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const campaigns = await prisma.outreachCampaign.findMany({ orderBy: { createdAt: "desc" } })
    return NextResponse.json(campaigns)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
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
  } catch (error) {
    console.error("POST outreach error:", error)
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
  }
}
