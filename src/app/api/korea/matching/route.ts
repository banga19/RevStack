import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId") || undefined
  const origin = searchParams.get("origin") || undefined
  const destination = searchParams.get("destination") || undefined

  let clients: any[] = []
  if (clientId) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, company: true, corridor: true, ersScore: true, ersBreakdown: true, tier: true },
    })
    clients = client ? [client] : []
  } else {
    clients = await prisma.client.findMany({
      where: { OR: [{ corridor: { not: null } }, { ersScore: { not: null } }] },
      select: { id: true, name: true, company: true, corridor: true, ersScore: true, ersBreakdown: true, tier: true },
    })
  }

  const items = clients.map((client) => {
    const score = client.ersScore ?? 0
    const level = score >= 80 ? "export-ready" : score >= 50 ? "developing" : "needs-work"
    return {
      id: client.id,
      name: client.name,
      company: client.company,
      corridor: client.corridor,
      ersScore: score,
      readinessLevel: level,
      tier: client.tier,
    }
  })

  return NextResponse.json({
    items,
    filters: { clientId, origin, destination },
    generatedAt: new Date().toISOString(),
  })
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json().catch(() => ({}))
  const clientId = typeof body.clientId === "string" ? body.clientId : undefined
  const origin = typeof body.origin === "string" ? body.origin : undefined
  const destination = typeof body.destination === "string" ? body.destination : undefined

  if (!clientId && !origin && !destination) {
    return NextResponse.json({ error: "Provide clientId or origin/destination" }, { status: 400 })
  }

  const matches: any[] = []

  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }
    const score = client.ersScore ?? 0
    matches.push({
      clientId: client.id,
      clientName: client.name,
      corridor: client.corridor ?? "unassigned",
      ersScore: score,
      matchScore: score,
      recommendedBuyers: [
        "Korean Food Importers Association",
        "KOTRA Seoul Trading Corp",
        "Korea-Africa Trade Association",
      ],
      recommendedCorridors: [
        client.corridor ?? "afcfta-intra",
        "ke-korea",
        "afcfta-intra",
      ],
    })
  }

  return NextResponse.json({ matches, requestedAt: new Date().toISOString() })
})
