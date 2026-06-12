#!/usr/bin/env tsx
/**
 * Create WATI WhatsApp Message Templates for Sokogate Trade Pipeline
 *
 * Usage:
 *   # Dry-run + dashboard guide (recommended first step):
 *   npx tsx scripts/create-wati-templates.ts --dry-run
 *
 *   # Submit via Meta Graph API (requires Meta Business credentials):
 *   META_ACCESS_TOKEN=<token> WABA_ID=<id> npx tsx scripts/create-wati-templates.ts
 *
 *   # Apply templates to wati-integration.ts (after Meta approval in dashboard):
 *   npx tsx scripts/create-wati-templates.ts --activate
 *
 * Meta Graph API docs:
 *   https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
 *
 * WATI dashboard:
 *   https://app.wati.io → Templates → Create New Template
 *
 * IMPORTANT: Template creation requires submission via Meta's review system.
 * This script auto-submits if Meta API credentials are available, otherwise
 * prints a step-by-step guide for manual creation in the WATI dashboard.
 * After Meta approval (24-72h), run --activate to wire templates into code.
 */

import * as fs from "fs"
import * as path from "path"

// ─────────────────────────────────────────────────────────────────────────────
// Template interface
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateDef {
  localKey: string
  elementName: string
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION"
  language: string
  body: string
  footer?: string
  buttons?: Array<{ type: "QUICK_REPLY"; text: string }>
  /** Parameters the caller actually sends — determines {{n}} count in body */
  callerParams: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Definitions
// ─────────────────────────────────────────────────────────────────────────────
// Each template definition here corresponds to a `localKey` in
// wati-integration.ts's initializeDefaultTemplates(). When --activate is run,
// the script updates wati-integration.ts with the actual elementName and body
// from the approved WATI account templates.
//
// Parameter counts MUST match what agent-service-bridge.ts / test-hermes-full.ts
// actually pass. Extra parameters beyond {{n}} are truncated by sendTemplate.

const TEMPLATES: TemplateDef[] = [

  // ── 1. Lead Welcome ─────────────────────────────────────────────────────
  // Called from: test-hermes-full.ts, agent-service-bridge.ts leadAgentAction
  // sendTemplate(phone, "lead-welcome", [name, company, interest])
  // Params: {{1}} = name, {{2}} = company, {{3}} = interest
  {
    localKey: "lead-welcome",
    elementName: "sokogate_lead_welcome",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}! 👋\n\nWelcome to Sokogate — your direct line to verified global buyers.\n\nWe received your inquiry from {{2}} and our trade specialists are reviewing it now.\nTo match you with the right buyers, could you tell us:\n\n1. What quantity can you supply monthly? (e.g., 500 kg)\n2. What's your best export price? (e.g., $8.50/kg FOB Mombasa)\n3. What certifications do you hold? (e.g., Organic, HACCP, Fair Trade)\n4. What's your preferred shipping timeline?\n\nOur AI matching engine will find the best buyer from our network of 50+ active importers in Korea, Europe, and the Middle East.",
    buttons: [
      { type: "QUICK_REPLY", text: "Tell us more" },
      { type: "QUICK_REPLY", text: "See current demand" },
    ],
    callerParams: ["name", "company", "interest"],
  },

  // ── 2. Follow-up (24h) ──────────────────────────────────────────────────
  // Called from: agent-service-bridge.ts leadAgentAction
  // sendTemplate(phone, "follow-up-24h", [lead.name, lead.company || "products", "3-5"])
  // Params: {{1}} = name, {{2}} = product, {{3}} = shipping_days
  {
    localKey: "follow-up-24h",
    elementName: "sokogate_quote_followup",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}! 👋\n\nJust checking in — did you receive our quote for {{2}}?\n\nWe have stock available and can ship within {{3}} days of order confirmation.\n\nWould you like to:\n1. ✅ Proceed with the order\n2. 📋 Request a sample\n3. 💬 Discuss pricing or payment terms\n\nLet us know how we can help!",
    buttons: [
      { type: "QUICK_REPLY", text: "Proceed with order" },
      { type: "QUICK_REPLY", text: "Request sample" },
      { type: "QUICK_REPLY", text: "Discuss pricing" },
    ],
    callerParams: ["name", "product", "shipping_days"],
  },

  // ── 3. Re-engagement ────────────────────────────────────────────────────
  // Used for campaign workflows (not currently called from agent-service-bridge)
  // Params: {{1}} = name, {{2}} = product_info
  {
    localKey: "re-engagement",
    elementName: "sokogate_market_intel",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}! 👋\n\nIt's been a while since we last connected. We've since added new products to our catalog that might interest you:\n\n{{2}}\n\nWe're offering special pricing this month for returning customers.\n\nReply \"INTERESTED\" and we'll send you our latest catalog! 🚀",
    buttons: [
      { type: "QUICK_REPLY", text: "Show me buyers" },
      { type: "QUICK_REPLY", text: "Update my prices" },
    ],
    callerParams: ["name", "product_info"],
  },

  // ── 4. Order Confirmation ───────────────────────────────────────────────
  // Used for order workflows (not currently called from agent-service-bridge)
  // Params: {{1}} = name, {{2}} = order#, {{3}} = product, {{4}} = qty,
  //         {{5}} = value, {{6}} = ship_date, {{7}} = shipping, {{8}} = port
  {
    localKey: "order-confirmation",
    elementName: "sokogate_order_confirmed",
    category: "UTILITY",
    language: "en",
    body: "Hi {{1}}! ✅\n\nYour Sokogate order #{{2}} is confirmed!\n\n📦 Product: {{3}}\n📊 Quantity: {{4}}\n💰 Total value: ${{5}}\n🔒 Payment: Held securely in Sokogate Pay escrow\n📅 Estimated shipment: {{6}}\n🚢 Shipping: {{7}} (FOB {{8}})\n\nYour buyer has been notified. We'll send tracking updates as your shipment progresses.",
    footer: "Protected by Sokogate Pay escrow",
    buttons: [
      { type: "QUICK_REPLY", text: "Track shipment" },
      { type: "QUICK_REPLY", text: "Contact support" },
    ],
    callerParams: ["name", "order#", "product", "qty", "value", "ship_date", "shipping", "port"],
  },

  // ── 5. High-Scored Lead (Korea Corridor) ────────────────────────────────
  // Called from: agent-service-bridge.ts leadAgentAction
  // sendTemplate(phone, "lead-scored-high", [lead.name])
  // Note: Agent sends only 1 param (name), so template must have 1 param {{1}}.
  // Advisors: customize this template for full 7-param version once Meta-approved.
  {
    localKey: "lead-scored-high",
    elementName: "sokogate_korea_corridor",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}! 🚀\n\nYour profile is a strong match for our Korea-Africa Trade Corridor pilot. Our team has reviewed your submission and would like to fast-track your onboarding.\n\nBenefits of joining the pilot:\n✅ Pre-vetted Korean buyer introductions\n✅ Sokogate Pay escrow protection\n✅ Logistics support (Mombasa → Busan corridor)\n✅ 3-month free Sokogate platform trial\n\nReply \"JOIN\" to enroll or \"LEARN MORE\" for program details.",
    buttons: [
      { type: "QUICK_REPLY", text: "Join the pilot" },
      { type: "QUICK_REPLY", text: "Learn more" },
    ],
    callerParams: ["name"],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Meta Graph API Client — submits templates for Meta review
