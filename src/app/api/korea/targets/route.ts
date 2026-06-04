import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async () => {
  const targets = await prisma.koreanCorporateTarget.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(targets)
})

export const POST = withAuth(async (request: Request, { session }) => {
  const body = await request.json()
  const target = await prisma.koreanCorporateTarget.create({
    data: {
      company: body.company,
      tier: body.tier || "Mid-Sized Manufacturer",
      focus: body.focus || "",
      status: body.status || "Identified",
      stage: body.stage || "Researching",
      contactName: body.contactName || null,
      contactTitle: body.contactTitle || null,
      contactEmail: body.contactEmail || null,
      notes: body.notes || null,
      userId: session.user.id,
    },
  })
  return NextResponse.json(target, { status: 201 })
})
