/**
 * Create WATI WhatsApp Message Templates for Sokogate Trade Pipeline
 *
 * Usage:
 *   # Dry-run (shows specs + JSON payloads, no API calls):
 *   npx tsx scripts/create-wati-templates.ts --dry-run
 *
 *   # Submit via Meta Graph API (requires Meta Business credentials):
 *   META_ACCESS_TOKEN=<token> WABA_ID=<id> npx tsx scripts/create-wati-templates.ts
 *
 *   # Submit via WATI API (requires admin-scoped token):
 *   npx tsx scripts/create-wati-templates.ts --wati
 *
 *   # Apply templates to wati-integration.ts (after Meta approval):
 *   npx tsx scripts/create-wati-templates.ts --activate
 *
 * Meta Graph API docs:
 *   https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
 *
 * WATI dashboard (fallback):
 *   https://app.wati.io → Templates → Create New Template
 */

import * as fs from "fs"
import * as path from "path"

interface TemplateDef {
  localKey: string
  elementName: string
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION"
  language: string
  body: string
  footer?: string
  buttons?: Array<{ type: "QUICK_REPLY"; text: string }>
  /** Parameters the caller in agent-service-bridge.ts actually sends */
  callerParams: string[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// Template Definitions
// Parameter counts MUST match what agent-service-bridge.ts actually passes.
// Extra parameters beyond {{n}} are silently ignored by WhatsApp.
// ═══════════════════════════════════════════════════════════════════════════════

const TEMPLATES: TemplateDef[] = [
  // ── 1. Lead Welcome ─────────────────────────────────────────────────────
  // Called from: test-hermes-full.ts :: sendTemplate(phone, "lead-welcome",
  //               ["Hermes", "Mapato", "Trade"])
  // Params passed: [name, company, interest] → {{1}} = name, {{2}} = company, {{3}} = interest
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
  // Called from: agent-service-bridge.ts :: sendTemplate(phone, "follow-up-24h",
  //               [lead.name, lead.company || "products", "3-5"])
  // Params passed: [name, product, shipping_days] → {{1}} = name, {{2}} = product, {{3}} = days
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
  // (Not directly called from agent-service-bridge.ts with sendTemplate.
  //  Used as a local reference for campaign workflows.)
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
  // (Not directly called from agent-service-bridge.ts with sendTemplate.
  //  Used as a local reference for order workflows.)
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
  // Called from: agent-service-bridge.ts :: sendTemplate(phone, "lead-scored-high",
  //               [lead.name, lead.company || lead.name, String(score),
  //                "Trading products", "Inquired", "ASAP", lead.email || lead.phone])
  // Params passed: [name, company, score, interest, budget, timeline, contact]
  //                → {{1}} = name, {{2}} = company, {{3}} = score, {{4}} = interest,
  //                   {{5}} = budget, {{6}} = timeline, {{7}} = contact
  {
    localKey: "lead-scored-high",
    elementName: "sokogate_korea_corridor",
    category: "MARKETING",
    language: "en",
    body: "Hi {{1}}! 🚀\n\nYour profile from {{2}} is a strong match for our Korea-Africa Trade Corridor pilot. Our team has reviewed your submission and would like to fast-track your onboarding.\n\nQualification summary:\n• Match score: {{3}}/100\n• Product interest: {{4}}\n• Budget range: {{5}}\n• Timeline: {{6}}\n\nBenefits of joining the pilot:\n✅ Pre-vetted Korean buyer introductions\n✅ Sokogate Pay escrow protection\n✅ Logistics support (Mombasa → Busan corridor)\n✅ 3-month free Sokogate platform trial\n\nReply \"JOIN\" to enroll or \"LEARN MORE\" for program details. Contact: {{7}}",
    buttons: [
      { type: "QUICK_REPLY", text: "Join the pilot" },
      { type: "QUICK_REPLY", text: "Learn more" },
    ],
    callerParams: ["name", "company", "score", "interest", "budget", "timeline", "contact"],
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// Meta Graph API Client
// ═══════════════════════════════════════════════════════════════════════════════

const META_GRAPH_URL = "https://graph.facebook.com/v21.0"

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
      buttons: template.buttons.map(b => ({ type: "QUICK_REPLY", text: b.text })),
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

async function createViaWatiAPI(template: TemplateDef): Promise<{ success: boolean; id?: string; error?: string }> {
  const WATI_API_TOKEN = process.env.WATI_API_TOKEN
  const WATI_NUMBER_ID = process.env.WATI_WHATSAPP_NUMBER_ID
  const WATI_BASE = process.env.WATI_API_URL || "https://live-mt-server.wati.io"

  if (!WATI_API_TOKEN || !WATI_NUMBER_ID) {
    return { success: false, error: "WATI_API_TOKEN or WATI_WHATSAPP_NUMBER_ID not set" }
  }

  try {
    const response = await fetch(
      `${WATI_BASE}/${WATI_NUMBER_ID}/api/v1/templates/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WATI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          elementName: template.elementName,
          category: template.category,
          language: template.language,
          body: template.body,
          buttons: template.buttons?.map(b => ({ text: b.text, type: "QUICK_REPLY" })),
          footer: template.footer,
          allowCategoryChange: true,
        }),
      }
    )

    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      return { success: true, id: data.id || data.templateId }
    }
    if (response.status === 403) {
      return { success: false, error: "Forbidden — WATI API token needs admin/owner scope to create templates. Use the dashboard instead." }
    }
    return { success: false, error: `WATI API error ${response.status}: ${JSON.stringify(data)}` }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Activation — updates wati-integration.ts with new template names
// ═══════════════════════════════════════════════════════════════════════════════

const WATI_INTEGRATION_PATH = path.resolve(process.cwd(), "src", "lib", "wati-integration.ts")

function activateTemplates(): void {
  console.log("─── Activating Sokogate Templates in wati-integration.ts ───\n")

  if (!fs.existsSync(WATI_INTEGRATION_PATH)) {
    console.log(`❌ File not found: ${WATI_INTEGRATION_PATH}`)
    console.log("   Make sure you're running from the project root.")
    return
  }

  let content = fs.readFileSync(WATI_INTEGRATION_PATH, "utf-8")
  let modifiedCount = 0

  for (const t of TEMPLATES) {
    // Find the template block for this localKey and update name + status
    // Pattern: `id: "${t.localKey}",\n      name: "old_name",`
    const oldNameRegex = new RegExp(
      `(id:\\s*"${t.localKey}"[^}]*?name:\\s*")[^"]*(")`,
      "s"
    )
    const match = content.match(oldNameRegex)
    if (match) {
      content = content.replace(
        match[0],
        match[0].replace(/name:\s*"[^"]*"/, `name: "${t.elementName}"`)
      )
      modifiedCount++
      console.log(`  ✅ ${t.localKey.padEnd(22)} → name: "${t.elementName}"`)
    } else {
      console.log(`  ⚠️  ${t.localKey.padEnd(22)} → template block not found in wati-integration.ts`)
    }

    // Update status from APPROVED to PENDING if needed 
    // (only if it's currently set to a non-sokogate template name)
    // We'll leave status as-is since the actual approval status depends on Meta review
    const statusRegex = new RegExp(
      `(id:\\s*"${t.localKey}"[^}]*?status:\\s*")[^"]*(")`,
      "s"
    )
    const statusMatch = content.match(statusRegex)
    if (statusMatch && !statusMatch[0].includes("APPROVED")) {
      // Don't overwrite APPROVED - these will need to be approved by Meta first
      content = content.replace(
        statusMatch[0],
        statusMatch[0].replace(/status:\s*"[^"]*"/, `status: "PENDING"`)
      )
    }
  }

  fs.writeFileSync(WATI_INTEGRATION_PATH, content, "utf-8")
  
  console.log(`\n  Updated ${modifiedCount}/${TEMPLATES.length} template references.`)
  console.log("  ⚠️  Templates need Meta approval before they can be used.")
  console.log("  After approval, change status from \"PENDING\" to \"APPROVED\" manually.")
  console.log(`\n  File: ${WATI_INTEGRATION_PATH}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Guide Printer — Exact steps for WATI dashboard manual creation
// ═══════════════════════════════════════════════════════════════════════════════

function printDashboardGuide() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           WATI DASHBOARD MANUAL CREATION GUIDE              ║
╚══════════════════════════════════════════════════════════════╝

Steps:
  1. Go to https://app.wati.io → Templates → Create New Template
  2. Select "Create a new template" → enter the details below
  3. Submit for Meta review (takes 24-72 hours typically)
  4. After approval, run --activate to update the codebase

`)

  for (const t of TEMPLATES) {
    const paramCount = (t.body.match(/\{\{\d+\}\}/g) || []).length
    console.log(`─── Template: ${t.elementName} ────────────────────────────`)
    console.log(`  Local key:   ${t.localKey}`)
    console.log(`  Category:    ${t.category}`)
    console.log(`  Language:    ${t.language}`)
    console.log(`  Parameters:  ${paramCount}`)
    t.callerParams.forEach((p, i) => console.log(`    {{${i + 1}}} = ${p}`))
    if (t.footer) console.log(`  Footer:      ${t.footer}`)
    if (t.buttons?.length) console.log(`  Buttons:     ${t.buttons.map(b => b.text).join(", ")}`)
    console.log(`\n  Body:\n${t.body}\n`)
  }

  console.log(`────────────────────────────────────────────────────────────`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes("--dry-run")
  const useWati = args.includes("--wati")
  const doActivate = args.includes("--activate")
  const useMeta = !!(process.env.META_ACCESS_TOKEN && process.env.WABA_ID)

  console.log("╔════════════════════════════════════════════════════╗")
  console.log("║     Sokogate WATI Template Creation               ║")
  console.log("╚════════════════════════════════════════════════════╝")

  // ── Activation mode: update wati-integration.ts ──────────────────────
  if (doActivate) {
    activateTemplates()
    return
  }

  // ── Print specs ──────────────────────────────────────────────────────
  if (isDryRun) {
    console.log(`\nMode: DRY RUN`)
  } else if (useMeta) {
    console.log(`\nMode: Meta Graph API (WABA: ${process.env.WABA_ID})`)
  } else if (useWati) {
    console.log(`\nMode: WATI API`)
  } else {
    console.log(`\nMode: Guide only`)
  }
  console.log(`Templates: ${TEMPLATES.length}\n`)

  console.log("─── Template Specifications ───\n")
  for (const t of TEMPLATES) {
    const paramCount = (t.body.match(/\{\{\d+\}\}/g) || []).length
    console.log(`  [${t.localKey}] → ${t.elementName}`)
    console.log(`  Category: ${t.category} | Params: ${paramCount}`)
    console.log(`  Caller passes: [${t.callerParams.join(", ")}]`)
    if (t.footer) console.log(`  Footer: ${t.footer}`)
    if (t.buttons?.length) console.log(`  Buttons: ${t.buttons.map(b => b.text).join(", ")}`)
    console.log("")
  }

  // ── Dry run ──────────────────────────────────────────────────────────
  if (isDryRun) {
    console.log("─── Meta Graph API Payloads ───\n")
    for (const t of TEMPLATES) {
      const components: any[] = [{ type: "BODY", text: t.body }]
      if (t.footer) components.push({ type: "FOOTER", text: t.footer })
      if (t.buttons?.length) {
        components.push({
          type: "BUTTONS",
          buttons: t.buttons.map(b => ({ type: "QUICK_REPLY", text: b.text })),
        })
      }
      console.log(JSON.stringify({
        name: t.elementName,
        category: t.category,
        language: t.language,
        components,
      }, null, 2))
      console.log("")
    }
    printDashboardGuide()
    return
  }

  // ── Submit via Meta Graph API ────────────────────────────────────────
  if (useMeta) {
    console.log("─── Submitting via Meta Graph API ───\n")
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

    console.log(`\n  Results: ${successCount} created, ${failCount} failed`)
    if (successCount > 0) {
      console.log("  Run --activate to update wati-integration.ts when approved.")
    }
    return
  }

  // ── Submit via WATI API ──────────────────────────────────────────────
  if (useWati) {
    console.log("\n─── Submitting via WATI API ───\n")
    // Try the WATI API first
    let anySuccess = false

    for (const t of TEMPLATES) {
      process.stdout.write(`  ${t.elementName}... `)
      const result = await createViaWatiAPI(t)
      if (result.success) {
        console.log(`✅ Created (ID: ${result.id})`)
        anySuccess = true
      } else {
        console.log(`❌ ${result.error}`)
      }
    }

    if (!anySuccess) {
      console.log("\n  WATI API token doesn't have template creation permissions.")
      console.log("  To use the WATI API directly:\n")
      console.log("    1. Go to https://app.wati.io → Settings → API Token")
      console.log("    2. Generate a new token with admin/owner scope")
      console.log("    3. Export WATI_API_TOKEN=<new-token> and retry")
      console.log("\n  Alternatively, use the Meta Graph API or dashboard guide below.")
    }
  }

  // ── Fallback: dashboard guide ────────────────────────────────────────
  printDashboardGuide()
}

main().catch(console.error)
