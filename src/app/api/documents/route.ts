import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const documents = await prisma.document.findMany({ orderBy: { category: "asc" } })
    return NextResponse.json(documents)
  } catch {
    return NextResponse.json([])
  }
}
