import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { checkPaymentStatus } from "@/lib/flutterwave"

/**
 * Check the status of a payment (for frontend polling).
 * GET /api/payments/status?tx_ref=mapato-xxx-123
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const txRef = searchParams.get("tx_ref")

    if (!txRef) {
      return NextResponse.json({ error: "tx_ref is required" }, { status: 400 })
    }

    const result = await checkPaymentStatus(txRef)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Payment status error:", error)
    return NextResponse.json({ error: "Failed to check payment status" }, { status: 500 })
  }
}
