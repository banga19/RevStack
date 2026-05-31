import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const product = await prisma.clientProduct.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(product)
  } catch (error) {
    console.error("PUT product error:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.clientProduct.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE product error:", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
