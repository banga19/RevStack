import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const tasks = await prisma.planTask.findMany({ orderBy: { day: "asc" } })
    return NextResponse.json(tasks)
  } catch {
    return NextResponse.json([])
  }
}
