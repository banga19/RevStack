import { NextRequest, NextResponse } from "next/server"
import { addSubscription, removeSubscription, PushSubscription } from "@/lib/push-notifications"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription: endpoint, p256dh, and auth are required" },
        { status: 400 }
      )
    }

    const subscription: PushSubscription = {
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      subscribedAt: new Date().toISOString(),
    }

    addSubscription(subscription)

    return NextResponse.json({ success: true, message: "Subscribed to push notifications" })
  } catch (error) {
    console.error("Push subscription error:", error)
    return NextResponse.json(
      { error: "Failed to subscribe to push notifications" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get("endpoint")

    if (!endpoint) {
      return NextResponse.json(
        { error: "Missing endpoint parameter" },
        { status: 400 }
      )
    }

    removeSubscription(endpoint)

    return NextResponse.json({ success: true, message: "Unsubscribed from push notifications" })
  } catch (error) {
    console.error("Push unsubscription error:", error)
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    )
  }
}
