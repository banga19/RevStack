import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const app = await prisma.tradeFinanceApplication.update({
      where: { id },
      data: {
        ...body,
        amount: body.amount ? parseFloat(body.amount) : undefined,
        appliedAt: body.appliedAt ? new Date(body.appliedAt) : undefined,
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : undefined,
        disbursedAt: body.disbursedAt ? new Date(body.disbursedAt) : undefined,
      },
    })
    return NextResponse.json(app)
  } catch (error) {
    console.error("PUT trade finance error:", error)
    return NextResponse.json({ error: "Failed to update trade finance application" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.tradeFinanceApplication.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE trade finance error:", error)
    return NextResponse.json({ error: "Failed to delete trade finance application" }, { status: 500 })
  }
}
