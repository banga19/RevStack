import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { getOrgScope } from "@/lib/get-org-scope"
import { twilioIntegration } from "@/lib/twilio-integration"

export const POST = withAbac(RESOURCES["call-recordings"], "write", async (req, { session }) => {
  const body = await req.json()
  const { to, prospectId, record = true, metadata } = body

  if (!to) {
    return NextResponse.json({ error: "to phone number is required" }, { status: 400 })
  }

  const scope = await getOrgScope(session.user.id)
  const organizationId = scope.organizationId || session.user.id

  let matchedProspectId = prospectId
  if (prospectId) {
    const prospect = await prisma.prospect.findFirst({
      where: { id: prospectId, organizationId },
    })
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }
  }

  if (!matchedProspectId && to) {
    const digitsOnly = to.replace(/\D/g, "")
    const prospect = await prisma.prospect.findFirst({
      where: {
        organizationId,
        OR: [
          { phone: { contains: digitsOnly } },
          { whatsapp: { contains: digitsOnly } },
        ],
      },
    })
    if (prospect) matchedProspectId = prospect.id
  }

  const callResult = twilioIntegration.initiateCall({
    to,
    record,
    recordingChannels: "mono",
    timeout: 30,
    metadata: {
      organizationId,
      repId: session.user.id,
      ...(metadata || {}),
      ...(matchedProspectId ? { prospectId: matchedProspectId } : {}),
    },
  })

  if (!callResult.success) {
    return NextResponse.json({ error: callResult.error || "Failed to initiate call" }, { status: 500 })
  }

  const recording = await prisma.callRecording.create({
    data: {
      organizationId,
      prospectId: matchedProspectId,
      repId: session.user.id,
      direction: "outbound",
      status: "initiated",
      metadata: {
        callSid: callResult.callSid,
        to,
        record,
        ...metadata,
      },
    },
    include: {
      prospect: {
        select: { id: true, firstName: true, lastName: true, company: true, email: true },
      },
    },
  })

  return NextResponse.json({ call: callResult, recording }, { status: 201 })
})
