import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)
  const months = parseInt(searchParams.get("months") || "6")

  const retainers = await prisma.retainer.findMany({
    where: { userId: session.user.id, status: "active" },
  })
  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
  })

  const result = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" })

    const newClients = clients.filter((c) => {
      const cd = new Date(c.createdAt)
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth()
    }).length

    const revenue = retainers.reduce((sum, r) => {
      const start = new Date(r.startDate)
      if (start <= d) {
        if (r.billingCycle === "monthly") return sum + r.amountUsd
        if (r.billingCycle === "quarterly") return sum + r.amountUsd / 3
        if (r.billingCycle === "annual") return sum + r.amountUsd / 12
      }
      return sum
    }, 0)

    result.push({
      month: label,
      revenue: Math.round(revenue * 100) / 100,
      newClients,
    })
  }

  return NextResponse.json(result)
})
