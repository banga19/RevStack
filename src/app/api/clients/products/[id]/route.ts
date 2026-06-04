import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { recalculateClientErs } from "@/lib/ers-scoring"

export const PUT = withAuth(async (req: NextRequest, { params, session }) => {
  const { id } = await params
  const body = await req.json()

  const existing = await prisma.clientProduct.findUnique({ where: { id }, include: { client: true } })
  if (!existing || existing.client.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const product = await prisma.clientProduct.update({
    where: { id },
    data: body,
  })

  await recalculateClientErs(product.clientId).catch((e) =>
    console.error("ERS recalculation failed after product update:", e)
  )

  return NextResponse.json(product)
})

export const DELETE = withAuth(async (_req: NextRequest, { params, session }) => {
  const { id } = await params

  const existing = await prisma.clientProduct.findUnique({ where: { id }, include: { client: true } })
  if (!existing || existing.client.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const product = await prisma.clientProduct.delete({ where: { id } })

  await recalculateClientErs(product.clientId).catch((e) =>
    console.error("ERS recalculation failed after product delete:", e)
  )

  return NextResponse.json({ success: true })
})
