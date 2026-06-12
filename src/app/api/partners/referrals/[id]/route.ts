import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

/**
 * PUT /api/partners/referrals/[id]
 *
 * Update a referral's status.
 * Body: { status: "signed-up" | "converted" | "paid", commissionEarned?: number }
 *
 * - "signed-up": When the referred user completes signup, link their userId
 * - "converted": When the referred user subscribes/pays, calculate commission
 * - "paid": When commission is paid out
 */
export const PUT = withAuth(async (req: NextRequest, { params, session }) => {
  const userId = session.user.id as string
  const referralId = params.id as string

  // Verify the partner owns this referral
  const partner = await prisma.partner.findUnique({ where: { userId } })
  if (!partner) {
    return NextResponse.json({ error: "Not registered as a partner" }, { status: 403 })
  }

  const referral = await prisma.referral.findFirst({
    where: { id: referralId, partnerId: partner.id },
  })
  if (!referral) {
    return NextResponse.json({ error: "Referral not found" }, { status: 404 })
  }

  const body = await req.json()
  const { status, commissionEarned, referredUserId } = body

  const validStatuses = ["pending", "signed-up", "converted", "paid"]
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    )
  }

  // Validate status transitions
  const transitions: Record<string, string[]> = {
    pending: ["signed-up", "converted"],
    "signed-up": ["converted"],
    converted: ["paid"],
    paid: [],
  }
  const allowed = transitions[referral.status] || []
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from "${referral.status}" to "${status}"` },
      { status: 400 }
    )
  }

  const updateData: any = { status }

  if (status === "signed-up") {
    updateData.signedUpAt = new Date()
    if (referredUserId) updateData.referredUserId = referredUserId
  }

  if (status === "converted") {
    updateData.convertedAt = new Date()
    // Calculate commission based on partner's rate and a default monthly value
    const commissionValue = commissionEarned ?? Math.round(200 * partner.commissionRate * 100) / 100
    updateData.commissionEarned = commissionValue

    // Update partner's total earned
    await prisma.partner.update({
      where: { id: partner.id },
      data: { totalEarned: { increment: commissionValue } },
    })
  }

  const updated = await prisma.referral.update({
    where: { id: referralId },
    data: updateData,
  })

  return NextResponse.json({ referral: updated })
})
