#!/usr/bin/env tsx
/**
 * WATI end-to-end smoke test
 *
 * Validates the full WhatsApp flow:
 *  1. Health check / connectivity
 *  2. Create contact
 *  3. Send text message
 *  4. Send template message
 *  5. Inbound scoring simulation
 *
 * Run:
 *  npx tsx scripts/test-wati-e2e.ts
 *
 * Uses `.env.local` for WATI credentials.
 */

import fs from "node:fs"
import path from "node:path"
const envPath = path.resolve(process.cwd(), ".env.local")
try {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line && !line.trim().startsWith("#"))
    .forEach((line) => {
      const [k, ...v] = line.split("=")
      if (k && v.length) process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "")
    })
} catch {}
import { WATIIntegration, type WATITemplate } from "@/lib/wati-integration"

const PASS = "✅"
const FAIL = "❌"
const WARN = "⚠️"
let passed = 0
let failed = 0
let warnings = 0

function log(label: string, ok: boolean, detail?: string) {
  process.stdout.write(`  ${ok ? PASS : FAIL} ${label}`)
  if (detail) process.stdout.write(` — ${detail}`)
  process.stdout.write("\n")
  if (ok) passed++
  else failed++
}

function warn(label: string, detail?: string) {
  process.stdout.write(`  ${WARN} ${label}`)
  if (detail) process.stdout.write(` — ${detail}`)
  process.stdout.write("\n")
  warnings++
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗")
  console.log("║            WATI.io End-to-End Test               ║")
  console.log("╚══════════════════════════════════════════════════╝\n")

  const integration = new WATIIntegration()

  console.log("─── Config ─────────────────────────────────────────")
  log("WATI_API_TOKEN present", Boolean(process.env.WATI_API_TOKEN))
  log("WATI_WHATSAPP_NUMBER_ID present", Boolean(process.env.WATI_WHATSAPP_NUMBER_ID))
  log("WATI_API_URL set", Boolean(process.env.WATI_API_URL), process.env.WATI_API_URL || "https://live-mt-server.wati.io")
  log("WATI integration configured", integration.isConfigured())

  if (!integration.isConfigured()) {
    warn("Missing credentials — tests will run in simulation fallback mode.")
  }

  console.log("\n─── 1. Health check ────────────────────────────────")
  const health = await integration.healthCheck()
  log("Health check reachable", health.connected, health.whatsappNumber || "simulation mode")

  console.log("\n─── 2. Create contact ──────────────────────────────")
  const contactName = `Mapato QA ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`
  const contactPhone = `254700000000`
  const contact = await integration.createContact({
    name: contactName,
    phone: contactPhone,
    email: `qa+${Date.now()}@mapato.app`,
    tags: ["qa", "wati-script"],
    customFields: { source: "wati-e2e-test" },
  })
  log("Contact created", contact.success, contact.contactId || "simulated")

  if (contact.success && contact.contactId) {
    const cached = integration.getContactByPhone(contactPhone)
    log("Contact retrievable by phone after creation", Boolean(cached), cached?.id)
  }

  console.log("\n─── 3. Send text message ───────────────────────────")
  const textResult = await integration.sendMessage(
    contactPhone,
    `WATI e2e validation: ${new Date().toISOString()}`
  )
  log("Text message sent", textResult.success, textResult.messageId)

  console.log("\n─── 4. Send template message ───────────────────────")
  const templateResult = await integration.sendTemplate(
    contactPhone,
    "lead-welcome",
    ["QA User", "Mapato", "B2B Trade"]
  )
  log("Template message sent", templateResult.success, templateResult.messageId)

  console.log("\n─── 5. Inbound message handling ────────────────────")
  const inbound = await integration.handleIncomingMessage({
    from: contactPhone,
    text: "We want to buy 5 containers of coffee beans immediately. Company: QA Traders Ltd.",
  })
  log("Inbound scoring executed", Boolean(inbound.leadScore))
  log(`Lead score: ${inbound.leadScore}`, typeof inbound.leadScore === "number" && inbound.leadScore >= 0)
  log(`Action resolved: ${inbound.action}`, ["auto_reply", "forward_to_human", "update_crm"].includes(inbound.action))

  console.log("\n─── 6. Templates registry sanity check ─────────────")
  const templates = integration.getTemplates()
  log("Templates loaded", templates.length > 0, `${templates.length} templates registered`)

  const leadWelcome = templates.find((t) => t.id === "lead-welcome")
  log("lead-welcome template present", Boolean(leadWelcome), leadWelcome?.name)

  const followUp24h = templates.find((t) => t.id === "follow-up-24h")
  log("follow-up-24h template present", Boolean(followUp24h))

  const customId = integration.addTemplate({
    name: "e2e_custom_template",
    category: "UTILITY",
    language: "en",
    status: "APPROVED",
    body: "Custom body for {{1}}",
  })
  log("Custom template added", Boolean(customId))
  const customTemplate = templates.concat(integration.getTemplates()).find((t) => t.id === customId)
  log("Custom template retrievable", Boolean(customTemplate))

  console.log("\n─── 7. Campaign lifecycle ──────────────────────────")
  const campaign = await integration.createCampaign({
    name: `E2E QA Campaign ${Date.now()}`,
    templateName: "lead-welcome",
    contacts: [contactPhone],
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  })
  log("Campaign created", campaign.success, campaign.campaignId)

  if (campaign.success && campaign.campaignId) {
    const started = await integration.startCampaign(campaign.campaignId)
    log("Campaign started", started)

    const fetched = integration.getCampaign(campaign.campaignId)
    log("Campaign status updated", fetched?.status === "completed", fetched?.status)
  }

  console.log("\n─── Summary ────────────────────────────────────────")
  console.log(`  Passed : ${passed}`)
  console.log(`  Failed : ${failed}`)
  console.log(`  Warnings: ${warnings}`)
  console.log("")

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("Fatal error running WATI e2e test:", err)
  process.exit(1)
})
