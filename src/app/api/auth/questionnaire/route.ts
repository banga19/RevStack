import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { appendQuestionnaireRow } from "@/lib/google-sheets"

// POST — Submit a pre-auth questionnaire (before user is authenticated)
// Stays public since it's used pre-authentication
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

    const existing = await prisma.preAuthQuestionnaire.findUnique({
      where: { tempId },
    })

    if (existing) {
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

      appendQuestionnaireRow({
        tempId: updated.tempId,
        userId: updated.userId ?? undefined,
        whatBringsYou: updated.whatBringsYou ?? undefined,
        businessType: updated.businessType ?? undefined,
        industry: updated.industry ?? undefined,
        companySize: updated.companySize ?? undefined,
        role: updated.role ?? undefined,
        primaryGoal: updated.primaryGoal,
        biggestChallenge: updated.biggestChallenge ?? undefined,
        servicesInterest: updated.servicesInterest ?? undefined,
        timeline: updated.timeline ?? undefined,
        budgetRange: updated.budgetRange ?? undefined,
        howDidYouHear: updated.howDidYouHear ?? undefined,
        completed: updated.completed,
        createdAt: updated.createdAt.toISOString(),
      }).catch((err) => {
        console.error("Google Sheets questionnaire update append error:", err)
      })

      return NextResponse.json({ id: updated.id, tempId }, { status: 200 })
    }

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

    appendQuestionnaireRow({
      tempId: created.tempId,
      userId: created.userId ?? undefined,
      whatBringsYou: created.whatBringsYou ?? undefined,
      businessType: created.businessType ?? undefined,
      industry: created.industry ?? undefined,
      companySize: created.companySize ?? undefined,
      role: created.role ?? undefined,
      primaryGoal: created.primaryGoal,
      biggestChallenge: created.biggestChallenge ?? undefined,
      servicesInterest: created.servicesInterest ?? undefined,
      timeline: created.timeline ?? undefined,
      budgetRange: created.budgetRange ?? undefined,
      howDidYouHear: created.howDidYouHear ?? undefined,
      completed: created.completed,
      createdAt: created.createdAt.toISOString(),
    }).catch((err) => {
      console.error("Google Sheets questionnaire append error:", err)
    })

    return NextResponse.json({ id: created.id, tempId }, { status: 201 })
  } catch (error) {
    console.error("Questionnaire submit error:", error)
    return NextResponse.json({ error: "Failed to save questionnaire" }, { status: 500 })
  }
}

// PUT — Link a pre-auth questionnaire to an authenticated user
export const PUT = withAuth(async (req: NextRequest, { session }) => {
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

  await prisma.preAuthQuestionnaire.update({
    where: { tempId },
    data: {
      userId: session.user.id,
      linkedAfterAuth: true,
    },
  })

  return NextResponse.json({ message: "Questionnaire linked to user" }, { status: 200 })
})

// GET — Get questionnaire for the current user
export const GET = withAuth(async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)
  const tempId = searchParams.get("tempId")

  if (session?.user?.id) {
    const questionnaire = await prisma.preAuthQuestionnaire.findFirst({
      where: { userId: session.user.id, completed: true },
      orderBy: { createdAt: "desc" },
    })

    if (questionnaire) {
      return NextResponse.json(questionnaire)
    }
  }

  if (tempId) {
    const questionnaire = await prisma.preAuthQuestionnaire.findUnique({
      where: { tempId },
    })
    if (questionnaire) {
      return NextResponse.json(questionnaire)
    }
  }

  return NextResponse.json({ completed: false })
})
