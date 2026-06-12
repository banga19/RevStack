import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

/**
 * GET /api/partners/referrals
 *
 * List all referrals for the authenticated partner.
 * Query params: status (pending, signed-up, converted, paid), limit (default 50)
 */
export const GET = withAuth(async (req: NextRequest, { session }) => {
  const userId = session.user.id as string

  const partner = await prisma.partner.findUnique({ where: { userId } })
  if (!partner) {
    return NextResponse.json({ error: "Not registered as a partner" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"))

  const where: any = { partnerId: partner.id }
  if (status) where.status = status

  const referrals = await prisma.referral.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  // If referred users exist, fetch their names for display
  const referredUserIds = referrals
    .map((r) => r.referredUserId)
    .filter(Boolean) as string[]

  let referredUsers: Map<string, { name: string; email: string }> = new Map()
  if (referredUserIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: referredUserIds } },
      select: { id: true, name: true, email: true },
    })
    referredUsers = new Map(users.map((u) => [u.id, { name: u.name, email: u.email }]))
  }

  const enrichedReferrals = referrals.map((r) => ({
    ...r,
    referredUser: r.referredUserId ? referredUsers.get(r.referredUserId) || null : null,
  }))

  const stats = {
    total: referrals.length,
    pending: referrals.filter((r) => r.status === "pending").length,
    signedUp: referrals.filter((r) => r.status === "signed-up").length,
    converted: referrals.filter((r) => r.status === "converted").length,
    paid: referrals.filter((r) => r.status === "paid").length,
    totalCommissionEarned: referrals.reduce((s, r) => s + r.commissionEarned, 0),
  }

  return NextResponse.json({ referrals: enrichedReferrals, stats })
})

/**
 * POST /api/partners/referrals
 *
 * Create a new referral entry (called when someone clicks a referral link).
 * Body: { referralCode, referredEmail?, referredName? }
 */
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const { referralCode, referredEmail, referredName } = body

  if (!referralCode) {
    return NextResponse.json({ error: "referralCode is required" }, { status: 400 })
  }

  // Find the partner by referral code
  const partner = await prisma.partner.findUnique({ where: { referralCode } })
  if (!partner) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })
  }

  if (partner.status !== "active") {
    return NextResponse.json({ error: "Partner account is not active" }, { status: 403 })
  }

  // Don't allow self-referral
  if (partner.userId === (req as any).session?.user?.id) {
    return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 })
  }

  // Check for duplicate referral by email
  if (referredEmail) {
    const existing = await prisma.referral.findFirst({
      where: { partnerId: partner.id, referredEmail },
    })
    if (existing) {
      return NextResponse.json({ referral: existing, message: "Referral already tracked" })
    }
  }

  // Create the referral with 90-day expiry
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  const referral = await prisma.referral.create({
    data: {
      partnerId: partner.id,
      referralCode,
      referredEmail: referredEmail || null,
      referredName: referredName || null,
      status: "pending",
      expiresAt,
    },
  })

  return NextResponse.json({ referral }, { status: 201 })
})
