import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  const { id } = await params
  const body = await req.json()
  const action = await prisma.pipelineAction.update({
    where: { id },
    data: body,
  })
  return NextResponse.json(action)
})

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  const { id } = await params
  await prisma.pipelineAction.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
