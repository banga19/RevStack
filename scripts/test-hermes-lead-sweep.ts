/**
 * Hermes Lead Sweep — LangGraph Autonomous Pipeline
 *
 * Tests the full Hermes agent pipeline with NVIDIA Nemotron:
 *   1. Startup analysis → 2. RAG context retrieval → 3. LLM planning
 *   4. Agent service bridge execution → 5. Agent memory storage
 *
 * Run with:
 *   NVIDIA_NIM_API_KEY="nvapi-..." npx tsx scripts/test-hermes-lead-sweep.ts
 */

import { hermesAgent } from "../src/lib/hermes-agent"
import { agentMemory } from "../src/lib/agent-memory"
import { getProviderSummary } from "../src/lib/model-provider"

async function main() {
  console.log("=".repeat(72))
  console.log("  🤖 HERMES AGENT — LEAD SWEEP AUTONOMOUS PIPELINE")
  console.log("=".repeat(72))
  console.log()

  // Show which model provider is active
  console.log("  Model Provider:")
  const summary = getProviderSummary()
  for (const line of summary.split("\n")) {
    console.log(`    ${line}`)
  }
  console.log()

  const start = Date.now()

  // Run the Hermes lead sweep — this triggers the full LangGraph workflow:
  // retrieveContext → planWorkflow → executeAction → finalizeOperation
  const result = await hermesAgent.runLeadSweep("system")

  const totalDuration = ((Date.now() - start) / 1000).toFixed(1)

  console.log("─".repeat(72))
  console.log("  📋 LEAD SWEEP RESULTS")
  console.log("─".repeat(72))
  console.log()
  console.log(`  Operation ID: ${result.id}`)
  console.log(`  Status:       ${result.status === "completed" ? "✅ completed" : "❌ " + result.status}`)
  console.log(`  Duration:     ${totalDuration}s`)
  console.log()

  // Planned actions
  console.log("  ── Planned Actions ──")
  if (result.plannedActions.length === 0) {
    console.log("     (none — planning may have failed)")
  } else {
    for (const action of result.plannedActions) {
      const priorityIcon =
        action.priority === "critical"
          ? "🔴"
          : action.priority === "high"
            ? "🟠"
            : action.priority === "medium"
              ? "🟡"
              : "⚪"
      console.log(
        `     ${priorityIcon} ${action.agentType.toUpperCase()}: ${action.action.substring(0, 80)}...`
      )
      console.log(`        Priority: ${action.priority} | Reasoning: ${action.reasoning.substring(0, 60)}...`)
    }
  }
  console.log()

  // Execution results
  console.log("  ── Execution Results ──")
  if (result.results.length === 0) {
    console.log("     (no actions executed)")
  } else {
    for (const exec of result.results) {
      const icon = exec.result.success ? "✅" : "❌"
      console.log(
        `     ${icon} ${exec.action.agentType.toUpperCase()}: ${exec.result.summary.substring(0, 100)}`
      )
      if (exec.result.details) {
        // Print credential banners and key details (first ~5 lines)
        const detailLines = exec.result.details.split("\n").filter(l => l.trim())
        const bannerLines = detailLines.filter(l => l.includes('📋') || l.includes('⚠️') || l.includes('✅') || l.includes('❌'))
        for (const line of bannerLines.slice(0, 8)) {
          console.log(`        ${line}`)
        }
      }
      if (exec.result.metrics && Object.keys(exec.result.metrics).length > 0) {
        for (const [k, v] of Object.entries(exec.result.metrics)) {
          console.log(`        📊 ${k}: ${v}`)
        }
      }
    }
  }
  console.log()

  // Errors
  if (result.errors.length > 0) {
    console.log("  ── Errors ──")
    for (const err of result.errors) {
      console.log(`     ❌ ${err.substring(0, 120)}`)
    }
    console.log()
  }

  // Insights
  console.log("  ── Agent Memory Insights ──")
  if (result.insights.length === 0) {
    console.log("     (no insights generated)")
  } else {
    for (const insight of result.insights) {
      console.log(`     💡 [${insight.agentType}] ${insight.title}`)
      console.log(`        ${insight.description.substring(0, 100)}`)
    }
  }
  console.log()

  // Agent memory system state
  console.log("  ── Agent Memory Stats ──")
  const memorySummary = agentMemory.getSummary()
  console.log(`     ${memorySummary}`)
  console.log()

  console.log("=".repeat(72))
  console.log(`  ${result.status === "completed" ? "✅" : "❌"} LEAD SWEEP COMPLETE — ${totalDuration}s`)
  console.log("=".repeat(72))
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
