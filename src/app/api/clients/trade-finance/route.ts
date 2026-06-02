import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("clientId")
    const where = clientId ? { clientId } : {}
    const apps = await prisma.tradeFinanceApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(apps)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const app = await prisma.tradeFinanceApplication.create({
      data: {
        clientId: body.clientId,
        program: body.program,
        amount: body.amount ? parseFloat(body.amount) : null,
        currency: body.currency || "USD",
        status: body.status || "draft",
        notes: body.notes || null,
        appliedAt: body.appliedAt ? new Date(body.appliedAt) : null,
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : null,
        disbursedAt: body.disbursedAt ? new Date(body.disbursedAt) : null,
      },
    })
    return NextResponse.json(app, { status: 201 })
  } catch (error) {
    console.error("POST trade finance error:", error)
    return NextResponse.json({ error: "Failed to create trade finance application" }, { status: 500 })
  }
}
