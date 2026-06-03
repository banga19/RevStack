import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSuggestionFromBudget } from "@/lib/pricing"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json([]) // Return empty array for unauthenticated
    }

    const clients = await prisma.client.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(clients)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // Get user's onboarding data to suggest tier and pricing if not provided
    let suggestedTier = "starter"
    let suggestedMonthlyRetainer = 50 // default starter price

    const onboarding = await prisma.onboardingResponse.findFirst({
      where: { userId: session.user.id, completed: true },
      orderBy: { createdAt: "desc" }
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
        // Use provided tier, or fallback to suggested tier from onboarding
        tier: body.tier || suggestedTier,
        // Use provided monthlyRetainer, or fallback to suggested monthly retainer
        // If provided as 0 or null, we still use the suggested one (assuming they want to use the plan pricing)
        monthlyRetainer: body.monthlyRetainer !== undefined && body.monthlyRetainer !== null
          ? parseFloat(body.monthlyRetainer)
          : suggestedMonthlyRetainer,
        setupFee: body.setupFee ? parseFloat(body.setupFee) : null,
        source: body.source || null,
        notes: body.notes || null,
        ersScore: body.ersScore ? parseInt(body.ersScore) : null,
        ersBreakdown: body.ersBreakdown || null,
        corridor: body.corridor || null,
        userId: session.user.id, // Assign to current user
      },
    })
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error("POST client error:", error)
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
  }
}
