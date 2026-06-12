import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"

export const GET = withAbac(RESOURCES.admin, "read", async () => {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  // ── All users with activity data ─────────────────────────
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      subscriptionStatus: true,
      subscriptionTier: true,
      trialEndsAt: true,
      _count: {
        select: {
          followUpLogs: true,
          payments: true,
          onboardingResponses: { where: { completed: true } },
          clients: { where: { status: "active" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // ── Compute risk scores for each user ────────────────────
  const scored = users.map((u) => {
    let riskScore = 0
    let reasons: string[] = []

    // Factor 1: No login in 30+ days
    if (!u.lastLoginAt) {
      riskScore += 25
      reasons.push("Never logged in")
    } else {
      const daysSinceLogin = Math.floor((now.getTime() - u.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLogin > 60) {
        riskScore += 35
        reasons.push(`No login in ${daysSinceLogin}d`)
      } else if (daysSinceLogin > 30) {
        riskScore += 20
        reasons.push(`Last login ${daysSinceLogin}d ago`)
      } else if (daysSinceLogin > 14) {
        riskScore += 10
        reasons.push(`Low activity (${daysSinceLogin}d)`)
      }
    }

    // Factor 2: Subscription status
    if (u.subscriptionStatus === "expired") {
      riskScore += 30
      reasons.push("Subscription expired")
    } else if (u.subscriptionStatus === "trial" && u.trialEndsAt) {
      const daysLeft = Math.ceil((u.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysLeft <= 0) {
        riskScore += 25
        reasons.push("Trial ended")
      } else if (daysLeft <= 3) {
        riskScore += 15
        reasons.push(`Trial ends in ${daysLeft}d`)
      } else {
        riskScore += 5
      }
    } else if (u.subscriptionStatus === "past_due") {
      riskScore += 30
      reasons.push("Payment past due")
    }

    // Factor 3: No onboarding completed
    if (u._count.onboardingResponses === 0) {
      riskScore += 15
      reasons.push("Never completed onboarding")
    }

    // Factor 4: No follow-ups sent
    if (u._count.followUpLogs === 0 && u.createdAt < thirtyDaysAgo) {
      riskScore += 10
      reasons.push("No follow-up engagement")
    }

    // Factor 5: No active clients
    if (u._count.clients === 0 && u.createdAt < thirtyDaysAgo) {
      riskScore += 10
      reasons.push("No active clients")
    }

    // Factor 6: No payments
    if (u._count.payments === 0 && u.createdAt < sixtyDaysAgo) {
      riskScore += 10
      reasons.push("Never paid")
    }

    // Cap at 100
    riskScore = Math.min(100, riskScore)

    // Risk level
    let level: "low" | "medium" | "high" | "critical"
    if (riskScore >= 70) level = "critical"
    else if (riskScore >= 45) level = "high"
    else if (riskScore >= 25) level = "medium"
    else level = "low"

    // Upsell recommendation
    let recommendation: string | null = null
    if (u.subscriptionStatus === "trial" && u._count.onboardingResponses > 0) {
      recommendation = "Send upgrade offer with ROI summary"
    } else if (u.subscriptionStatus === "trial" && u._count.onboardingResponses === 0) {
      recommendation = "Send onboarding reminder + personal outreach"
    } else if (u.subscriptionStatus === "active" && u.subscriptionTier === "starter") {
      recommendation = "Growth tier upgrade — more features available"
    } else if (u.subscriptionStatus === "expired") {
      recommendation = "Re-activation offer with exclusive discount"
    } else if (u.lastLoginAt && Math.floor((now.getTime() - u.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)) > 30) {
      recommendation = "Win-back sequence — new features summary"
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      subscriptionStatus: u.subscriptionStatus,
      subscriptionTier: u.subscriptionTier,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
      daysSinceRegistration: Math.floor((now.getTime() - u.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      onboardingCompleted: u._count.onboardingResponses > 0,
      riskScore,
      riskLevel: level,
      riskReasons: reasons,
      recommendation,
    }
  })

  // ── Aggregate stats ──────────────────────────────────────
  const low = scored.filter((s) => s.riskLevel === "low").length
  const medium = scored.filter((s) => s.riskLevel === "medium").length
  const high = scored.filter((s) => s.riskLevel === "high").length
  const critical = scored.filter((s) => s.riskLevel === "critical").length
  const total = scored.length

  const avgScore = total > 0 ? Math.round(scored.reduce((s, u) => s + u.riskScore, 0) / total) : 0

  return NextResponse.json({
    summary: {
      totalUsers: total,
      lowRisk: low,
      mediumRisk: medium,
      highRisk: high,
      criticalRisk: critical,
      averageRiskScore: avgScore,
      atRiskTotal: high + critical,
    },
    users: scored.sort((a, b) => b.riskScore - a.riskScore),
  })
})
