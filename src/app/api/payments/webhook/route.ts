import { NextRequest, NextResponse } from "next/server"
import { validateWebhook, handleWebhookEvent } from "@/lib/flutterwave"

/**
 * Flutterwave Webhook Handler
 *
 * Flutterwave sends POST requests to this endpoint for charge.completed
 * and other events. The webhook URL must be configured in the Flutterwave
 * dashboard (Settings → Webhooks).
 *
 * Security: Validates the verif-hash header against FLW_WEBHOOK_HASH.
 */
export async function POST(req: NextRequest) {
  try {
    // Validate webhook signature
    const headers: Record<string, string | string[] | undefined> = {}
    req.headers.forEach((value, key) => { headers[key] = value })
    
    if (!validateWebhook(headers)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { event, data } = body

    if (!event || !data) {
      return new NextResponse("Invalid webhook payload", { status: 400 })
    }

    const handled = await handleWebhookEvent(event, data)

    if (handled) {
      return NextResponse.json({ success: true })
    } else {
      return new NextResponse("Event processing failed", { status: 500 })
    }
  } catch (error) {
    console.error("[Webhook] Error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
