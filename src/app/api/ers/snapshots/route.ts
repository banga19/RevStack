import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json([])

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("clientId")
    const limit = parseInt(searchParams.get("limit") || "10")

    if (!clientId) return NextResponse.json([])

    // Only return snapshots for clients owned by the authenticated user
    const client = await prisma.client.findFirst({ where: { id: clientId, userId: session.user.id } })
    if (!client) return NextResponse.json([])

    const snapshots = await prisma.ersSnapshot.findMany({
      where: { clientId },
      orderBy: { snapshotDate: "desc" },
      take: Math.min(limit, 100),
      include: {
        client: { select: { name: true, company: true } },
      },
    })

    return NextResponse.json(snapshots)
  } catch {
    return NextResponse.json([])
  }
}
