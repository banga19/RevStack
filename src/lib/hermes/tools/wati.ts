/**
 * WATI.io WhatsApp LangChain Tool
 *
 * Wraps the WATI integration as a callable LangChain tool for use
 * in the Hermes LangGraph sales pipeline and other agent workflows.
 *
 * Exports:
 *   watiSendTemplate — send a pre-approved WhatsApp template message
 *   watiSendMessage  — send a free-form WhatsApp message
 *
 * Available templates (local key → WATI element_name):
 *
 *   new-chat-fallback → new_chat_v1         (UTILITY,    APPROVED, 1 param: name)
 *     Fallback auto-reply when primary template is unavailable.
 *
 *   lead-welcome      → welcome_wati_v2     (MARKETING,  APPROVED, 1 param: name)
 *     Generic welcome greeting with "Know the Pricing / How Wati works / Book a Demo" buttons.
 *
 *   follow-up-24h     → appointment_reminder_with_buttons
 *                                            (UTILITY,    APPROVED, 3 params: name, place, date)
 *     Appointment reminder with "Cancel / Reschedule / Confirm" buttons.
 *
 *   re-engagement     → default_welcome      (MARKETING,  APPROVED, 1 param: name)
 *     Opt-in request: "Please opt in to receive WhatsApp updates from us."
 *
 *   order-confirmation → shopify_default_order_complete_v5
 *                                            (UTILITY,    APPROVED, 5 params: name, store,
 *                                             whatsapp_link, order_link, order_preview)
 *     Order completion notice with fulfillment and tracking info.
 *
 *   lead-scored-high  → welcome_wati_v1     (MARKETING,  APPROVED, 1 param: name)
 *     Generic welcome greeting with "Know the Pricing / How WATI works / Get Started" buttons.
 *
 * Upcoming Sokogate custom templates (create via scripts/create-wati-templates.ts):
 *   lead-welcome      → sokogate_lead_welcome     (3 params: name, company, interest)
 *   follow-up-24h     → sokogate_quote_followup   (3 params: name, product, shipping_days)
 *   re-engagement     → sokogate_market_intel     (2 params: name, product_info)
 *   order-confirmation → sokogate_order_confirmed (8 params: name, order#, product, qty,
 *                                                   value, ship_date, shipping, port)
 *   lead-scored-high  → sokogate_korea_corridor   (7 params: name, company, score, interest,
 *                                                   budget, timeline, contact)
 */

import { tool } from "@langchain/core/tools"
import { z } from "zod"

// ============================================================
// Send Template
// ============================================================

const TEMPLATE_HELP = [
  "Available templates (local key → WATI name):",
  "  new-chat-fallback → new_chat_v1 (UTILITY, 1 param: name)",
  "  lead-welcome      → welcome_wati_v2 (MARKETING, 1 param: name)",
  "  follow-up-24h     → appointment_reminder_with_buttons (UTILITY, 3 params: name, place, date)",
  "  re-engagement     → default_welcome (MARKETING, 1 param: name)",
  "  order-confirmation → shopify_default_order_complete_v5 (UTILITY, 5 params: name, store, whatsapp_link, order_link, order_preview)",
  "  lead-scored-high  → welcome_wati_v1 (MARKETING, 1 param: name)",
  "",
  "Extra parameters beyond what the template defines are silently ignored by WhatsApp.",
  "If a template is not found locally or returns 403 from WATI, it falls back to new_chat_v1.",
].join("\n")

const SendTemplateSchema = z.object({
  phone: z.string().describe("Recipient phone number in international format (e.g. +254712345678)"),
  templateName: z.string().describe(`WATI local template key. ${TEMPLATE_HELP}`),
  parameters: z.array(z.string()).optional().describe("Template parameter values in order. Pass only as many as the template expects — extra params are ignored."),
})

export const watiSendTemplate = tool(
  async ({ phone, templateName, parameters }: { phone: string; templateName: string; parameters?: string[] }) => {
    try {
      const { watiIntegration } = await import("@/lib/wati-integration")
      const result = await watiIntegration.sendTemplate(phone, templateName, parameters ?? [])
      return JSON.stringify(result)
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `WATI sendTemplate failed: ${(error as Error).message}`,
      })
    }
  },
  {
    name: "wati_send_template",
    description:
      "Send a pre-approved WhatsApp template message via WATI.io. " +
      "Use for automated outreach, follow-ups, and order confirmations. " +
      TEMPLATE_HELP,
    schema: SendTemplateSchema,
  }
)

// ============================================================
// Send Free-Form Message
// ============================================================

const SendMessageSchema = z.object({
  phone: z.string().describe("Recipient phone number in international format (e.g. +254712345678)"),
  message: z.string().describe("Free-form text message content (max 4096 chars)"),
})

export const watiSendMessage = tool(
  async ({ phone, message }: { phone: string; message: string }) => {
    try {
      const { watiIntegration } = await import("@/lib/wati-integration")
      const result = await watiIntegration.sendMessage(phone, message)
      return JSON.stringify(result)
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `WATI sendMessage failed: ${(error as Error).message}`,
      })
    }
  },
  {
    name: "wati_send_message",
    description:
      "Send a free-form WhatsApp message via WATI.io. " +
      "Use for personalized replies that don't require a pre-approved template.",
    schema: SendMessageSchema,
  }
)
