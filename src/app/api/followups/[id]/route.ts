import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  const body = await req.json()
  const followup = await prisma.followup.update({
    where: { id },
    data: {
      ...(body.channel !== undefined && { channel: body.channel }),
      ...(body.messageBody !== undefined && { messageBody: body.messageBody }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.scheduledAt !== undefined && { scheduledAt: new Date(body.scheduledAt) }),
    },
  })
  return NextResponse.json(followup)
})
