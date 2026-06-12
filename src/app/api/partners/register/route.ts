import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

export const OK = (data: any, status = 200) => NextResponse.json(data, { status })
export const ERR = (message: string, status = 400) => NextResponse.json({ error: message }, { status })

export type PartnerRegisterBody = {
  displayName?: string
  companyName?: string
  bio?: string | null
  website?: string | null
  region?: "ke" | "tz" | "ug" | "rw" | "intl" | null
  phone?: string | null
  payoutMethod?: string | null
  payoutDetails?: string | null
  notes?: string | null
}

/**
 * POST /api/partners/register
 *
 * Register the authenticated user as a partner.
 * Generates a unique referral code based on the user's name.
 * Body: { displayName?, bio?, website?, payoutMethod?, payoutDetails? }
 */
export const POST = withAuth(async (req: NextRequest, { session }) => {
  const userId = session.user.id as string
  const email = session.user.email as string
  const userName = session.user.name as string

  const existing = await prisma.partner.findUnique({ where: { userId } })
  if (existing) {
    return NextResponse.json(
      { error: "You are already registered as a partner", partner: existing },
      { status: 409 }
    )
  }

  const body = (await req.json().catch(() => ({}))) as PartnerRegisterBody
  const displayName = body.displayName || userName
  const companyName = body.companyName || null
  const region = body.region || null
  const phone = body.phone || null
  const bio = body.bio || null
  const website = body.website || null
  const payoutMethod = body.payoutMethod || null
  const payoutDetails = body.payoutDetails || null
  const notes = body.notes || null

  // Generate a unique referral code
  const nameBase = displayName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 12)
  const codeBase = `MAPATO-${nameBase}`
  let referralCode = codeBase
  let attempts = 0

  // Ensure uniqueness by appending a number if needed
  while (attempts < 10) {
    const existingCode = await prisma.partner.findUnique({ where: { referralCode } })
    if (!existingCode) break
    attempts++
    referralCode = `${codeBase}${attempts}`
  }

  if (attempts >= 10) {
    // Fallback to a random code
    referralCode = `MAPATO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  }

  // Determine initial tier based on user's client count and subscription
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      _count: { select: { clients: true } },
      subscriptionStatus: true,
    },
  })

  const clientCount = userData?._count.clients || 0
  let tier = "affiliate"
  let commissionRate = 0.15

  if (clientCount >= 20) {
    tier = "agency"
    commissionRate = 0.30
  } else if (clientCount >= 5) {
    tier = "reseller"
    commissionRate = 0.25
  }

  const partner = await prisma.partner.create({
    data: {
      userId,
      displayName,
      companyName,
      region,
      phone,
      referralCode,
      tier,
      commissionRate,
      status: "active",
      bio,
      website,
      payoutMethod,
      payoutDetails,
      notes,
    },
  })

  return NextResponse.json({
    partner,
    message: `Welcome to the Mapato Partner Program! Your referral code is ${referralCode}`,
    referralLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/signup?ref=${referralCode}`,
  }, { status: 201 })
})

/**
 * GET /api/partners/register
 *
 * Get the authenticated user's partner registration status.
 */
export const GET = withAuth(async (_req: NextRequest, { session }) => {
  const userId = session.user.id as string

  const partner = await prisma.partner.findUnique({
    where: { userId },
    include: {
      _count: { select: { referrals: true } },
    },
  })

  if (!partner) {
    return NextResponse.json({ registered: false })
  }

  // Get referral stats
  const referrals = await prisma.referral.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: "desc" },
  })

  const stats = {
    totalReferrals: referrals.length,
    pendingReferrals: referrals.filter((r) => r.status === "pending").length,
    signedUpReferrals: referrals.filter((r) => r.status === "signed-up").length,
    convertedReferrals: referrals.filter((r) => r.status === "converted").length,
    totalCommissionEarned: referrals.reduce((s, r) => s + r.commissionEarned, 0),
  }

  return NextResponse.json({
    registered: true,
    partner,
    stats,
    referralLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://mapato.app"}/signup?ref=${partner.referralCode}`,
  })
})
