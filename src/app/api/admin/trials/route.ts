import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"

/**
 * Admin Trials API — powers the trial tracking dashboard
 *
 * GET: Returns trial stats (active, expired, converted) with detailed user data
 *      for the trial tracking dashboard at /admin/trials
 */

export const GET = withAbac(RESOURCES.admin, "read", async () => {
  try {
    const now = new Date()

    // ── All users on trial or expired ─────────────────────────
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
        subscriptionPlan: true,
        subscriptionStartsAt: true,
        trialStartsAt: true,
        trialEndsAt: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            followUpLogs: true,
            payments: true,
            onboardingResponses: { where: { completed: true } },
          },
        },
      },
    })

    // ── Users who converted to paid subscriptions ──────────────
    const convertedUsers = await prisma.user.findMany({
      where: {
        subscriptionStatus: "active",
        // Must have been on trial before (trialStartsAt is set)
        trialStartsAt: { not: null },
      },
      orderBy: { subscriptionStartsAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        subscriptionPlan: true,
        subscriptionStartsAt: true,
        trialStartsAt: true,
        trialEndsAt: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            followUpLogs: true,
            payments: true,
            onboardingResponses: { where: { completed: true } },
          },
        },
      },
    })

    // ── Compute stats ─────────────────────────────────────────
    const activeTrials = trialUsers.filter(
      (u) => u.subscriptionStatus === "trial" && u.trialEndsAt && u.trialEndsAt > now
    )
    const expiredTrials = trialUsers.filter(
      (u) => u.subscriptionStatus === "expired" || (u.trialEndsAt && u.trialEndsAt <= now)
    )
    const converted = convertedUsers.filter((u) => u.subscriptionStartsAt)

    const trialsExpiringToday = activeTrials.filter((u) => {
      if (!u.trialEndsAt) return false
      const msRemaining = u.trialEndsAt.getTime() - now.getTime()
      return msRemaining > 0 && msRemaining <= 24 * 60 * 60 * 1000
    }).length

    const trialsExpiringThisWeek = activeTrials.filter((u) => {
      if (!u.trialEndsAt) return false
      const days = Math.ceil((u.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return days <= 7
    }).length

    const totalTrialUsers = activeTrials.length + expiredTrials.length + converted.length
    const conversionRate = totalTrialUsers > 0
      ? Math.round((converted.length / totalTrialUsers) * 100)
      : 0

    const onboardingRate = totalTrialUsers > 0
      ? Math.round(
          (activeTrials.filter((u) => u._count.onboardingResponses > 0).length +
            expiredTrials.filter((u) => u._count.onboardingResponses > 0).length +
            converted.filter((u) => u._count.onboardingResponses > 0).length) /
            totalTrialUsers * 100
        )
      : 0

    // Average days on trial before conversion
    const avgDaysOnTrial = converted.length > 0
      ? Math.round(
          converted.reduce((sum, u) => {
            if (!u.trialStartsAt || !u.subscriptionStartsAt) return sum
            const days = Math.ceil(
              (u.subscriptionStartsAt.getTime() - u.trialStartsAt.getTime()) / (1000 * 60 * 60 * 24)
            )
            return sum + Math.max(1, days)
          }, 0) / converted.length
        )
      : 3

    // ── Format response ───────────────────────────────────────
    const formatUser = (u: typeof trialUsers[0]) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      status: u.subscriptionStatus,
      tier: u.subscriptionTier,
      plan: u.subscriptionPlan,
      trialStartsAt: u.trialStartsAt?.toISOString() || null,
      trialEndsAt: u.trialEndsAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      onboardingCompleted: u._count.onboardingResponses > 0,
      followUpCount: u._count.followUpLogs,
      paymentCount: u._count.payments,
      hasActiveSubscription: u.subscriptionStatus === "active",
    })

    return NextResponse.json({
      stats: {
        activeTrials: activeTrials.length,
        expiredTrials: expiredTrials.length,
        convertedToPaid: converted.length,
        conversionRate,
        avgDaysOnTrial,
        trialsExpiringToday,
        trialsExpiringThisWeek,
        onboardingRate,
      },
      active: activeTrials.map(formatUser),
      expired: expiredTrials.map(formatUser),
      converted: converted.map(formatUser),
    })
  } catch (error: any) {
    console.error("Admin trials error:", error)
    return NextResponse.json({ error: "Failed to fetch trial data" }, { status: 500 })
  }
})
