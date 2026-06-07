/**
 * WATI.io WhatsApp LangChain Tool
 *
 * Wraps the WATI integration as a callable LangChain tool for use
 * in the Hermes LangGraph sales pipeline and other agent workflows.
 *
 * Exports:
 *   watiSendTemplate — send a pre-approved WhatsApp template message
 *   watiSendMessage  — send a free-form WhatsApp message
 */

import { tool } from "@langchain/core/tools"
import { z } from "zod"

// ============================================================
// Send Template
// ============================================================

const SendTemplateSchema = z.object({
  phone: z.string().describe("Recipient phone number in international format (e.g. +254712345678)"),
  templateName: z.string().describe("WATI template name (e.g. lead-welcome, follow-up-24h, lead-scored-high)"),
  parameters: z.array(z.string()).optional().describe("Template parameter values in order"),
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
      "Templates available: lead-welcome, follow-up-24h, re-engagement, order-confirmation, lead-scored-high.",
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