// ─────────────────────────────────────────────────────────────────────────────

const META_GRAPH_URL = "https://graph.facebook.com/v21.0"

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function createViaMetaGraphAPI(
  template: TemplateDef,
  wabaId: string,
  accessToken: string,
  retries = 3
): Promise<{ success: boolean; id?: string; error?: string }> {
  const components: any[] = [{ type: "BODY", text: template.body }]

  if (template.footer) {
    components.push({ type: "FOOTER", text: template.footer })
  }

  if (template.buttons && template.buttons.length > 0) {
    components.push({
      type: "BUTTONS",
      buttons: template.buttons.map((b) => ({ type: "QUICK_REPLY", text: b.text })),
    })
  }

  const body = {
    name: template.elementName,
    category: template.category,
    language: template.language,
    components,
    allow_category_change: true,
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        `${META_GRAPH_URL}/${wabaId}/message_templates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      )

      const data = await response.json()

      if (response.ok) {
        return { success: true, id: data.id }
      }

      if (response.status === 429 && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000
        console.log(`     Rate limited, retrying in ${delay}ms (attempt ${attempt}/${retries})...`)
        await sleep(delay)
        continue
      }

      return { success: false, error: JSON.stringify(data.error || data) }
    } catch (err) {
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 500
        console.log(`     Network error, retrying in ${delay}ms (attempt ${attempt}/${retries})...`)
        await sleep(delay)
        continue
      }
      return { success: false, error: (err as Error).message }
    }
  }

  return { success: false, error: "Max retries exceeded" }
}

// ─────────────────────────────────────────────────────────────────────────────
// Activation — updates wati-integration.ts with new template names
// ─────────────────────────────────────────────────────────────────────────────

const WATI_INTEGRATION_PATH = path.resolve(process.cwd(), "src", "lib", "wati-integration.ts")

function activateTemplates(): void {
  console.log("")
  console.log("─── Activating Sokogate Templates in wati-integration.ts ───")
  console.log("")

  if (!fs.existsSync(WATI_INTEGRATION_PATH)) {
    console.log(`❌ File not found: ${WATI_INTEGRATION_PATH}`)
    console.log("   Make sure you're running from the project root.")
    return
  }

  let content = fs.readFileSync(WATI_INTEGRATION_PATH, "utf-8")
  let modifiedCount = 0

  for (const t of TEMPLATES) {
    const paramCount = (t.body.match(/\{\{\d+\}\}/g) || []).length

    // Update the name field
    const nameRegex = new RegExp(
      `(id:\\s*"${t.localKey}"[^}]*?name:\\s*")[^"]*(")`,
      "s"
    )
    const nameMatch = content.match(nameRegex)
    if (nameMatch) {
      content = content.replace(
        nameMatch[0],
        nameMatch[0].replace(/name:\s*"[^"]*"/, `name: "${t.elementName}"`)
      )
      modifiedCount++
      console.log(`  ✅ ${t.localKey.padEnd(22)} → name: "${t.elementName}" (${paramCount} params)`)
    } else {
      console.log(`  ⚠️  ${t.localKey.padEnd(22)} → template block not found in wati-integration.ts`)
    }

    // Update body text to match the approved template
    const bodyRegex = new RegExp(
      `(id:\\s*"${t.localKey}"[^}]*?body:\\s*")[^"]*(")`,
      "s"
    )
    const bodyMatch = content.match(bodyRegex)
    if (bodyMatch) {
      content = content.replace(
        bodyMatch[0],
        bodyMatch[0].replace(/body:\s*"[^"]*"/, `body: "${t.body.replace(/\n/g, "\\n")}"`)
      )
    }

    // Set status to APPROVED (templates must be approved before activation)
    const statusRegex = new RegExp(
      `(id:\\s*"${t.localKey}"[^}]*?status:\\s*")[^"]*(")`,
      "s"
    )
    const statusMatch = content.match(statusRegex)
    if (statusMatch) {
      content = content.replace(
        statusMatch[0],
        statusMatch[0].replace(/status:\s*"[^"]*"/, `status: "APPROVED"`)
      )
    }
  }

  fs.writeFileSync(WATI_INTEGRATION_PATH, content, "utf-8")

  console.log("")
  console.log(`  ✅ Updated ${modifiedCount}/${TEMPLATES.length} template references in wati-integration.ts`)
  console.log("")
  console.log(`  File: ${WATI_INTEGRATION_PATH}`)
  console.log("")
  console.log("  ℹ️  Run the WATI e2e test to verify: npx tsx scripts/test-wati-e2e.ts")
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Guide — step-by-step manual creation
// ─────────────────────────────────────────────────────────────────────────────

