import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { recalculateClientErs } from "@/lib/ers-scoring"

export const GET = withAuth(async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")

  if (clientId) {
    const client = await prisma.client.findFirst({ where: { id: clientId, userId: session.user.id } })
    if (!client) return NextResponse.json([])
  }

  const where: Record<string, unknown> = clientId
    ? { clientId }
    : { client: { userId: session.user.id } }

  const records = await prisma.clientCompliance.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(records)
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()

  const client = await prisma.client.findFirst({ where: { id: body.clientId, userId: session.user.id } })
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  const record = await prisma.clientCompliance.create({
    data: {
      clientId: body.clientId,
      productId: body.productId || null,
      certificationType: body.certificationType,
      status: body.status || "not-started",
      issuer: body.issuer || null,
      notes: body.notes || null,
      appliedAt: body.appliedAt ? new Date(body.appliedAt) : null,
      obtainedAt: body.obtainedAt ? new Date(body.obtainedAt) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  })

  await recalculateClientErs(body.clientId).catch((e) =>
    console.error("ERS recalculation failed after compliance create:", e)
  )

  return NextResponse.json(record, { status: 201 })
})
