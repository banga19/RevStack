import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { getSuggestionFromBudget } from "@/lib/pricing"

export const GET = withAuth(async (_req, { session }) => {
  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(clients)
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()

  let suggestedTier = "starter"
  let suggestedMonthlyRetainer = 50

  const onboarding = await prisma.onboardingResponse.findFirst({
    where: { userId: session.user.id, completed: true },
    orderBy: { createdAt: "desc" },
  })

  if (onboarding?.budgetRange) {
    const suggestion = getSuggestionFromBudget(onboarding.budgetRange)
    suggestedTier = suggestion.tier
    suggestedMonthlyRetainer = suggestion.monthlyPrice
  }

  const client = await prisma.client.create({
    data: {
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone || null,
      status: body.status || "lead",
      tier: body.tier || suggestedTier,
      monthlyRetainer:
        body.monthlyRetainer !== undefined && body.monthlyRetainer !== null
          ? parseFloat(body.monthlyRetainer)
          : suggestedMonthlyRetainer,
      setupFee: body.setupFee ? parseFloat(body.setupFee) : null,
      source: body.source || null,
      notes: body.notes || null,
      ersScore: body.ersScore ? parseInt(body.ersScore) : null,
      ersBreakdown: body.ersBreakdown || null,
      corridor: body.corridor || null,
      userId: session.user.id,
    },
  })
  return NextResponse.json(client, { status: 201 })
})