function printDashboardGuide() {
  console.log("")
  console.log("╔════════════════════════════════════════════════════════════════╗")
  console.log("║      WATI DASHBOARD — MANUAL TEMPLATE CREATION GUIDE         ║")
  console.log("╚════════════════════════════════════════════════════════════════╝")
  console.log("")
  console.log("  Available creation methods (all tried):")
  console.log("    ❌ V3 API  — returns 405 (endpoint doesn't expose creation)")
  console.log("    ❌ V1 API  — returns 404 (V1 endpoints unavailable)")
  console.log("    ❌ Meta    — META_ACCESS_TOKEN not configured")
  console.log("")
  console.log("  → Please create templates manually in the WATI dashboard:")
  console.log("")
  console.log("  Steps:")
  console.log("    1. Go to https://app.wati.io → Templates → Create New Template")
  console.log("    2. For EACH template below, enter the details and submit")
  console.log("    3. Wait for Meta approval (typically 24-72 hours)")
  console.log("    4. Run activation: npx tsx scripts/create-wati-templates.ts --activate")
  console.log("")
  console.log("  ─────────────────────────────────────────────────────────────")

  for (const t of TEMPLATES) {
    const paramCount = (t.body.match(/\{\{\d+\}\}/g) || []).length
    console.log("")
    console.log(`  ─── Template ${TEMPLATES.indexOf(t) + 1}: ${t.elementName} ──────────────────────`)
    console.log(`    Local key:   ${t.localKey}`)
    console.log(`    Category:    ${t.category}`)
    console.log(`    Language:    ${t.language}`)
    console.log(`    Parameters:  ${paramCount}`)
    t.callerParams.forEach((p, i) => console.log(`      {{${i + 1}}} = ${p}`))
    if (t.footer) console.log(`    Footer:      ${t.footer}`)
    if (t.buttons?.length) console.log(`    Buttons:     ${t.buttons.map((b) => b.text).join(", ")}`)
    console.log("")
    console.log(`    Body:`)
    console.log(`    ${t.body.split("\n").join("\n    ")}`)
    console.log("")
  }

  console.log("  ─────────────────────────────────────────────────────────────")
  console.log("")
  console.log("  ✅ After all templates are approved, run:")
  console.log("    npx tsx scripts/create-wati-templates.ts --activate")
  console.log("")
  console.log("  ✅ Then verify with:")
  console.log("    npx tsx scripts/test-wati-e2e.ts")
  console.log("")
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes("--dry-run")
  const doActivate = args.includes("--activate")
  const useMeta = !!(process.env.META_ACCESS_TOKEN && process.env.WABA_ID)

  console.log("")
  console.log("╔══════════════════════════════════════════════════════════════╗")
  console.log("║        Sokogate WATI Template Creation & Activation        ║")
  console.log("╚══════════════════════════════════════════════════════════════╝")
  console.log("")

  // ── Activation mode: update wati-integration.ts ──────────────────────
  if (doActivate) {
    activateTemplates()
    return
  }

  // ── Print spec summary ──────────────────────────────────────────────
  console.log(`  Mode: ${isDryRun ? "DRY RUN (specs + guide)" : useMeta ? `Meta Graph API (WABA: ${process.env.WABA_ID})` : "Guide only (no credentials for API submission)"}`)
  console.log(`  Templates: ${TEMPLATES.length}`)
  console.log("")
  console.log("─── Template Specifications ───")
  console.log("")

  for (const t of TEMPLATES) {
    const paramCount = (t.body.match(/\{\{\d+\}\}/g) || []).length
    console.log(`  [${t.localKey}] → ${t.elementName}`)
    console.log(`  Category: ${t.category} | Params: ${paramCount}`)
    console.log(`  Caller passes: [${t.callerParams.join(", ")}]`)
    if (t.footer) console.log(`  Footer: ${t.footer}`)
    if (t.buttons?.length) console.log(`  Buttons: ${t.buttons.map((b) => b.text).join(", ")}`)
    console.log("")
  }

  // ── Dry run ─────────────────────────────────────────────────────────
  if (isDryRun) {
    console.log("─── Meta Graph API Payloads (for reference) ───")
    console.log("")
    for (const t of TEMPLATES) {
      const components: any[] = [{ type: "BODY", text: t.body }]
      if (t.footer) components.push({ type: "FOOTER", text: t.footer })
      if (t.buttons?.length) {
        components.push({
          type: "BUTTONS",
          buttons: t.buttons.map((b) => ({ type: "QUICK_REPLY", text: b.text })),
        })
      }
      console.log(JSON.stringify(
        {
          name: t.elementName,
          category: t.category,
          language: t.language,
          components,
        },
        null,
        2
      ))
      console.log("")
    }
  }

  // ── Submit via Meta Graph API (if credentials available) ────────────
  if (useMeta) {
    console.log("─── Submitting via Meta Graph API ───")
    console.log("")
    let successCount = 0
    let failCount = 0

    for (const t of TEMPLATES) {
      process.stdout.write(`  ${t.elementName}... `)
      const result = await createViaMetaGraphAPI(t, process.env.WABA_ID!, process.env.META_ACCESS_TOKEN!)
      if (result.success) {
        console.log(`✅ Created (ID: ${result.id})`)
        successCount++
      } else {
        console.log(`❌ ${result.error?.substring(0, 100)}`)
        failCount++
      }
      await sleep(500)
    }

    console.log("")
    console.log(`  Results: ${successCount} created, ${failCount} failed`)
    if (successCount > 0) {
      console.log("  ⏳ Wait for Meta approval (24-72h), then run:")
      console.log("    npx tsx scripts/create-wati-templates.ts --activate")
    }
    return
  }

  // ── Fallback: print dashboard guide ─────────────────────────────────
  printDashboardGuide()
}

main().catch(console.error)
