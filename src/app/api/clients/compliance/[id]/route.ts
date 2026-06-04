import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { recalculateClientErs } from "@/lib/ers-scoring"

export const PUT = withAuth(async (req: NextRequest, { params, session }) => {
  const { id } = await params
  const body = await req.json()

  const existing = await prisma.clientCompliance.findUnique({ where: { id }, include: { client: true } })
  if (!existing || existing.client.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const record = await prisma.clientCompliance.update({
    where: { id },
    data: {
      ...body,
      appliedAt: body.appliedAt ? new Date(body.appliedAt) : undefined,
      obtainedAt: body.obtainedAt ? new Date(body.obtainedAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    },
  })

  await recalculateClientErs(record.clientId).catch((e) =>
    console.error("ERS recalculation failed after compliance update:", e)
  )

  return NextResponse.json(record)
})

export const DELETE = withAuth(async (_req: NextRequest, { params, session }) => {
  const { id } = await params

  const existing = await prisma.clientCompliance.findUnique({ where: { id }, include: { client: true } })
  if (!existing || existing.client.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const record = await prisma.clientCompliance.delete({ where: { id } })

  await recalculateClientErs(record.clientId).catch((e) =>
    console.error("ERS recalculation failed after compliance delete:", e)
  )

  return NextResponse.json({ success: true })
})
