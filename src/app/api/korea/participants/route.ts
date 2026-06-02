import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json([])
    }

    const participants = await prisma.sokogatePilotParticipant.findMany({
      include: { cohort: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(participants)
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

    // Create participant and update cohort enrolled count
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

    // Update cohort enrolled count
    await prisma.sokogatePilotCohort.update({
      where: { id: body.cohortId },
      data: { enrolled: { increment: 1 } },
    })

    return NextResponse.json(participant, { status: 201 })
  } catch (e) {
    console.error("Create participant failed", e)
    return NextResponse.json({ error: "Failed to create participant" }, { status: 500 })
  }
}
