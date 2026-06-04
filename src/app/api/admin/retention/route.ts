import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"

export const GET = withAbac(RESOURCES.admin, "read", async () => {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // All users
  const totalUsers = await prisma.user.count()

  // Users who signed up in the last 30 days
  const newUsers30d = await prisma.user.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  })

  // Users who signed up in the last 7 days
  const newUsers7d = await prisma.user.count({
    where: { createdAt: { gte: sevenDaysAgo } },
  })

  // Users who have logged in (have lastLoginAt)
  const usersWithLogin = await prisma.user.count({
    where: { lastLoginAt: { not: null } },
  })

  // Active users in last 7 days (logged in within 7 days)
  const activeUsers7d = await prisma.user.count({
    where: { lastLoginAt: { gte: sevenDaysAgo } },
  })

  // Active users in last 30 days
  const activeUsers30d = await prisma.user.count({
    where: { lastLoginAt: { gte: thirtyDaysAgo } },
  })

  // Users who signed up in the last 30 days and have logged in at least once
  const activated30d = await prisma.user.count({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      lastLoginAt: { not: null },
    },
  })

  // Churned / at-risk: users who signed up > 30 days ago, never logged in, or last login > 30 days ago
  const atRiskUsers = await prisma.user.count({
    where: {
      AND: [
        { createdAt: { lt: thirtyDaysAgo } },
        {
          OR: [
            { lastLoginAt: null },
            { lastLoginAt: { lt: thirtyDaysAgo } },
          ],
        },
      ],
    },
  })

  // Login activity per day for the last 30 days
  const loginActivityRaw = await prisma.user.findMany({
    where: { lastLoginAt: { gte: thirtyDaysAgo } },
    select: { lastLoginAt: true },
    orderBy: { lastLoginAt: "asc" },
  })

  // Aggregate login activity by day
  const loginByDay = new Map<string, number>()
  for (const u of loginActivityRaw) {
    if (u.lastLoginAt) {
      const dayKey = u.lastLoginAt.toISOString().split("T")[0]
      loginByDay.set(dayKey, (loginByDay.get(dayKey) || 0) + 1)
    }
  }

  // Sign-ups per day for the last 30 days
  const signupsRaw = await prisma.user.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  const signupsByDay = new Map<string, number>()
  for (const u of signupsRaw) {
    const dayKey = u.createdAt.toISOString().split("T")[0]
    signupsByDay.set(dayKey, (signupsByDay.get(dayKey) || 0) + 1)
  }

  // Build a date range for chart data
  const dateLabels: string[] = []
  const loginCounts: number[] = []
  const signupCounts: number[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split("T")[0]
    dateLabels.push(key)
    loginCounts.push(loginByDay.get(key) || 0)
    signupCounts.push(signupsByDay.get(key) || 0)
  }

  // Retention cohorts: by signup week, track login rate
  const cohortsRaw = await prisma.user.findMany({
    where: {
      createdAt: { gte: ninetyDaysAgo },
      lastLoginAt: { not: null },
    },
    select: { createdAt: true, lastLoginAt: true },
  })

  const cohortData = new Map<string, { signedUp: number; retained: number }>()
  for (const u of cohortsRaw) {
    const week = getWeekStart(u.createdAt)
    const entry = cohortData.get(week) || { signedUp: 0, retained: 0 }
    entry.signedUp++
    if (u.lastLoginAt && u.lastLoginAt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      entry.retained++
    }
    cohortData.set(week, entry)
  }

  const retentionCohorts = Array.from(cohortData.entries())
    .map(([week, data]) => ({
      week,
      signedUp: data.signedUp,
      retained: data.retained,
      retentionRate: data.signedUp > 0 ? Math.round((data.retained / data.signedUp) * 100) : 0,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12) // Last 12 weeks

  // Recent login activity (last 20 logins)
  const recentLogins = await prisma.user.findMany({
    where: { lastLoginAt: { not: null } },
    select: { id: true, name: true, email: true, lastLoginAt: true, createdAt: true },
    orderBy: { lastLoginAt: "desc" },
    take: 20,
  })

  return NextResponse.json({
    summary: {
      totalUsers,
      newUsers7d,
      newUsers30d,
      usersWithLogin,
      loginRate: totalUsers > 0 ? Math.round((usersWithLogin / totalUsers) * 100) : 0,
      activeUsers7d,
      activeUsers30d,
      activationRate30d: newUsers30d > 0 ? Math.round((activated30d / newUsers30d) * 100) : 0,
      atRiskUsers,
      churnRate: totalUsers > 0 ? Math.round((atRiskUsers / totalUsers) * 100) : 0,
    },
    chartData: dateLabels.map((date, i) => ({
      date,
      logins: loginCounts[i],
      signups: signupCounts[i],
    })),
    retentionCohorts,
    recentLogins: recentLogins.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      signedUpAt: u.createdAt.toISOString(),
      daysSinceLogin: u.lastLoginAt
        ? Math.floor((now.getTime() - u.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    })),
  })
})

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split("T")[0]
}
