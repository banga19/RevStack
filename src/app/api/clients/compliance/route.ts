import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("clientId")
    const where = clientId ? { clientId } : {}
    const records = await prisma.clientCompliance.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(records)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
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
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error("POST compliance error:", error)
    return NextResponse.json({ error: "Failed to create compliance record" }, { status: 500 })
  }
}
