import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const revenue = await prisma.revenueEntry.findMany({ orderBy: { date: "asc" } })
    const snapshots = await prisma.financialSnapshot.findMany({ orderBy: { month: "asc" } })
    const clients = await prisma.client.findMany()
    return NextResponse.json({ revenue, snapshots, clients })
  } catch {
    return NextResponse.json({ revenue: [], snapshots: [], clients: [] })
  }
}
