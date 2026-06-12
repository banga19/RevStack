import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

const CORRIDORS = [
  { id: "ke-ug", name: "Kenya → Uganda", focus: "Cross-border FMCG", targetClients: 10, countries: ["kenya", "uganda"] },
  { id: "tz-drc", name: "Tanzania → DRC", focus: "Mineral & agricultural trade", targetClients: 8, countries: ["tanzania", "drc"] },
  { id: "rw-east-africa", name: "Rwanda → East Africa", focus: "Trade hub strategy", targetClients: 5, countries: ["rwanda", "kenya", "uganda", "tanzania"] },
  { id: "ke-korea", name: "Kenya → Korea", focus: "Korea-Africa corridor (via Sokogate)", targetClients: 7, countries: ["kenya", "south-korea"] },
  { id: "afcfta-intra", name: "AfCFTA Intra-Africa", focus: "Continental trade", targetClients: 20, countries: ["kenya", "tanzania", "uganda", "rwanda", "ghana", "nigeria", "senegal"] },
  { id: "ng-gh", name: "Nigeria → Ghana", focus: "ECOWAS corridor", targetClients: 10, countries: ["nigeria", "ghana"] },
  { id: "ke-ng", name: "Kenya → Nigeria", focus: "Pan-Africa trade", targetClients: 8, countries: ["kenya", "nigeria"] },
  { id: "gh-sn", name: "Ghana → Senegal", focus: "West Africa corridor", targetClients: 6, countries: ["ghana", "senegal"] },
]

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const corridorId = searchParams.get("corridorId")
  const country = searchParams.get("country")

  let filtered = CORRIDORS
  if (corridorId) filtered = filtered.filter((c) => c.id === corridorId)
  if (country) filtered = filtered.filter((c) => c.countries.includes(country.toLowerCase()))

  return NextResponse.json({ corridors: filtered })
})

export const POST = withAuth(async (req: NextRequest, { session }) => {
  const userId = session.user.id as string
  const body = await req.json().catch(() => ({}))
  const corridorId = body.corridorId
  const clientId = body.clientId || null
  const notes = body.notes || null

  const corridor = CORRIDORS.find((c) => c.id === corridorId)
  if (!corridor) {
    return NextResponse.json({ error: "Invalid corridorId" }, { status: 400 })
  }

  const enrollment = await prisma.onboardingResponse.update({
    where: { userId },
    data: {
      primaryGoal: `corridor:${corridorId}`,
      additionalNotes: notes,
    },
  }).catch(async () => {
    return await prisma.onboardingResponse.create({
      data: {
        userId,
        businessName: "",
        industry: "trade",
        primaryGoal: `corridor:${corridorId}`,
        additionalNotes: notes,
        completed: true,
      },
    })
  })

  return NextResponse.json({ corridor, enrollment }, { status: 201 })
})
