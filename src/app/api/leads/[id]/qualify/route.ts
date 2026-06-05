import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { qualifyLead } from "@/lib/qualify-lead"

export const POST = withAuth(async (_req: NextRequest, { params, session }) => {
  const { id } = await params
  const existing = await prisma.lead.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { score, status, tier, breakdown } = qualifyLead(existing)

  const lead = await prisma.lead.update({
    where: { id },
    data: { qualificationScore: score, status, qualificationTier: tier, qualificationBreakdown: JSON.stringify(breakdown) },
  })

  await prisma.activity.create({
    data: {
      type: "lead_qualified",
      description: `Lead ${lead.companyName} ${status} (score: ${score}, tier: ${tier})`,
      entityType: "lead",
      entityId: lead.id,
      userId: session.user.id,
    },
  })

  return NextResponse.json({
    ...lead,
    qualificationTier: tier,
    qualificationBreakdown: breakdown,
  })
})
