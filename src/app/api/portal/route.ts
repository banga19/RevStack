import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { getOrgScope } from "@/lib/get-org-scope"

export const GET = withAuth(async (_req, { session }) => {
  const userId = session.user.id as string
  const scope = await getOrgScope(userId)

  // Fetch org-scoped data (counts separately from list data for accurate metrics)
  const [
    userProfile,
    orgLeads,
    orgClients,
    orgMessages,
    orgMembers,
    leadCount,
    clientCount,
    orgActivity,
  ] = await Promise.all([
    // User profile with org
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        role: true,
        organizationId: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        trialEndsAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            createdAt: true,
          },
        },
      },
    }),

    // Org-scoped leads
    prisma.lead.findMany({
      where: scope.isAdmin
        ? {}
        : scope.organizationId
          ? { user: { organizationId: scope.organizationId } }
          : { userId: scope.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Org-scoped clients
    prisma.client.findMany({
      where: scope.isAdmin
        ? {}
        : scope.organizationId
          ? { organizationId: scope.organizationId }
          : { userId: scope.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Org-scoped messages
    prisma.message.count({
      where: scope.isAdmin
        ? {}
        : scope.organizationId
          ? { OR: [{ client: { organizationId: scope.organizationId } }, { lead: { user: { organizationId: scope.organizationId } } }] }
          : { lead: { userId: scope.userId } },
    }),

    // Org members
    prisma.user.findMany({
      where: scope.organizationId
        ? { organizationId: scope.organizationId }
        : { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),

    // Total lead count (accurate, not limited by take)
    prisma.lead.count({
      where: scope.isAdmin
        ? {}
        : scope.organizationId
          ? { user: { organizationId: scope.organizationId } }
          : { userId: scope.userId },
    }),

    // Total client count (accurate, not limited by take)
    prisma.client.count({
      where: scope.isAdmin
        ? {}
        : scope.organizationId
          ? { organizationId: scope.organizationId }
          : { userId: scope.userId },
    }),

    // Org-scoped activity (Note: activity model lacks organizationId, so scope by userId)
    prisma.activity.findMany({
      where: scope.isAdmin
        ? {}
        : { userId: scope.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({
      where: scope.organizationId
        ? { organizationId: scope.organizationId }
        : { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ])

  // Compute metrics
  const activeClients = orgClients.filter((c) => c.status === "active")
  const totalRetainers = orgClients.reduce((sum, c) => sum + (c.monthlyRetainer || 0), 0)
  const qualifiedLeads = orgLeads.filter(
    (l) => l.status === "qualified" || l.status === "converted"
  )

  // Recent invoices (org-scoped)
  const recentInvoices = await prisma.invoice.findMany({
    where: scope.isAdmin
      ? {}
      : scope.organizationId
        ? { client: { organizationId: scope.organizationId } }
        : { userId: scope.userId },
    orderBy: { issuedAt: "desc" },
    take: 5,
    include: {
      client: { select: { name: true, company: true } },
    },
  })

  return NextResponse.json({
    profile: {
      name: userProfile?.name,
      email: userProfile?.email,
      role: userProfile?.role,
      subscriptionStatus: userProfile?.subscriptionStatus,
      subscriptionTier: userProfile?.subscriptionTier,
      trialEndsAt: userProfile?.trialEndsAt?.toISOString(),
    },
    organization: userProfile?.organization || null,
    metrics: {
      totalLeads: leadCount,
      qualifiedLeads: qualifiedLeads.length,
      activeClients: activeClients.length,
      totalClients: clientCount,
      monthlyRecurringRevenue: totalRetainers,
      totalMessages: orgMessages,
      recentActivity: orgActivity.length,
    },
    recentLeads: orgLeads.slice(0, 5).map((l) => ({
      id: l.id,
      companyName: l.companyName,
      contactName: l.contactName,
      status: l.status,
      score: l.qualificationScore,
      tier: l.qualificationTier,
      createdAt: l.createdAt,
    })),
    recentClients: activeClients.slice(0, 5).map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      tier: c.tier,
      retainer: c.monthlyRetainer,
      createdAt: c.createdAt,
    })),
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amountUsd: inv.amountUsd,
      status: inv.status,
      dueDate: inv.dueDate.toISOString(),
      clientName: inv.client.name,
    })),
    teamMembers: orgMembers.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      image: m.image,
      joinedAt: m.createdAt,
    })),
    recentActivity: orgActivity.map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      entityType: a.entityType,
      createdAt: a.createdAt,
    })),
    scope: {
      organizationId: scope.organizationId,
      isAdmin: scope.isAdmin,
      memberCount: orgMembers.length,
    },
  })
})
