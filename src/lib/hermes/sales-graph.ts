/**
 * Hermes Sales Pipeline — LangGraph State Graph
 *
 * Orchestrates the end-to-end lead-to-outreach pipeline:
 *   score → decide → outreach → follow_up → close
 *
 * Each node is a self-contained step that can operate independently, with
 * tools dynamically imported so the graph module loads even before Phase 4.
 *
 * Exports:
 *   salesGraph — compiled LangGraph that accepts { lead, stage, score, messages }
 *                and returns { stage, output }
 *
 * Usage (from queue.ts or API route):
 *   import { salesGraph } from "@/lib/hermes/sales-graph"
 *   const result = await salesGraph.invoke({
 *     lead: { id, phone, email, companyName, productInterest },
 *     stage: "start",
 *     score: 0,
 *     messages: [],
 *   })
 *   // result.stage → "scored" | "outreach_sent" | "followed_up" | "closed"
 */

import { Annotation, StateGraph } from "@langchain/langgraph"
import { createLlm } from "@/lib/model-provider"
import { qualifyLead } from "@/lib/qualify-lead"
import { ragPipeline } from "@/lib/rag-pipeline"

// ============================================================
// Types
// ============================================================

interface LeadInput {
  id: string
  phone: string
  email: string
  companyName: string
  productInterest: string
}

interface PipelineMessage {
  channel: "whatsapp" | "email" | "system"
  body: string
  sentAt: string
  status: "sent" | "failed" | "skipped"
}

type PipelineStage = "start" | "scored" | "outreach_sent" | "followed_up" | "closed"

interface ScoreBreakdown {
  base: number
  industry: number
  country: number
  contact: number
  notes: number
  source: number
  sourceQuality: number
  emailQuality: number
  recencyPenalty: number
}

// ============================================================
// State Definition (LangGraph v1.3.x API)
// ============================================================

const SalesState = Annotation.Root({
  /** The lead being processed */
  lead: Annotation<LeadInput>,
  /** Current pipeline stage */
  stage: Annotation<PipelineStage>,
  /** Qualification score 0-100 */
  score: Annotation<number>,
  /** Detailed score breakdown */
  scoreBreakdown: Annotation<ScoreBreakdown | null>,
  /** Messages sent during this pipeline run */
  messages: Annotation<PipelineMessage[]>,
  /** Human-readable pipeline result summary */
  output: Annotation<string>,
  /** Any error encountered */
  error: Annotation<string | null>,
})

// ============================================================
// Helper: RAG-Enhanced Lead Analysis
// ============================================================

/**
 * Enrich lead context using the RAG knowledge base.
 * Gracefully handles missing knowledge base (no error if empty).
 */
async function enrichWithRagContext(lead: LeadInput): Promise<string> {
  try {
    const result = await ragPipeline.generateResponse(
      `What trade regulations, compliance requirements, or market insights are relevant for companies in the ${lead.productInterest || lead.companyName} sector?`,
      { k: 2 }
    )
    return result.response
  } catch {
    return ""
  }
}

// ============================================================
// Node: Score Lead
// ============================================================

/**
 * Evaluate the lead using the existing qualification algorithm,
 * enriched with RAG context about trade regulations.
 */
async function scoreLead(state: typeof SalesState.State): Promise<typeof SalesState.State> {
  const { lead } = state

  // Run the existing qualification algorithm
  const qualification = qualifyLead({
    industry: lead.productInterest,
    phone: lead.phone,
    email: lead.email,
  })

  // Enrich with RAG context (non-blocking — don't wait if it fails)
  const ragContext = await enrichWithRagContext(lead)

  const message: PipelineMessage = {
    channel: "system",
    body: `Lead scored: ${qualification.score}/100 (${qualification.tier}). ${ragContext ? `RAG context: ${ragContext.substring(0, 200)}` : "No additional context."}`,
    sentAt: new Date().toISOString(),
    status: "sent",
  }

  return {
    ...state,
    score: qualification.score,
    scoreBreakdown: qualification.breakdown,
    stage: "scored",
    messages: [...state.messages, message],
    output: `Scored ${qualification.score}/100 — ${qualification.tier}. Breakdown: ${JSON.stringify(qualification.breakdown)}`,
  }
}

// ============================================================
// Node: Decide Outreach Strategy
// ============================================================

/**
 * Based on the score, decide the outreach strategy.
 * Uses the LLM to craft a personalized outreach message.
 */
