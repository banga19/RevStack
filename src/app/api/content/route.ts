import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const articles = await prisma.contentArticle.findMany({ orderBy: { week: "asc" } })
    return NextResponse.json(articles)
  } catch {
    return NextResponse.json([])
  }
}
