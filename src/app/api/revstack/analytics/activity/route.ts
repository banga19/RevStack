import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") || "20")

  const activity = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return NextResponse.json(activity)
})
