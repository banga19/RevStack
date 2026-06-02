import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { verifyTransaction } from "@/lib/flutterwave"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 })
    }

    const result = await verifyTransaction(Number(transactionId))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Payment verify error:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}
