import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/abac-middleware"
import { verifyTransaction } from "@/lib/flutterwave"

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const { transactionId } = body

  if (!transactionId) {
    return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 })
  }

  const result = await verifyTransaction(Number(transactionId))
  return NextResponse.json(result)
})
