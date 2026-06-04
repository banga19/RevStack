import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async () => {
  const tasks = await prisma.planTask.findMany({ orderBy: { day: "asc" } })
  return NextResponse.json(tasks)
})
