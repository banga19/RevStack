import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // Stats
    const revenueEntries = await prisma.revenueEntry.findMany({ orderBy: { date: "asc" } })
    const clients = await prisma.client.findMany()
    const tasks = await prisma.planTask.findMany()
    const financialSnapshots = await prisma.financialSnapshot.findMany({ orderBy: { month: "asc" } })

    const totalRevenue = revenueEntries.reduce((sum, e) => sum + e.amount, 0)
    const lastMonthRevenue = revenueEntries
      .filter((e) => e.date >= new Date(new Date().setMonth(new Date().getMonth() - 1)))
      .reduce((sum, e) => sum + e.amount, 0)
    const activeClients = clients.filter((c) => c.status === "active" || c.status === "onboarding").length
    const pipelineValue = clients
      .filter((c) => c.status === "lead" || c.status === "qualified" || c.status === "proposal")
      .reduce((sum, c) => sum + (c.monthlyRetainer || 0) * 12, 0)
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === "completed").length
    const planProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const leadsGenerated = clients.filter((c) => c.status === "lead").length
    const outreachSent = await prisma.outreachCampaign.aggregate({ _sum: { sentCount: true } })

    // Revenue history from financial snapshots
    const revenueHistory = financialSnapshots.map((s) => ({
      month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][s.month - 1] || `M${s.month}`,
      revenue: s.revenue,
      costs: s.costs,
    }))

    // Pipeline by tier
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

    // Recent activity
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
  } catch (error) {
    console.error("Dashboard API error:", error)
    // Return empty data if DB not ready
    return NextResponse.json({
      stats: {
        totalRevenue: 0,
        monthlyRevenue: 0,
        activeClients: 0,
        totalClients: 0,
        pipelineValue: 0,
        planProgress: 0,
        totalTasks: 0,
        completedTasks: 0,
        leadsGenerated: 0,
        outreachSent: 0,
      },
      revenueHistory: [],
      pipelineByTier: [],
      recentActivity: [],
    })
  }
}
