import { readFileSync, existsSync } from "node:fs"

const SCHEMA_PATH = "prisma/schema.prisma"

function linesBetweenModel(content: string, modelName: string): string[] {
  const lines = content.split("\n")
  const result: string[] = []
  let inside = false
  let depth = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!inside) {
      if (trimmed === `model ${modelName} {` || trimmed.startsWith(`model ${modelName} {`)) {
        inside = true
        depth = 1
        continue
      }
      continue
    }

    for (const ch of trimmed) {
      if (ch === "{") depth++
      if (ch === "}") depth--
    }

    if (depth <= 0) break
    result.push(trimmed)
  }

  return result
}

function hasField(lines: string[], fieldName: string): boolean {
  for (const line of lines) {
    if (line.startsWith("//") || line.startsWith("/*")) continue
    const m = line.match(new RegExp(`^${fieldName}\\s+(\\w+)`))
    if (m) return true
  }
  return false
}

function checkSchema() {
  if (!existsSync(SCHEMA_PATH)) {
    console.log("FAIL: schema file not found at prisma/schema.prisma")
    process.exit(1)
  }

  const content = readFileSync(SCHEMA_PATH, "utf-8")

  const checks: { model: string; field: string }[] = [
    { model: "Client", field: "licenseProfile" },
    { model: "TradeFinanceApplication", field: "licenseProfile" },
  ]

  const missing: string[] = []

  for (const c of checks) {
    const body = linesBetweenModel(content, c.model)
    if (!hasField(body, c.field)) {
      missing.push(`${c.model}.${c.field}`)
    }
  }

  if (missing.length === 0) {
    console.log("PASS")
    process.exit(0)
  }

  console.log("FAIL")
  console.log("Missing fields on schema:")
  for (const m of missing) {
    console.log(`  - ${m}`)
  }
  process.exit(1)
}

checkSchema()
