import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const clients = await prisma.client.findMany({ orderBy: { createdAt: "desc" } })
    return NextResponse.json(clients)
  } catch {
    return NextResponse.json([])
  }
}
