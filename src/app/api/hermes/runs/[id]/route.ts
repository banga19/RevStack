import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  const { id } = await params
  const run = await prisma.hermesRun.findUnique({ where: { id } })
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(run)
})
