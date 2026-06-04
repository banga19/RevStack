import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async () => {
  const articles = await prisma.contentArticle.findMany({ orderBy: { week: "asc" } })
  return NextResponse.json(articles)
})

export const POST = withAuth(async (req: NextRequest) => {
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
})
