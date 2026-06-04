import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const PUT = withAuth(async (request: Request, { params }) => {
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
})

export const DELETE = withAuth(async (request: Request, { params }) => {
  await prisma.sokogatePilotCohort.delete({ where: { id: (await params).id } })
  return NextResponse.json({ success: true })
})
