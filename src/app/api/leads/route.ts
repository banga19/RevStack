import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { appendLeadRow } from "@/lib/google-sheets"

export const GET = withAuth(async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  const where: any = { userId: session.user.id }
  if (status) where.status = status
  if (search) {
    where.OR = [
      { companyName: { contains: search } },
      { contactName: { contains: search } },
      { email: { contains: search } },
    ]
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(leads)
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()
  const lead = await prisma.lead.create({
    data: {
      companyName: body.companyName,
      contactName: body.contactName,
      email: body.email,
      phone: body.phone || null,
      whatsapp: body.whatsapp || null,
      industry: body.industry || null,
      country: body.country || null,
      notes: body.notes || null,
      source: body.source || null,
      userId: session.user.id,
    },
  })

  // Save to Google Sheets for admin review
  appendLeadRow({
    id: lead.id,
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    industry: lead.industry,
    country: lead.country,
    notes: lead.notes,
    source: lead.source,
    userId: lead.userId,
    createdAt: lead.createdAt.toISOString(),
  }).catch((err) => {
    console.error("Google Sheets lead append error:", err)
  })

  await prisma.activity.create({
    data: {
      type: "lead_created",
      description: `Lead ${lead.companyName} created`,
      entityType: "lead",
      entityId: lead.id,
      userId: session.user.id,
    },
  })
  return NextResponse.json(lead, { status: 201 })
})
