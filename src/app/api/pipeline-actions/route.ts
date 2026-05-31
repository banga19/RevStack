import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("clientId")
    const where = clientId ? { clientId } : {}
    const actions = await prisma.pipelineAction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(actions)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const action = await prisma.pipelineAction.create({
      data: {
        clientId: body.clientId,
        type: body.type || "follow-up",
        note: body.note || null,
        status: body.status || "pending",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
    })
    return NextResponse.json(action, { status: 201 })
  } catch (error) {
    console.error("POST pipeline action error:", error)
    return NextResponse.json({ error: "Failed to create action" }, { status: 500 })
  }
}
