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
    const cohort = await prisma.sokogatePilotCohort.update({
      where: { id: (await params).id },
      data: {
        name: body.name,
        type: body.type,
        count: body.count,
        enrolled: body.enrolled,
        startMonth: body.startMonth,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: body.status,
        notes: body.notes ?? null,
      },
    })
    return NextResponse.json(cohort)
  } catch (e) {
    console.error("Update cohort failed", e)
    return NextResponse.json({ error: "Failed to update cohort" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.sokogatePilotCohort.delete({ where: { id: (await params).id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Delete cohort failed", e)
    return NextResponse.json({ error: "Failed to delete cohort" }, { status: 500 })
  }
}
