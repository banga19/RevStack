import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  const body = await req.json()

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
})

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  const { id } = await params
  await prisma.outreachCampaign.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
