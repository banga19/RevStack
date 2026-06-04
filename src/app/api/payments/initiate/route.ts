import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/abac-middleware"
import { initiatePayment } from "@/lib/flutterwave"

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()
  const { paymentMethod, phone, tier, plan, card } = body

  if (!paymentMethod || !["mpesa", "mobile_money", "card"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
  }

  if (!tier || !["starter", "growth", "enterprise"].includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
  }

  if (!plan || !["monthly", "yearly"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }

  type TierKey = "starter" | "growth" | "enterprise"
  const prices: Record<TierKey, { monthly: number; yearly: number }> = {
    starter: { monthly: 50, yearly: 500 },
    growth: { monthly: 200, yearly: 2000 },
    enterprise: { monthly: 500, yearly: 5000 },
  }

  const amount = prices[tier as TierKey]?.[plan as "monthly" | "yearly"] || 50
  const currency = paymentMethod === "mpesa" ? "KES" : "USD"

  const amountInCurrency = paymentMethod === "mpesa"
    ? Math.round(amount * 130)
    : amount

  const result = await initiatePayment({
    userId: session.user.id,
    email: session.user.email || "",
    amount: amountInCurrency,
    currency,
    paymentMethod,
    tier,
    plan,
    phone,
    card,
  })

  if (result.success) {
    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      txRef: result.txRef,
      authUrl: result.authUrl,
    })
  } else {
    return NextResponse.json({ error: result.error || "Payment initiation failed" }, { status: 400 })
  }
})
