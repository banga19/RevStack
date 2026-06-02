import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json([])
    }

    const cohorts = await prisma.sokogatePilotCohort.findMany({
      include: { participants: true },
      orderBy: { startMonth: "asc" },
    })
    return NextResponse.json(cohorts)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const cohort = await prisma.sokogatePilotCohort.create({
      data: {
        name: body.name,
        type: body.type || "",
        count: body.count || 5,
        enrolled: body.enrolled || 0,
        startMonth: body.startMonth || "",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        status: body.status || "Planning",
        notes: body.notes || null,
      },
    })
    return NextResponse.json(cohort, { status: 201 })
  } catch (e) {
    console.error("Create cohort failed", e)
    return NextResponse.json({ error: "Failed to create cohort" }, { status: 500 })
  }
}