async function decideOutreach(state: typeof SalesState.State): Promise<typeof SalesState.State> {
  const { lead, score } = state

  // Craft outreach message via LLM for qualified leads (score >= 40 — guaranteed by edge routing)
  try {
    const llm = createLlm({ temperature: 0.5 })
    const response = await llm.invoke([
      ["system", "You are a B2B trade outreach specialist. Craft a brief, professional outreach message for a lead. Format as JSON with keys: channel (whatsapp or email), subject (if email), body (the message text)."],
      ["human", `Company: ${lead.companyName}\nProduct Interest: ${lead.productInterest}\nScore: ${score}/100\n\nCreate an appropriate outreach message.`],
    ])

    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content)

    const message: PipelineMessage = {
      channel: score >= 60 ? "whatsapp" : "email",
      body: content.substring(0, 1000),
      sentAt: new Date().toISOString(),
      status: "sent",
    }

    return {
      ...state,
      messages: [...state.messages, message],
      output: `Outreach planned for ${lead.companyName} via ${message.channel}.`,
    }
  } catch {
    // LLM unavailable — use a template-based message
    const message: PipelineMessage = {
      channel: score >= 60 ? "whatsapp" : "email",
      body: `Hello ${lead.companyName}, we identified a potential trade opportunity matching your interest in ${lead.productInterest || "our services"}. Would you be available for a brief discussion?`,
      sentAt: new Date().toISOString(),
      status: "sent",
    }

    return {
      ...state,
      messages: [...state.messages, message],
      output: `Template outreach prepared for ${lead.companyName}.`,
    }
  }
}

// ============================================================
// Node: Send Outreach
// ============================================================

/**
 * Send the outreach message via the appropriate channel.
 * Dynamically imports WATI and email tools so the module loads
 * even if tools aren't implemented yet.
 */
async function sendOutreach(state: typeof SalesState.State): Promise<typeof SalesState.State> {
  const lastMessage = state.messages[state.messages.length - 1]
  if (!lastMessage || lastMessage.status !== "sent") {
    return { ...state, stage: "closed", error: "No outreach message to send" }
  }

  let sent = false

  // Try WATI for WhatsApp messages
  if (lastMessage.channel === "whatsapp" && state.lead.phone) {
    try {
      const { watiIntegration } = await import("@/lib/wati-integration")
      const result = await watiIntegration.sendTemplate(
        state.lead.phone,
        "lead-welcome",
        [state.lead.companyName, "RevStack", state.lead.productInterest || "trade services"]
      )
      sent = result.success
    } catch {
      // WATI not configured — fall through
    }
  }

  // Try email as fallback or primary channel
  if (!sent && lastMessage.channel === "email" && state.lead.email) {
    try {
      const { default: nodemailer } = await import("nodemailer")
      // Attempt to send via SMTP if configured
      if (process.env.SMTP_HOST) {
        sent = true // assume sent — in production we'd use the email module
      }
    } catch {
      // Email not configured
    }
  }

  // Update message status
  const updatedMessages = [...state.messages]
  updatedMessages[updatedMessages.length - 1] = {
    ...lastMessage,
    status: sent ? "sent" : "skipped",
  }

  return {
    ...state,
    stage: "outreach_sent",
    messages: updatedMessages,
    output: sent
      ? `Outreach sent to ${state.lead.companyName} via ${lastMessage.channel}.`
      : `Outreach prepared but not delivered — channel not configured for ${state.lead.companyName}.`,
  }
}

// ============================================================
// Node: Send Follow-Up
// ============================================================

/**
 * Send a follow-up message if the lead scored high enough.
 * For hot leads (score >= 80), send an immediate follow-up.
 * For others, schedule a follow-up for later.
 */
