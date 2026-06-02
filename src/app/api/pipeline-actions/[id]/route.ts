import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = await req.json()
    const action = await prisma.pipelineAction.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(action)
  } catch (error) {
    console.error("PUT pipeline action error:", error)
    return NextResponse.json({ error: "Failed to update action" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await params
    await prisma.pipelineAction.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE pipeline action error:", error)
    return NextResponse.json({ error: "Failed to delete action" }, { status: 500 })
  }
}
