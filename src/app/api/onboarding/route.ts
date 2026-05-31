import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    // Validate required fields
    if (!body.businessName || !body.industry || !body.primaryGoal) {
      return NextResponse.json(
        { error: "Business name, industry, and primary goal are required" },
        { status: 400 }
      )
    }

    const response = await prisma.onboardingResponse.create({
      data: {
        userId: session.user.id,
        businessName: body.businessName,
        industry: body.industry,
        companySize: body.companySize || null,
        primaryGoal: body.primaryGoal,
        secondaryGoals: body.secondaryGoals || null,
        currentChallenges: body.currentChallenges || null,
        targetAudience: body.targetAudience || null,
        servicesNeeded: body.servicesNeeded || null,
        budgetRange: body.budgetRange || null,
        timeline: body.timeline || null,
        referralSource: body.referralSource || null,
        additionalNotes: body.additionalNotes || null,
        completed: true,
      },
    })

    return NextResponse.json({ id: response.id, message: "Onboarding complete" }, { status: 201 })
  } catch (error) {
    console.error("Onboarding error:", error)
    return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const response = await prisma.onboardingResponse.findFirst({
      where: { userId: session.user.id, completed: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(response || { completed: false })
  } catch (error) {
    console.error("Onboarding GET error:", error)
    return NextResponse.json({ error: "Failed to fetch onboarding data" }, { status: 500 })
  }
}
