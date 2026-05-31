import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const client = await prisma.client.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(client)
  } catch (error) {
    console.error("PUT client error:", error)
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.client.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE client error:", error)
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 })
  }
}
