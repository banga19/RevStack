import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { getTemplateById } from "@/lib/templates"

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const { templateId, clientId, customizations } = await req.json()
  const userId = session.user.id as string

  if (!templateId) {
    return NextResponse.json({ error: "Template ID is required" }, { status: 400 })
  }

  const template = getTemplateById(templateId)
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  // Fetch user's org
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  })

  const results: { type: string; success: boolean; id?: string; error?: string }[] = []

  // Execute each template action
  for (const action of template.actions) {
    try {
      switch (action.type) {
        case "create_pipeline_action": {
          if (clientId) {
            const pipelineAction = await prisma.pipelineAction.create({
              data: {
                clientId,
                type: "follow-up",
                note: `[Template: ${template.name}] ${action.description}`,
                status: "pending",
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            })
            results.push({ type: "pipeline_action", success: true, id: pipelineAction.id })
          }
          break
        }

        case "create_outreach_campaign": {
          const campaign = await prisma.outreachCampaign.create({
            data: {
              clientId: clientId || null,
              clientName: clientId ? undefined : "New Lead",
              channel: "whatsapp",
              type: "warm",
              status: "draft",
              templateId: template.id,
              sentCount: 0,
              replyCount: 0,
              bookedCount: 0,
            },
          })
          results.push({ type: "outreach_campaign", success: true, id: campaign.id })
          break
        }

        case "create_compliance_record": {
          if (clientId) {
            const compliance = await prisma.clientCompliance.create({
              data: {
                clientId,
                certificationType: "haccp",
                status: "not-started",
                notes: `[Template: ${template.name}] ${action.description}`,
              },
            })
            results.push({ type: "compliance_record", success: true, id: compliance.id })
          }
          break
        }

        case "create_ers_snapshot": {
          if (clientId) {
            const snapshot = await prisma.ersSnapshot.create({
              data: {
                clientId,
                totalScore: 50,
                breakdown: JSON.stringify({
                  documentation: 50,
                  compliance: 50,
                  exportHistory: 50,
                  capacityVerified: 50,
                }),
                readinessLevel: "developing",
              },
            })
            results.push({ type: "ers_snapshot", success: true, id: snapshot.id })
          }
          break
        }

        default:
          results.push({ type: action.type, success: false, error: "Action type not implemented" })
      }
    } catch (error) {
      results.push({ type: action.type, success: false, error: (error as Error).message })
    }
  }

  // Log the deployment
  console.log(`[Template] Deployed \"${template.name}\" for user ${userId} (${results.filter(r => r.success).length}/${results.length} actions)`)

  return NextResponse.json({
    success: true,
    templateId: template.id,
    templateName: template.name,
    actionsExecuted: results.filter(r => r.success).length,
    actionsTotal: results.length,
    results,
  })
})
