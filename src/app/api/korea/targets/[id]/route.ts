import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const target = await prisma.koreanCorporateTarget.update({
      where: { id: (await params).id },
      data: {
        company: body.company,
        tier: body.tier,
        focus: body.focus,
        status: body.status,
        stage: body.stage,
        contactName: body.contactName ?? null,
        contactTitle: body.contactTitle ?? null,
        contactEmail: body.contactEmail ?? null,
        notes: body.notes ?? null,
      },
    })
    return NextResponse.json(target)
  } catch (e) {
    console.error("Update target failed", e)
    return NextResponse.json({ error: "Failed to update target" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.koreanCorporateTarget.delete({ where: { id: (await params).id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Delete target failed", e)
    return NextResponse.json({ error: "Failed to delete target" }, { status: 500 })
  }
}
