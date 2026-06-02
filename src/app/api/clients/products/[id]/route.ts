import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { recalculateClientErs } from "@/lib/ers-scoring"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    // Verify the product belongs to a client owned by the user
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
  } catch (error) {
    console.error("PUT product error:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify the product belongs to a client owned by the user
    const existing = await prisma.clientProduct.findUnique({ where: { id }, include: { client: true } })
    if (!existing || existing.client.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const product = await prisma.clientProduct.delete({ where: { id } })

    await recalculateClientErs(product.clientId).catch((e) =>
      console.error("ERS recalculation failed after product delete:", e)
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE product error:", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
