import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const PUT = withAuth(async (req: NextRequest, { params }) => {
  try {
    const { id } = await params
    const body = await req.json()
    const article = await prisma.contentArticle.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(article)
  } catch (error) {
    console.error("[Content] PUT error:", error)
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 })
  }
})

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const { id } = await params
    await prisma.contentArticle.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Content] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 })
  }
})
