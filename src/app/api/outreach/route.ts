import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const campaigns = await prisma.outreachCampaign.findMany({ orderBy: { createdAt: "desc" } })
    return NextResponse.json(campaigns)
  } catch {
    return NextResponse.json([])
  }
}
