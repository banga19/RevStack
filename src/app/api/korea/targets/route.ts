import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json([])
    }

    const targets = await prisma.koreanCorporateTarget.findMany({
      orderBy: { updatedAt: "desc" },
    })
    return NextResponse.json(targets)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
  } catch (e) {
    console.error("Create target failed", e)
    return NextResponse.json({ error: "Failed to create target" }, { status: 500 })
  }
}
