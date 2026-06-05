import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const GET = withAuth(async (_req, { session }) => {
  // Scope queries to the current user's data
  const userLeads = prisma.lead.findMany({ where: { userId: session.user.id } })
  const userClients = prisma.client.findMany({ where: { userId: session.user.id } })
  const userActiveRetainers = prisma.retainer.findMany({ where: { userId: session.user.id, status: "active" } })
  const userHermesRuns = prisma.hermesRun.findMany({ where: { userId: session.user.id } })

  // Followups and messages are scoped via user's leads and clients
  const userLeadIds = (await prisma.lead.findMany({ where: { userId: session.user.id }, select: { id: true } })).map((l) => l.id)
  const userClientIds = (await prisma.client.findMany({ where: { userId: session.user.id }, select: { id: true } })).map((c) => c.id)

  const [leads, clients, activeRetainers, pendingFollowups, messages, hermesRuns] = await Promise.all([
    userLeads,
    userClients,
    userActiveRetainers,
    prisma.followup.findMany({
      where: {
        status: "pending",
        OR: [
          { leadId: { in: userLeadIds } },
          { clientId: { in: userClientIds } },
        ],
      },
    }),
    prisma.message.findMany({
      where: {
        OR: [
          { leadId: { in: userLeadIds } },
          { clientId: { in: userClientIds } },
        ],
      },
    }),
    userHermesRuns,
  ])

  const totalLeads = leads.length
  const qualifiedLeads = leads.filter((l) => l.status === "qualified").length
  const activeClients = clients.filter((c) => c.status === "active" || c.status === "onboarding").length

  // Calculate MRR from retainers
  const mrr = activeRetainers.reduce((sum, r) => {
    if (r.billingCycle === "monthly") return sum + r.amountUsd
    if (r.billingCycle === "quarterly") return sum + r.amountUsd / 3
    if (r.billingCycle === "annual") return sum + r.amountUsd / 12
    return sum
  }, 0)

  const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const hermesRunsToday = hermesRuns.filter((r) => new Date(r.createdAt) >= today).length

  return NextResponse.json({
    totalLeads,
    qualifiedLeads,
    activeClients,
    monthlyRecurringRevenue: Math.round(mrr * 100) / 100,
    pendingFollowups: pendingFollowups.length,
    conversionRate: Math.round(conversionRate * 10) / 10,
    totalMessages: messages.length,
    hermesRunsToday,
  })
})
