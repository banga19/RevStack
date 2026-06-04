import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { processFollowUps, triggerFollowUpForUser } from "@/lib/subscription-followups"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"

/**
 * Admin Data API — powers the admin dashboard
 *
 * GET:  Returns payments, trial users, and follow-up log data
 * POST: Manually trigger follow-ups for a specific user
 */

export const GET = withAbac(RESOURCES.admin, "read", async () => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, email: true } },
      },
    })

    const trialUsers = await prisma.user.findMany({
      where: {
        OR: [
          { subscriptionStatus: "trial" },
          { subscriptionStatus: "expired" },
        ],
      },
      orderBy: { trialEndsAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        trialStartsAt: true,
        trialEndsAt: true,
        createdAt: true,
        _count: { select: { followUpLogs: true, payments: true } },
      },
    })

    const followUpLogs = await prisma.followUpLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
      },
    })

    const auditLogs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    const totalPayments = await prisma.payment.count()
    const successfulPayments = await prisma.payment.count({ where: { status: "success" } })
    const totalRevenue = await prisma.revenueEntry.aggregate({ _sum: { amount: true } })
    const totalUsers = await prisma.user.count()
    const activeSubscriptions = await prisma.user.count({ where: { subscriptionStatus: "active" } })

    return NextResponse.json({
      stats: {
        totalUsers,
        activeSubscriptions,
        trialUsers: trialUsers.length,
        totalPayments,
        successfulPayments,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        method: p.paymentMethod,
        status: p.status,
        tier: p.tier,
        plan: p.plan,
        user: p.user,
        createdAt: p.createdAt.toISOString(),
      })),
      trialUsers: trialUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.subscriptionStatus,
        tier: u.subscriptionTier,
        trialStartsAt: u.trialStartsAt?.toISOString() || null,
        trialEndsAt: u.trialEndsAt?.toISOString() || null,
        createdAt: u.createdAt.toISOString(),
        followUpCount: u._count.followUpLogs,
        paymentCount: u._count.payments,
      })),
      followUpLogs: followUpLogs.map((l) => ({
        id: l.id,
        user: l.user,
        type: l.type,
        stage: l.stage,
        sentAt: l.sentAt.toISOString(),
      })),
      auditLogs: auditLogs.map((a) => ({
        id: a.id,
        adminName: a.adminName,
        action: a.action,
        targetEmail: a.targetEmail,
        details: a.details,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch (error: any) {
    console.error("Admin data error:", error)
    return NextResponse.json({ error: "Failed to fetch admin data" }, { status: 500 })
  }
})

/**
 * Manual follow-up trigger
 * POST /api/admin/data
 * Body: { action: "trigger-followup", userId: "...", stageId: "day-10" }
 *
 * OR run all pending follow-ups:
 * Body: { action: "run-all-followups" }
 */
export const POST = withAbac(RESOURCES.admin, "admin", async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case "trigger-followup": {
        const { userId, stageId } = body
        if (!userId || !stageId) {
          return NextResponse.json({ error: "userId and stageId are required" }, { status: 400 })
        }
        const success = await triggerFollowUpForUser(userId, stageId)
        return NextResponse.json({ success, message: success ? "Follow-up sent" : "Failed to send follow-up" })
      }

      case "run-all-followups": {
        const result = await processFollowUps()
        return NextResponse.json({
          success: true,
          processed: result.processed,
          sent: result.sent.length,
          errors: result.errors.length,
          details: result,
        })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Admin POST error:", error)
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 })
  }
})
