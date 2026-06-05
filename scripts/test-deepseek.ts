/**
 * Quick test script: verify DeepSeek API works via model-provider
 * Run: DEEPSEEK_API_KEY="sk-..." npx tsx scripts/test-deepseek.ts
 */
import { getActiveProvider, getProviderSummary, createLlm } from "../src/lib/model-provider"

async function main() {
  console.log("=".repeat(50))
  console.log("  Provider Detection:")
  console.log("=".repeat(50))
  const summary = getProviderSummary()
  console.log(summary)

  const { id, config } = getActiveProvider()
  console.log(`\n  Active: ${config.name} (${id})`)
  console.log(`  Model: ${config.defaultModel}`)
  console.log(`  Base URL: ${config.baseUrl}\n`)

  console.log("=".repeat(50))
  console.log("  API Test:")
  console.log("=".repeat(50))

  const llm = createLlm({ temperature: 0.7 })
  const res = await llm.invoke([
    { role: "user", content: "Reply with one word: hello" },
  ])

  console.log(`  Response: ${res.content}`)
  console.log(`\n  ✅ DeepSeek API works!`)
}

main().catch((err) => {
  console.error(`  ❌ DeepSeek API failed: ${err.message}`)
  process.exit(1)
})
