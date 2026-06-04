import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (_req, { session }) => {
  const userId = session.user.id as string

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  })

  if (!user) {
    return NextResponse.json({ organizations: [] })
  }

  const organizations = user.organization
    ? [user.organization]
    : []

  return NextResponse.json({
    organizations,
    activeOrgId: user.organizationId,
  })
})
