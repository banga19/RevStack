import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Submit a pre-auth questionnaire (before user is authenticated)
// Uses a tempId to identify the submission; after auth, link to user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tempId, ...questionnaireData } = body

    if (!tempId) {
      return NextResponse.json({ error: "Temporary session ID is required" }, { status: 400 })
    }

    if (!questionnaireData.primaryGoal) {
      return NextResponse.json({ error: "Primary goal is required" }, { status: 400 })
    }

    // Check if this tempId already exists
    const existing = await prisma.preAuthQuestionnaire.findUnique({
      where: { tempId },
    })

    if (existing) {
      // Update existing
      const updated = await prisma.preAuthQuestionnaire.update({
        where: { tempId },
        data: {
          whatBringsYou: questionnaireData.whatBringsYou || null,
          businessType: questionnaireData.businessType || null,
          industry: questionnaireData.industry || null,
          companySize: questionnaireData.companySize || null,
          role: questionnaireData.role || null,
          primaryGoal: questionnaireData.primaryGoal,
          biggestChallenge: questionnaireData.biggestChallenge || null,
          servicesInterest: questionnaireData.servicesInterest || null,
          timeline: questionnaireData.timeline || null,
          budgetRange: questionnaireData.budgetRange || null,
          howDidYouHear: questionnaireData.howDidYouHear || null,
          completed: questionnaireData.completed || false,
        },
      })
      return NextResponse.json({ id: updated.id, tempId }, { status: 200 })
    }

    // Create new
    const created = await prisma.preAuthQuestionnaire.create({
      data: {
        tempId,
        whatBringsYou: questionnaireData.whatBringsYou || null,
        businessType: questionnaireData.businessType || null,
        industry: questionnaireData.industry || null,
        companySize: questionnaireData.companySize || null,
        role: questionnaireData.role || null,
        primaryGoal: questionnaireData.primaryGoal,
        biggestChallenge: questionnaireData.biggestChallenge || null,
        servicesInterest: questionnaireData.servicesInterest || null,
        timeline: questionnaireData.timeline || null,
        budgetRange: questionnaireData.budgetRange || null,
        howDidYouHear: questionnaireData.howDidYouHear || null,
        completed: questionnaireData.completed || false,
      },
    })

    return NextResponse.json({ id: created.id, tempId }, { status: 201 })
  } catch (error) {
    console.error("Questionnaire submit error:", error)
    return NextResponse.json({ error: "Failed to save questionnaire" }, { status: 500 })
  }
}

// Link a pre-auth questionnaire to an authenticated user
// Called after Google SSO or email/password signup completes
export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { tempId } = body

    if (!tempId) {
      return NextResponse.json({ error: "Temporary session ID is required" }, { status: 400 })
    }

    const questionnaire = await prisma.preAuthQuestionnaire.findUnique({
      where: { tempId },
    })

    if (!questionnaire) {
      return NextResponse.json({ error: "Questionnaire not found" }, { status: 404 })
    }

    if (questionnaire.linkedAfterAuth) {
      return NextResponse.json({ message: "Already linked" }, { status: 200 })
    }

    // Link to user
    await prisma.preAuthQuestionnaire.update({
      where: { tempId },
      data: {
        userId: session.user.id,
        linkedAfterAuth: true,
      },
    })

    return NextResponse.json({ message: "Questionnaire linked to user" }, { status: 200 })
  } catch (error) {
    console.error("Questionnaire link error:", error)
    return NextResponse.json({ error: "Failed to link questionnaire" }, { status: 500 })
  }
}

// Get questionnaire for the current user (by userId or tempId)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)
    const tempId = searchParams.get("tempId")

    // If authenticated, get questionnaire for this user
    if (session?.user?.id) {
      const questionnaire = await prisma.preAuthQuestionnaire.findFirst({
        where: { userId: session.user.id, completed: true },
        orderBy: { createdAt: "desc" },
      })

      if (questionnaire) {
        return NextResponse.json(questionnaire)
      }
    }

    // Fall back to tempId lookup
    if (tempId) {
      const questionnaire = await prisma.preAuthQuestionnaire.findUnique({
        where: { tempId },
      })
      if (questionnaire) {
        return NextResponse.json(questionnaire)
      }
    }

    return NextResponse.json({ completed: false })
  } catch (error) {
    console.error("Questionnaire GET error:", error)
    return NextResponse.json({ error: "Failed to fetch questionnaire" }, { status: 500 })
  }
}
