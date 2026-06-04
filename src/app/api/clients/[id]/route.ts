import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const PUT = withAuth(async (req: NextRequest, { params, session }) => {
  const { id } = await params
  const body = await req.json()
  const client = await prisma.client.update({
    where: { id, userId: session.user.id },
    data: {
      ...body,
      organizationId: body.organizationId || undefined,
    },
  })
  return NextResponse.json(client)
})

export const DELETE = withAuth(async (_req: NextRequest, { params, session }) => {
  const { id } = await params
  await prisma.client.delete({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
})
