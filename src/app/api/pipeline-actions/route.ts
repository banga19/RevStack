import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest) => {
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
})

export const POST = withAuth(async (req: NextRequest) => {
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
})
