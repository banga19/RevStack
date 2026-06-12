import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest, { params }) => {
  const clientId = params.id as string
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 })
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, name: true, company: true, licenseProfile: true } })
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })
  return NextResponse.json({ id: client.id, name: client.name, company: client.company, licenseProfile: client.licenseProfile || {} })
})

export const PUT = withAuth(async (req: NextRequest, { params, session }) => {
  const clientId = params.id as string
  const body = await req.json().catch(() => ({}))
  const licenseProfile = typeof body.licenseProfile === "object" && body.licenseProfile !== null ? body.licenseProfile : undefined
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 })

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
    select: { id: true },
  })
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const data: Record<string, any> = {}
  if (typeof licenseProfile === "object") data.licenseProfile = licenseProfile

  const updated = await prisma.client.update({ where: { id: client.id }, data })
  return NextResponse.json({ id: updated.id, licenseProfile: updated.licenseProfile })
})
