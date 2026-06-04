import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (_req, { session }) => {
  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
  })
  const clientIds = clients.map((c: { id: string }) => c.id)
  const revenueEntries = await prisma.revenueEntry.findMany({
    where: { clientId: { in: clientIds } },
    orderBy: { date: "asc" },
  })
  const tasks = await prisma.planTask.findMany()
  const financialSnapshots = await prisma.financialSnapshot.findMany({
    orderBy: { month: "asc" },
  })

  const totalRevenue = revenueEntries.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0)
  const lastMonthRevenue = revenueEntries
    .filter((e: { date: Date }) => e.date >= new Date(new Date().setMonth(new Date().getMonth() - 1)))
    .reduce((sum: number, e: { amount: number }) => sum + e.amount, 0)
  const activeClients = clients.filter((c: { status: string }) => c.status === "active" || c.status === "onboarding").length
  const pipelineValue = clients
    .filter((c: { status: string }) => c.status === "lead" || c.status === "qualified" || c.status === "proposal")
    .reduce((sum: number, c: { monthlyRetainer: number | null }) => sum + (c.monthlyRetainer || 0) * 12, 0)
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t: { status: string }) => t.status === "completed").length
  const planProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const leadsGenerated = clients.filter((c: { status: string }) => c.status === "lead").length
  const outreachSent = await prisma.outreachCampaign.aggregate({
    _sum: { sentCount: true },
    where: { clientId: { in: clientIds } },
  })

  const revenueHistory = financialSnapshots.map((s: { month: number; revenue: number; costs: number }) => ({
    month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][s.month - 1] || `M${s.month}`,
    revenue: s.revenue,
    costs: s.costs,
  }))

  const tierMap = new Map<string, { value: number; count: number }>()
  for (const c of clients) {
    const tier = c.tier || "unknown"
    const current = tierMap.get(tier) || { value: 0, count: 0 }
    tierMap.set(tier, {
      value: current.value + (c.monthlyRetainer || 0) * 12,
      count: current.count + 1,
    })
  }
  const pipelineByTier = Array.from(tierMap.entries()).map(([tier, data]) => ({ tier, ...data }))

  const recentActivity: { id: string; type: string; message: string; time: string }[] = []

  const recentRevenue = revenueEntries.slice(-3).reverse()
  for (const r of recentRevenue) {
    recentActivity.push({
      id: `rev-${r.id}`,
      type: "revenue",
      message: `${r.type === "setup-fee" ? "Setup fee" : "Retainer"} of $${r.amount} from ${r.clientName || "unknown"}`,
      time: r.date.toLocaleDateString(),
    })
  }

  const recentClients = clients.slice(-3).reverse()
  for (const c of recentClients) {
    recentActivity.push({
      id: `client-${c.id}`,
      type: "client",
      message: `Client ${c.name} moved to "${c.status}"`,
      time: c.updatedAt.toLocaleDateString(),
    })
  }

  return NextResponse.json({
    stats: {
      totalRevenue,
      monthlyRevenue: lastMonthRevenue || totalRevenue,
      activeClients,
      totalClients: clients.length,
      pipelineValue,
      planProgress,
      totalTasks,
      completedTasks,
      leadsGenerated,
      outreachSent: outreachSent._sum.sentCount || 0,
    },
    revenueHistory,
    pipelineByTier,
    recentActivity,
  })
})
