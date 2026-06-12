import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"
import { getOrgScope, orgWhereClause } from "@/lib/get-org-scope"

export const POST = withAbac(RESOURCES.PROSPECTS, "write", async (req, { session }) => {
  const scope = await getOrgScope(session.user.id)
  const organizationId = scope.organizationId || session.user.id

  const contentType = req.headers.get("content-type") || ""
  let prospectsData: Array<Record<string, string | undefined>> = []

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV file appears empty" }, { status: 400 })
    }
    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""))
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i])
      const row: Record<string, string | undefined> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || undefined
      })
      prospectsData.push(row)
    }
  } else {
    const body = await req.json()
    if (Array.isArray(body.prospects)) {
      prospectsData = body.prospects
    } else if (Array.isArray(body)) {
      prospectsData = body
    } else {
      return NextResponse.json({ error: "Expected { prospects: [...] } or array of prospect objects" }, { status: 400 })
    }
  }

  if (prospectsData.length === 0) {
    return NextResponse.json({ error: "No prospect data provided" }, { status: 400 })
  }

  const created: Array<{ id: string; email?: string | null; company?: string | null }> = []
  const failed: Array<{ index: number; reason: string }> = []

  for (let i = 0; i < prospectsData.length; i++) {
    const p = prospectsData[i]
    try {
      if (!p.firstname && !p.lastname && !p.email && !p.phone && !p.company) {
        failed.push({ index: i, reason: "At least one identifier required" })
        continue
      }
      const prospect = await prisma.prospect.create({
        data: {
          organizationId,
          firstName: p.firstname || p.first_name || p["first name"] || null,
          lastName: p.lastname || p.last_name || p["last name"] || null,
          email: p.email || null,
          phone: p.phone || p["phone number"] || null,
          whatsapp: p.whatsapp || null,
          linkedin: p.linkedin || null,
          company: p.company || p["company name"] || p["organization"] || null,
          title: p.title || p["job title"] || p.position || null,
          industry: p.industry || null,
          source: "csv-import",
        },
      })
      created.push({ id: prospect.id, email: prospect.email, company: prospect.company })
    } catch (err) {
      failed.push({ index: i, reason: (err as Error).message })
    }
  }

  return NextResponse.json({
    success: true,
    imported: created.length,
    failed: failed.length,
    prospects: created,
    errors: failed.length > 0 ? failed : undefined,
  })
})

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}
