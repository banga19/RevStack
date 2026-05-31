import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // Handle conversion tracking
    const { markConverted, unmarkConverted, ...rest } = body
    const data: Record<string, unknown> = { ...rest }
    if (markConverted) {
      data.convertedAt = new Date().toISOString()
      data.convertedToClientName = body.convertedToClientName || null
    }
    if (unmarkConverted) {
      data.convertedAt = null
      data.convertedToClientName = null
    }

    const campaign = await prisma.outreachCampaign.update({
      where: { id },
      data,
    })
    return NextResponse.json(campaign)
  } catch (error) {
    console.error("PUT outreach error:", error)
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.outreachCampaign.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE outreach error:", error)
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 })
  }
}
