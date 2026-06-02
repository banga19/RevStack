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

    // Only return products for clients owned by the authenticated user
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

    // Auto-recalculate ERS score for the client
    await recalculateClientErs(body.clientId).catch((e) =>
      console.error("ERS recalculation failed after product create:", e)
    )

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("POST product error:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
