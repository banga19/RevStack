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
export { watiSendTemplate, watiSendMessage } from "./wati"

// ── Sokogate Trade Platform ──────────────────────────────────
export {
  sokogateSearchProducts,
  // Alias for README Phase 5 compatibility
  sokogateSearchProducts as sokogateProductSearch,
  sokogateFindMatches,
  sokogateGetBuyers,
} from "./sokogate"

// ── Export Readiness Score (ERS) ────────────────────────────
export {
  calculateERS,
  // Alias for README Phase 5 compatibility
  calculateERS as exportReadinessCalculator,
  getERSReadiness,
} from "./exportReadiness"

// ── Email ────────────────────────────────────────────────────
export { emailSendSequence, emailSendWelcome } from "./email"

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
