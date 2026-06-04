import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async () => {
  const cohorts = await prisma.sokogatePilotCohort.findMany({
    include: { participants: true },
    orderBy: { startMonth: "asc" },
  })
  return NextResponse.json(cohorts)
})

export const POST = withAuth(async (request: Request) => {
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
})
