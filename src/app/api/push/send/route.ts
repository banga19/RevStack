import { NextRequest, NextResponse } from "next/server"
import { sendPushNotification } from "@/lib/push-notifications"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, body: message, url } = body

    if (!title) {
      return NextResponse.json(
        { error: "Notification title is required" },
        { status: 400 }
      )
    }

    const result = await sendPushNotification(title, {
      body: message || "",
      url: url || "/",
      tag: "mapato-notification",
    })

    return NextResponse.json({
      success: true,
      sent: result.success,
      failed: result.failed,
    })
  } catch (error) {
    console.error("Send push notification error:", error)
    return NextResponse.json(
      { error: "Failed to send push notifications" },
      { status: 500 }
    )
  }
}
