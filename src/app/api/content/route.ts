import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const articles = await prisma.contentArticle.findMany({ orderBy: { week: "asc" } })
    return NextResponse.json(articles)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const article = await prisma.contentArticle.create({
      data: {
        title: body.title,
        keyword: body.keyword || null,
        description: body.description || null,
        status: body.status || "idea",
        week: body.week ? parseInt(body.week) : null,
        month: body.month ? parseInt(body.month) : null,
        wordCount: body.wordCount ? parseInt(body.wordCount) : null,
      },
    })
    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error("POST content error:", error)
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 })
  }
}
