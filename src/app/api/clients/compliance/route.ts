import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { recalculateClientErs } from "@/lib/ers-scoring"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json([])

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("clientId")

    // Only return compliance records for clients owned by the authenticated user
    if (clientId) {
      // Verify client belongs to user
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
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // Verify client belongs to user
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

    // Auto-recalculate ERS score for the client
    await recalculateClientErs(body.clientId).catch((e) =>
      console.error("ERS recalculation failed after compliance create:", e)
    )

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error("POST compliance error:", error)
    return NextResponse.json({ error: "Failed to create compliance record" }, { status: 500 })
  }
}
