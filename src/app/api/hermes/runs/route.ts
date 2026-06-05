import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { qualifyLead } from "@/lib/qualify-lead"

export const GET = withAuth(async (req, { session }) => {
  const url = new URL(req.url)
  const limitParam = url.searchParams.get("limit")
  const take = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 5, 1), 100) : 50

  const runs = await prisma.hermesRun.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take,
  })
  return NextResponse.json(runs)
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()

  const run = await prisma.hermesRun.create({
    data: {
      taskType: body.taskType,
      input: body.input || null,
      status: "running",
      userId: session.user.id,
    },
  })

  // Execute asynchronously - don't await
  setImmediate(async () => {
    try {
      let output = ""
      let leadsProcessed = 0
      let messagesQueued = 0

      if (body.taskType === "qualify_leads") {
        const newLeads = await prisma.lead.findMany({
          where: { userId: session.user.id, status: "new" },
        })
        leadsProcessed = newLeads.length
        for (const lead of newLeads) {
          const { score, status, tier, breakdown } = qualifyLead(lead)
          await prisma.lead.update({
            where: { id: lead.id },
            data: { qualificationScore: score, status, qualificationTier: tier, qualificationBreakdown: JSON.stringify(breakdown) },
          })
        }
        output = `Qualified ${leadsProcessed} leads.`
      } else if (body.taskType === "send_followups") {
        const due = await prisma.followup.findMany({
          where: { status: "pending", scheduledAt: { lte: new Date() } },
        })
        messagesQueued = due.length
        for (const f of due) {
          await prisma.followup.update({
            where: { id: f.id },
            data: { status: "sent", sentAt: new Date() },
          })
        }
        output = `Sent ${messagesQueued} due follow-ups.`
      } else if (body.taskType === "onboard_clients") {
        const onboarding = await prisma.client.findMany({
          where: { userId: session.user.id, status: "onboarding" },
        })
        leadsProcessed = onboarding.length
        output = `Reviewed ${leadsProcessed} clients in onboarding.`
      } else if (body.taskType === "generate_report") {
        const [leads, clients] = await Promise.all([
          prisma.lead.findMany({ where: { userId: session.user.id } }),
          prisma.client.findMany({ where: { userId: session.user.id } }),
        ])
        output = `Report: ${leads.length} total leads, ${leads.filter((l) => l.status === "qualified").length} qualified, ${clients.filter((c) => c.status === "active").length} active clients.`
      } else {
        output = `Custom task: ${body.input || "no input"}`
      }

      await prisma.hermesRun.update({
        where: { id: run.id },
        data: { status: "completed", output, leadsProcessed, messagesQueued, completedAt: new Date() },
      })
      await prisma.activity.create({
        data: {
          type: "hermes_run",
          description: `Hermes completed: ${body.taskType}`,
          entityType: "hermes_run",
          entityId: run.id,
          userId: session.user.id,
        },
      })
    } catch (e) {
      await prisma.hermesRun.update({
        where: { id: run.id },
        data: { status: "failed", errorMessage: String(e), completedAt: new Date() },
      })
    }
  })

  return NextResponse.json(run, { status: 201 })
})
