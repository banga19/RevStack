import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { WATIIntegration } from "@/lib/wati-integration"

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const wati = new WATIIntegration()

    const conversation = payload.conversation || {}
    const messages = payload.messages || []

    if (messages.length === 0) {
      return NextResponse.json({ received: true })
    }

    const lastMessage = messages[messages.length - 1]
    const phone = lastMessage?.customerId || conversation?.customerId || ""
    const text = lastMessage?.message || ""
    const senderName = conversation?.customerName || ""

    if (!phone || !text) {
      return NextResponse.json({ received: true })
    }

    const result = wati.handleIncomingMessage({
      phone,
      message: text,
      senderName,
      conversationId: conversation.id || "",
      messageId: lastMessage.id || "",
    })

    // Log the incoming message as prospect activity if a matching prospect exists
    const prospect = await prisma.prospect.findFirst({
      where: {
        OR: [
          { phone: { contains: phone.replace(/\D/g, "") } },
          { whatsapp: { contains: phone.replace(/\D/g, "") } },
        ],
      },
      orderBy: { createdAt: "desc" },
    })

    if (prospect) {
      await prisma.prospectActivity.create({
        data: {
          prospectId: prospect.id,
          type: "whatsapp_replied",
          channel: "whatsapp",
          details: {
            phone,
            message: text,
            score: result.score,
            intent: result.intent,
            conversationId: conversation.id,
          },
        },
      })

      // If this is a meaningful engagement, advance the prospect through any active sequence
      if (result.score >= 30) {
        const activeEnrollment = await prisma.prospectSequence.findFirst({
          where: { prospectId: prospect.id, status: "active" },
          include: { sequence: true },
        })
        if (activeEnrollment) {
          const { hermesQueue } = await import("@/lib/hermes/queue")
          await hermesQueue.add(
            "process-sequence-run",
            {
              sequenceId: activeEnrollment.sequenceId,
              prospectId: prospect.id,
            },
            { attempts: 2, backoff: { type: "exponential", delay: 2_000 } }
          )
        }
      }
    }

    return NextResponse.json({ received: true, processed: result })
  } catch (error) {
    console.error("[WATI Webhook] Error processing incoming message:", error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
