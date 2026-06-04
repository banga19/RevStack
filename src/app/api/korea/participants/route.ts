import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async () => {
  const participants = await prisma.sokogatePilotParticipant.findMany({
    include: { cohort: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(participants)
})

export const POST = withAuth(async (request: Request) => {
  const body = await request.json()

  const participant = await prisma.sokogatePilotParticipant.create({
    data: {
      cohortId: body.cohortId,
      companyName: body.companyName,
      contactName: body.contactName || null,
      contactEmail: body.contactEmail || null,
      country: body.country || null,
      commodity: body.commodity || null,
      trialStartedAt: body.trialStartedAt ? new Date(body.trialStartedAt) : null,
      trialEndsAt: body.trialEndsAt ? new Date(body.trialEndsAt) : null,
      status: body.status || "invited",
      notes: body.notes || null,
    },
  })

  await prisma.sokogatePilotCohort.update({
    where: { id: body.cohortId },
    data: { enrolled: { increment: 1 } },
  })

  return NextResponse.json(participant, { status: 201 })
})
