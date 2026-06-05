import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (_req: NextRequest, { params, session }) => {
  const { id } = await params
  const lead = await prisma.lead.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(lead)
})

export const PATCH = withAuth(async (req: NextRequest, { params, session }) => {
  const { id } = await params
  const body = await req.json()
  const lead = await prisma.lead.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(body.companyName !== undefined && { companyName: body.companyName }),
      ...(body.contactName !== undefined && { contactName: body.contactName }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp }),
      ...(body.industry !== undefined && { industry: body.industry }),
      ...(body.country !== undefined && { country: body.country }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.source !== undefined && { source: body.source }),
    },
  })
  if (lead.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const updated = await prisma.lead.findUnique({ where: { id } })
  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (_req: NextRequest, { params, session }) => {
  const { id } = await params
  await prisma.lead.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
})
