import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (_req, { session }) => {
  const leads = await prisma.lead.findMany({ where: { userId: session.user.id } })

  return NextResponse.json({
    new: leads.filter((l) => l.status === "new").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    disqualified: leads.filter((l) => l.status === "disqualified").length,
    converted: leads.filter((l) => l.status === "converted").length,
  })
})
