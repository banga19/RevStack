import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logAdminAction } from "@/lib/admin-audit"

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      subscriptionStatus: true,
      subscriptionTier: true,
      _count: { select: { onboardingResponses: true } },
    },
  })

  return NextResponse.json(users)
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminName = (session.user as any).name || null

  try {
    const body = await req.json()
    const { userId, role, grantPermanentAccess, extendTrial } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Grant Permanent Access — sets the user's subscription to active + enterprise
    if (grantPermanentAccess) {
      const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: "active",
          subscriptionTier: "enterprise",
          subscriptionPlan: "monthly",
          subscriptionStartsAt: new Date(),
        },
        select: { id: true, name: true, email: true, role: true, subscriptionStatus: true, subscriptionTier: true, createdAt: true },
      })
      // Audit log
      logAdminAction({
        adminId: session.user.id,
        adminName,
        action: "grant_permanent_access",
        targetUserId: userId,
        targetEmail: target?.email,
        details: JSON.stringify({ targetName: target?.name }),
      })
      return NextResponse.json(updated)
    }

    // Extend Trial — adds 7 more days to trial
    if (extendTrial) {
      const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, trialEndsAt: true, subscriptionStatus: true } })
      if (!target) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      const now = new Date()
      const currentEnd = target.trialEndsAt || now
      // Extend by 7 days from the current trial end (or from now if no end date)
      const newEnd = new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000)
      // If user is expired, reactivate to trial first
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: "trial",
          trialEndsAt: newEnd,
          trialStartsAt: target.subscriptionStatus === "trial" ? undefined : now,
        },
        select: { id: true, name: true, email: true, role: true, subscriptionStatus: true, subscriptionTier: true, trialEndsAt: true, createdAt: true },
      })
      // Audit log
      logAdminAction({
        adminId: session.user.id,
        adminName,
        action: "extend_trial",
        targetUserId: userId,
        targetEmail: target.email,
        details: JSON.stringify({ targetName: target.name, oldEnd: target.trialEndsAt?.toISOString(), newEnd: newEnd.toISOString() }),
      })
      return NextResponse.json(updated)
    }

    // Role change
    if (!role || !["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid request: role, grantPermanentAccess, or extendTrial required" }, { status: 400 })
    }

    // Prevent removing your own admin role
    if (userId === session.user.id && role !== "admin") {
      return NextResponse.json({ error: "Cannot remove your own admin role" }, { status: 400 })
    }

    // Prevent removing the last admin
    if (role !== "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 })
      }
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    // Audit log
    logAdminAction({
      adminId: session.user.id,
      adminName,
      action: "change_role",
      targetUserId: userId,
      targetEmail: target?.email,
      details: JSON.stringify({ newRole: role }),
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
