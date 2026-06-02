import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const revenue = await prisma.revenueEntry.findMany({ orderBy: { date: "asc" } })
    const snapshots = await prisma.financialSnapshot.findMany({ orderBy: { month: "asc" } })
    const clients = await prisma.client.findMany()
    return NextResponse.json({ revenue, snapshots, clients })
  } catch {
    return NextResponse.json({ revenue: [], snapshots: [], clients: [] })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const entry = await prisma.revenueEntry.create({
      data: {
        date: new Date(body.date),
        clientName: body.clientName || null,
        amount: parseFloat(body.amount),
        type: body.type || "retainer",
        category: body.category || null,
        note: body.note || null,
      },
    })
    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error("POST revenue error:", error)
    return NextResponse.json({ error: "Failed to create revenue entry" }, { status: 500 })
  }
}
