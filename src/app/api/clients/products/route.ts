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

  const where = clientId
    ? { clientId }
    : { client: { userId: session.user.id } }

  const products = await prisma.clientProduct.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(products)
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()

  const client = await prisma.client.findFirst({ where: { id: body.clientId, userId: session.user.id } })
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  const product = await prisma.clientProduct.create({
    data: {
      clientId: body.clientId,
      name: body.name,
      category: body.category || null,
      description: body.description || null,
      certifications: body.certifications || null,
      exportVolume: body.exportVolume || null,
      unit: body.unit || null,
      pricing: body.pricing || null,
    },
  })

  await recalculateClientErs(body.clientId).catch((e) =>
    console.error("ERS recalculation failed after product create:", e)
  )

  return NextResponse.json(product, { status: 201 })
})
