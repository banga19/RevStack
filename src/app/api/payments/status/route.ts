import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/abac-middleware"
import { checkPaymentStatus } from "@/lib/flutterwave"

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const txRef = searchParams.get("tx_ref")

  if (!txRef) {
    return NextResponse.json({ error: "tx_ref is required" }, { status: 400 })
  }

  const result = await checkPaymentStatus(txRef)
  return NextResponse.json(result)
})
