import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const record = await prisma.clientCompliance.update({
      where: { id },
      data: {
        ...body,
        appliedAt: body.appliedAt ? new Date(body.appliedAt) : undefined,
        obtainedAt: body.obtainedAt ? new Date(body.obtainedAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
    })
    return NextResponse.json(record)
  } catch (error) {
    console.error("PUT compliance error:", error)
    return NextResponse.json({ error: "Failed to update compliance record" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.clientCompliance.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE compliance error:", error)
    return NextResponse.json({ error: "Failed to delete compliance record" }, { status: 500 })
  }
}
