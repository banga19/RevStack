import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const tasks = await prisma.planTask.findMany({ orderBy: { day: "asc" } })
    return NextResponse.json(tasks)
  } catch {
    return NextResponse.json([])
  }
}
