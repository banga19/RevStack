import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url)
  const organizationId = url.searchParams.get("organizationId") || undefined
  if (!organizationId) return NextResponse.json({ error: "organizationId required" }, { status: 400 })

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, branding: true },
  })

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 })

  return NextResponse.json({ organizationId: org.id, branding: org.branding || {} })
})

export const PUT = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json().catch(() => ({}))
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : undefined
  const branding = typeof body.branding === "object" && body.branding !== null ? body.branding : {}

  if (!organizationId) return NextResponse.json({ error: "organizationId required" }, { status: 400 })

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: { branding },
    select: { id: true, branding: true },
  })

  return NextResponse.json({ organizationId: org.id, branding: org.branding })
})