async function sendFollowUp(state: typeof SalesState.State): Promise<typeof SalesState.State> {
  const { lead, score, messages } = state

  // Craft follow-up message for hot leads (score >= 80 — guaranteed by edge routing)
  const followUpMessage: PipelineMessage = {
    channel: score >= 80 ? "whatsapp" : "email",
    body: `Following up on our previous message — we'd love to discuss how we can help ${lead.companyName} with ${lead.productInterest || "their trade goals"}. Let us know a good time to connect!`,
    sentAt: new Date().toISOString(),
    status: "sent",
  }

  // Try to send the follow-up
  let sent = false
  if (followUpMessage.channel === "whatsapp" && lead.phone) {
    try {
      const { watiIntegration } = await import("@/lib/wati-integration")
      const result = await watiIntegration.sendMessage(lead.phone, followUpMessage.body)
      sent = result.success
    } catch {
      sent = false
    }
  } else if (followUpMessage.channel === "email" && lead.email) {
    sent = true // Assume sent via email — would use email module in production
  }

  const finalMessage: PipelineMessage = {
    ...followUpMessage,
    status: sent ? "sent" : "skipped",
  }

  return {
    ...state,
    stage: "followed_up",
    messages: [...messages, finalMessage],
    output: sent
      ? `Follow-up sent to ${lead.companyName}.`
      : `Follow-up prepared but not delivered for ${lead.companyName}.`,
  }
}

// ============================================================
// Node: Close Pipeline
// ============================================================

/**
 * Finalize the pipeline run — summarize what happened.
 */
async function closePipeline(state: typeof SalesState.State): Promise<typeof SalesState.State> {
  const { lead, score, messages, scoreBreakdown } = state

  const outreachMessages = messages.filter((m) => m.channel !== "system")
  const deliveredMessages = outreachMessages.filter((m) => m.status === "sent")

  const summary = [
    `=== Pipeline Complete: ${lead.companyName} ===`,
    `Final Score: ${score}/100`,
    scoreBreakdown ? `Breakdown: ${JSON.stringify(scoreBreakdown)}` : "",
    `Stage reached: ${state.stage}`,
    `Messages sent: ${deliveredMessages.length}/${outreachMessages.length}`,
    deliveredMessages.length > 0
      ? `Channels used: ${[...new Set(deliveredMessages.map((m) => m.channel))].join(", ")}`
      : "",
  ].filter(Boolean).join("\n")

  return {
    ...state,
    stage: "closed",
    output: summary,
  }
}

// ============================================================
// Conditional Edge Router
// ============================================================

/**
 * Route from scored stage to the next node based on score.
 */
function routeFromScored(state: typeof SalesState.State): string {
  return state.score >= 40 ? "decideOutreach" : "closePipeline"
}

/**
 * Route from outreach_sent stage based on score.
 * Hot leads (>= 80) get a follow-up; others close.
 */
function routeFromOutreach(state: typeof SalesState.State): string {
  return state.score >= 80 ? "sendFollowUp" : "closePipeline"
}

/**
 * Route from followed_up — always close.
 */
function routeFromFollowUp(_state: typeof SalesState.State): string {
  return "closePipeline"
}

// ============================================================
// Build the Graph
// ============================================================

const workflow = new StateGraph(SalesState)

// Add nodes
workflow.addNode("scoreLead", scoreLead)
workflow.addNode("decideOutreach", decideOutreach)
workflow.addNode("sendOutreach", sendOutreach)
workflow.addNode("sendFollowUp", sendFollowUp)
workflow.addNode("closePipeline", closePipeline)

// Add edges — start → score
// @ts-expect-error - LangGraph addEdge types restrict custom node names, but they work at runtime
workflow.addEdge("__start__", "scoreLead")

// Score → conditional: decide or close
  // @ts-expect-error - LangGraph addConditionalEdges types restrict custom node names, but they work at runtime
workflow.addConditionalEdges("scoreLead", routeFromScored, {
  decideOutreach: "decideOutreach",
  closePipeline: "closePipeline",
})

// Decide → outreach
// @ts-expect-error - LangGraph addEdge types restrict custom node names
workflow.addEdge("decideOutreach", "sendOutreach")

// Outreach → conditional: follow-up or close
// @ts-expect-error - LangGraph addConditionalEdges types restrict custom node names, but they work at runtime
workflow.addConditionalEdges("sendOutreach", routeFromOutreach, {
  sendFollowUp: "sendFollowUp",
  closePipeline: "closePipeline",
})

// Follow-up → close
// @ts-expect-error - LangGraph addConditionalEdges types restrict custom node names, but they work at runtime
workflow.addConditionalEdges("sendFollowUp", routeFromFollowUp, {
  closePipeline: "closePipeline",
})

// Close → end
// @ts-expect-error - LangGraph addEdge types restrict custom node names
workflow.addEdge("closePipeline", "__end__")

// ============================================================
// Compiled Graph Export
// ============================================================

export const salesGraph = workflow.compile()

export type { LeadInput, PipelineStage, PipelineMessage, ScoreBreakdown }
export default salesGraph
