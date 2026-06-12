import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async () => {
  try {
    const articles = await prisma.contentArticle.findMany({ orderBy: { week: "asc" } })
    return NextResponse.json(articles)
  } catch (error) {
    console.error("[Content] GET error:", error)
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 })
  }
})

export const POST = withAuth(async (req: NextRequest) => {
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
    console.error("[Content] POST error:", error)
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 })
  }
})
