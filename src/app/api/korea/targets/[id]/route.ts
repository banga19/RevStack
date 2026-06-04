import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const PUT = withAuth(async (request: Request, { params }) => {
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
})

export const DELETE = withAuth(async (request: Request, { params }) => {
  await prisma.koreanCorporateTarget.delete({ where: { id: (await params).id } })
  return NextResponse.json({ success: true })
})
