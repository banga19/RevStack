import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const corridor = searchParams.get("corridor") || undefined
  const region = searchParams.get("region") || undefined

  const where: Record<string, any> = {}
  if (corridor) where.corridor = corridor
  if (region) where.region = region

  const clients = await prisma.client.findMany({
    where,
    select: { id: true, name: true, company: true, corridor: true, ersScore: true, tier: true, createdAt: true },
  })

  const exportReady = clients.filter((c) => (c.ersScore ?? 0) >= 80).length
  const avgErs = clients.length > 0 ? Math.round(clients.reduce((s, c) => s + (c.ersScore ?? 0), 0) / clients.length) : 0

  return NextResponse.json({
    corridor: corridor || "all",
    clients: clients.length,
    exportReady,
    avgErs,
    generatedAt: new Date().toISOString(),
  })
})
