import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.revenueEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE revenue error:", error)
    return NextResponse.json({ error: "Failed to delete revenue entry" }, { status: 500 })
  }
}
