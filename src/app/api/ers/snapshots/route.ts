import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")
  const limit = parseInt(searchParams.get("limit") || "10")

  if (!clientId) return NextResponse.json([])

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
})
