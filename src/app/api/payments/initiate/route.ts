import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { initiatePayment } from "@/lib/flutterwave"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { paymentMethod, phone, tier, plan, card } = body

    // Validate required fields
    if (!paymentMethod || !["mpesa", "mobile_money", "card"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
    }

    if (!tier || !["starter", "growth", "enterprise"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
    }

    if (!plan || !["monthly", "yearly"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    // Determine amount
    type TierKey = "starter" | "growth" | "enterprise"
    const prices: Record<TierKey, { monthly: number; yearly: number }> = {
      starter: { monthly: 50, yearly: 500 },
      growth: { monthly: 200, yearly: 2000 },
      enterprise: { monthly: 500, yearly: 5000 },
    }

    const amount = prices[tier as TierKey]?.[plan as "monthly" | "yearly"] || 50
    const currency = paymentMethod === "mpesa" ? "KES" : "USD"

    // Convert USD to KES for M-Pesa (approximate rate)
    const amountInCurrency = paymentMethod === "mpesa"
      ? Math.round(amount * 130) // ~130 KES per USD
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
  } catch (error: any) {
    console.error("Payment initiate error:", error)
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 })
  }
}
