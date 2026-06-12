import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { getOrgScope } from "@/lib/get-org-scope"

export const GET = withAuth(async (req: NextRequest, { session }) => {
  const userId = session.user.id as string
  const scope = await getOrgScope(userId)

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 50)
  const offset = Number(url.searchParams.get("offset")) || 0

  const where = scope.isAdmin
    ? {}
    : scope.organizationId
      ? { client: { organizationId: scope.organizationId } }
      : { userId: scope.userId }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        client: { select: { name: true, company: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ])

  return NextResponse.json({
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amountUsd: inv.amountUsd,
      currency: inv.currency,
      status: inv.status,
      dueDate: inv.dueDate.toISOString(),
      paidAt: inv.paidAt?.toISOString() || null,
      clientName: inv.client?.name || inv.client?.company || "Unknown",
      issuedAt: inv.issuedAt.toISOString(),
    })),
    total,
    limit,
    offset,
  })
})
