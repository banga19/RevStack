/**
 * Hermes LangChain Tools — Re-export Hub
 *
 * Aggregates all LangChain tool definitions for the Hermes autonomous
 * sales pipeline. Import individual tools or the full array for
 * binding to LangGraph nodes.
 *
 * Usage:
 *   import { watiSendTemplate, sokogateSearchProducts } from "./tools"
 *   // or
 *   import { allHermesTools } from "./tools"
 *   const model = createLlm().bindTools(allHermesTools)
 */

// ── WATI.io WhatsApp ─────────────────────────────────────────
import { watiSendTemplate, watiSendMessage } from "./wati"

// ── Sokogate Trade Platform ──────────────────────────────────
import {
  sokogateSearchProducts,
  sokogateFindMatches,
  sokogateGetBuyers,
} from "./sokogate"

// ── Export Readiness Score (ERS) ────────────────────────────
import {
  calculateERS,
  getERSReadiness,
} from "./exportReadiness"

// ── Email ────────────────────────────────────────────────────
import { emailSendSequence, emailSendWelcome } from "./email"

// ============================================================
// All Tools Array
// ============================================================

/**
 * Convenience array of all Hermes tools for binding to an LLM model.
 *
 * Example:
 *   import { allHermesTools } from "./tools"
 *   const model = createLlm({ temperature: 0 }).bindTools(allHermesTools)
 */
export const allHermesTools = [
  watiSendTemplate,
  watiSendMessage,
  sokogateSearchProducts,
  sokogateFindMatches,
  sokogateGetBuyers,
  calculateERS,
  getERSReadiness,
  emailSendSequence,
  emailSendWelcome,
]

export {
  watiSendTemplate,
  watiSendMessage,
  sokogateSearchProducts,
  sokogateFindMatches,
  sokogateGetBuyers,
  calculateERS,
  getERSReadiness,
  emailSendSequence,
  emailSendWelcome,
}
