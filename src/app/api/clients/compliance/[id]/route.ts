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

    // Verify the record belongs to a client owned by the user
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
  } catch (error) {
    console.error("PUT compliance error:", error)
    return NextResponse.json({ error: "Failed to update compliance record" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Verify the record belongs to a client owned by the user
    const existing = await prisma.clientCompliance.findUnique({ where: { id }, include: { client: true } })
    if (!existing || existing.client.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const record = await prisma.clientCompliance.delete({ where: { id } })

    await recalculateClientErs(record.clientId).catch((e) =>
      console.error("ERS recalculation failed after compliance delete:", e)
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE compliance error:", error)
    return NextResponse.json({ error: "Failed to delete compliance record" }, { status: 500 })
  }
}
