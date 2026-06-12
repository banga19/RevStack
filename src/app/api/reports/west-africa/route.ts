import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const country = searchParams.get("country") || undefined

  const where: Record<string, any> = {}
  if (country) where.country = country

  const partners = await prisma.partner.findMany({
    where,
    select: { id: true, companyName: true, country: true, region: true, tier: true, createdAt: true },
  })

  return NextResponse.json({
    country: country || "all",
    partners: partners.length,
    items: partners.map((p) => ({
      id: p.id,
      companyName: p.companyName,
      country: p.country,
      region: p.region,
      tier: p.tier,
    })),
    generatedAt: new Date().toISOString(),
  })
})
