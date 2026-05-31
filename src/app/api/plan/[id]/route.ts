import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const task = await prisma.planTask.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(task)
  } catch (error) {
    console.error("PUT plan task error:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}
