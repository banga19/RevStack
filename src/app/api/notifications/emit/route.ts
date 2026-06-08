/**
 * Notification Emit API
 *
 * POST /api/notifications/emit
 *
 * Called by other parts of the system (lead creation, payment webhooks,
 * subscription updates, etc.) to push real-time notifications to
 * connected SSE clients.
 *
 * Body:
 *   { userId: string, type, title, description, variant?, link? }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { emitToUser, type NotificationEvent } from "@/lib/sse-registry"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    // Must be authenticated to emit notifications
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await req.json()
    const { userId, type, title, description, variant, link, metadata } = body

    if (!userId || !type || !title) {
      return NextResponse.json(
        { error: "Missing required fields: userId, type, title" },
        { status: 400 }
      )
    }

    const validTypes = ["lead", "payment", "trial", "subscription", "outreach", "campaign", "system", "hermes"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const event: NotificationEvent = {
      id: crypto.randomUUID(),
      type,
      title,
      description: description || undefined,
      variant: variant || type === "payment" ? "success" : type === "lead" ? "info" : "default",
      link: link || undefined,
      timestamp: new Date().toISOString(),
      metadata: metadata || undefined,
    }

    const result = emitToUser(userId, event)

    return NextResponse.json({
      success: true,
      delivered: result.delivered,
      eventId: event.id,
    })
  } catch (error) {
    console.error("[Notifications] Emit error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
