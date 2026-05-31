import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("clientId")
    const where = clientId ? { clientId } : {}
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
    const body = await req.json()
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
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("POST product error:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
