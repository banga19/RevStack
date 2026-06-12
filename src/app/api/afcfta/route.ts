import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

// ── HS Code Tariff Database (simplified for MVP) ───────────
// Covers top 20 African export HS chapters with illustrative AfCFTA rates
const TARIFF_DATABASE: Record<string, { description: string; baseRate: number; afcftaRate: number; phaseYears: number }> = {
  "09": { description: "Coffee, tea, maté, spices", baseRate: 15, afcftaRate: 0, phaseYears: 5 },
  "08": { description: "Edible fruit and nuts", baseRate: 20, afcftaRate: 0, phaseYears: 5 },
  "07": { description: "Edible vegetables", baseRate: 20, afcftaRate: 5, phaseYears: 3 },
  "10": { description: "Cereals", baseRate: 25, afcftaRate: 5, phaseYears: 5 },
  "12": { description: "Oil seeds, oleaginous fruits", baseRate: 15, afcftaRate: 0, phaseYears: 5 },
  "15": { description: "Animal/vegetable fats and oils", baseRate: 20, afcftaRate: 5, phaseYears: 3 },
  "25": { description: "Salt, sulfur, earths, stone", baseRate: 10, afcftaRate: 0, phaseYears: 3 },
  "26": { description: "Ores, slag and ash", baseRate: 10, afcftaRate: 0, phaseYears: 3 },
  "27": { description: "Mineral fuels, oils", baseRate: 15, afcftaRate: 5, phaseYears: 5 },
  "39": { description: "Plastics and articles", baseRate: 20, afcftaRate: 10, phaseYears: 8 },
  "40": { description: "Rubber and articles", baseRate: 20, afcftaRate: 10, phaseYears: 8 },
  "41": { description: "Raw hides and skins", baseRate: 15, afcftaRate: 0, phaseYears: 5 },
  "52": { description: "Cotton", baseRate: 20, afcftaRate: 5, phaseYears: 5 },
  "61": { description: "Apparel, knitted", baseRate: 25, afcftaRate: 10, phaseYears: 8 },
  "62": { description: "Apparel, not knitted", baseRate: 25, afcftaRate: 10, phaseYears: 8 },
  "71": { description: "Precious stones, metals", baseRate: 10, afcftaRate: 0, phaseYears: 3 },
  "72": { description: "Iron and steel", baseRate: 15, afcftaRate: 5, phaseYears: 5 },
  "73": { description: "Articles of iron/steel", baseRate: 20, afcftaRate: 10, phaseYears: 8 },
  "84": { description: "Machinery, mechanical appliances", baseRate: 15, afcftaRate: 5, phaseYears: 5 },
  "85": { description: "Electrical machinery", baseRate: 15, afcftaRate: 5, phaseYears: 5 },
  "87": { description: "Vehicles (not railway)", baseRate: 25, afcftaRate: 10, phaseYears: 8 },
  "90": { description: "Optical, medical instruments", baseRate: 10, afcftaRate: 0, phaseYears: 3 },
  "94": { description: "Furniture, bedding", baseRate: 25, afcftaRate: 10, phaseYears: 8 },
}

// ── Rules of Origin criteria ───────────────────────────────
const ORIGIN_RULES = [
  {
    key: "wholly_obtained",
    label: "Wholly Obtained",
    description: "Product is wholly obtained or produced in an AfCFTA member state",
    weight: 40,
  },
  {
    key: "substantial_transformation",
    label: "Substantial Transformation",
    description: "Product undergoes sufficient processing/transformation in AfCFTA state",
    weight: 30,
  },
  {
    key: "value_added",
    label: "Value Added (≥30%)",
    description: "At least 30% of product value added within AfCFTA member states",
    weight: 20,
  },
  {
    key: "direct_consignment",
    label: "Direct Consignment",
    description: "Product is shipped directly between AfCFTA member states",
    weight: 10,
  },
]

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const endpoint = searchParams.get("endpoint") || "tariffs"
  const hsCode = searchParams.get("hsCode") || ""
  const originCountry = searchParams.get("origin") || ""
  const destinationCountry = searchParams.get("destination") || ""
  const productValue = parseFloat(searchParams.get("value") || "10000")

  // ── 1. Tariff Lookup ─────────────────────────────────────
  if (endpoint === "tariffs") {
    const results = hsCode
      ? Object.entries(TARIFF_DATABASE)
          .filter(([code]) => code.startsWith(hsCode.substring(0, 2)))
          .map(([code, data]) => ({
            hsCode: code,
            ...data,
            currentDuty: Math.round(productValue * (data.baseRate / 100)),
            afcftaDuty: Math.round(productValue * (data.afcftaRate / 100)),
            savings: Math.round(productValue * ((data.baseRate - data.afcftaRate) / 100)),
          }))
      : Object.entries(TARIFF_DATABASE).map(([code, data]) => ({
          hsCode: code,
          ...data,
          currentDuty: Math.round(productValue * (data.baseRate / 100)),
          afcftaDuty: Math.round(productValue * (data.afcftaRate / 100)),
          savings: Math.round(productValue * ((data.baseRate - data.afcftaRate) / 100)),
        }))

    return NextResponse.json({
      productValue,
      tariffs: results,
      totalCurrentDuty: results.reduce((s, r) => s + r.currentDuty, 0),
      totalAfcftaDuty: results.reduce((s, r) => s + r.afcftaDuty, 0),
      totalSavings: results.reduce((s, r) => s + r.savings, 0),
      currency: "USD",
    })
  }

  // ── 2. Rules of Origin Checker ───────────────────────────
  if (endpoint === "rules-of-origin") {
    const rules = ORIGIN_RULES.map((rule) => {
      // Simulate compliance check based on origin country
      const afcftaMembers = ["kenya", "tanzania", "uganda", "rwanda", "ghana", "nigeria", "senegal", "south-africa", "ethiopia", "egypt"]
      const isMember = afcftaMembers.includes(originCountry.toLowerCase())
      const meetsValueAdded = isMember && Math.random() > 0.2
      const meetsDirectShipment = isMember && Math.random() > 0.1

      let compliant = false
      let details = ""

      if (rule.key === "wholly_obtained") {
        compliant = isMember
        details = isMember ? `${originCountry} is an AfCFTA member state ✓` : `${originCountry} is not yet an AfCFTA member`
      } else if (rule.key === "substantial_transformation") {
        compliant = isMember
        details = isMember ? "Processing within AfCFTA qualifies" : "Check specific product processing rules"
      } else if (rule.key === "value_added") {
        compliant = meetsValueAdded
        details = meetsValueAdded ? "Estimated 35-40% local value added ✓" : "Below 30% threshold — consider local processing"
      } else if (rule.key === "direct_consignment") {
        compliant = meetsDirectShipment
        details = meetsDirectShipment ? `Direct shipment from ${originCountry} to ${destinationCountry} available ✓` : "Transshipment documentation needed"
      }

      return {
        ...rule,
        compliant,
        details,
      }
    })

    const compliantCount = rules.filter((r) => r.compliant).length
    const totalWeight = rules.reduce((s, r) => s + (r.compliant ? r.weight : 0), 0)

    return NextResponse.json({
      origin: originCountry,
      destination: destinationCountry,
      rules,
      complianceScore: Math.round((totalWeight / 100) * 100),
      qualifiesForPreferential: totalWeight >= 60,
      certificateRequired: totalWeight >= 80 ? "AfCFTA Certificate of Origin required" : "May qualify under national treatment",
    })
  }

  // ── 3. Compliance Dashboard Data ─────────────────────────
  if (endpoint === "compliance") {
    const complianceRecords = await prisma.clientCompliance.findMany({
      include: {
        client: { select: { name: true, company: true } },
        product: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    })

    const certificationTypes = Array.from(new Set(complianceRecords.map((r) => r.certificationType)))
    const complianceByType = certificationTypes.map((type) => {
      const records = complianceRecords.filter((r) => r.certificationType === type)
      return {
        type,
        total: records.length,
        obtained: records.filter((r) => r.status === "obtained").length,
        inProgress: records.filter((r) => r.status === "in-progress").length,
        notStarted: records.filter((r) => r.status === "not-started").length,
        expired: records.filter((r) => r.status === "expired").length,
      }
    })

    const expiringSoon = complianceRecords.filter((r) => {
      if (!r.expiresAt) return false
      const expDate = new Date(r.expiresAt)
      const daysUntilExpiry = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30
    })

    return NextResponse.json({
      totalRecords: complianceRecords.length,
      obtainedCount: complianceRecords.filter((r) => r.status === "obtained").length,
      inProgressCount: complianceRecords.filter((r) => r.status === "in-progress").length,
      notStartedCount: complianceRecords.filter((r) => r.status === "not-started").length,
      expiredCount: complianceRecords.filter((r) => r.status === "expired").length,
      byType: complianceByType,
      expiringSoon: expiringSoon.map((r) => ({
        id: r.id,
        clientName: r.client.name,
        certificationType: r.certificationType,
        expiresAt: r.expiresAt,
        daysRemaining: r.expiresAt ? Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
      })),
    })
  }

  // ── 4. Market Access Requirements ────────────────────────
  if (endpoint === "market-requirements") {
    const country = originCountry.toLowerCase()
    const requirements: Record<string, { required: string[]; recommended: string[]; notes: string }> = {
      kenya: {
        required: ["HACCP", "Phytosanitary"],
        recommended: ["Organic", "Fair Trade"],
        notes: "Kenya has preferential access under EAC-EU EPA. Additional Korean import permits needed for Korea corridor.",
      },
      tanzania: {
        required: ["HACCP", "Halal"],
        recommended: ["Organic", "GOTS"],
        notes: "Tanzania qualifies under EAC-SADC-COMESA. Halal certification required for food exports.",
      },
      uganda: {
        required: ["Phytosanitary", "HACCP"],
        recommended: ["Organic", "Fair Trade"],
        notes: "Uganda benefits from EAC preferential rates. Organic certification opens EU market.",
      },
      ghana: {
        required: ["Phytosanitary", "HACCP"],
        recommended: ["Organic", "Halal"],
        notes: "Ghana under ECOWAS preferential. Cocoa exports benefit from reduced AfCFTA rates.",
      },
      nigeria: {
        required: ["HACCP", "ISO 9001"],
        recommended: ["Halal", "SON"],
        notes: "Largest AfCFTA market. SONCAP compliance needed for manufactured goods.",
      },
    }

    const req = requirements[country] || requirements.kenya

    return NextResponse.json({
      country: originCountry,
      requiredCertifications: req.required,
      recommendedCertifications: req.recommended,
      notes: req.notes,
      marketInsights: [
        `AfCFTA preferential rate: Up to 100% tariff reduction on qualifying goods from ${originCountry}`,
        `Rules of origin: Minimum 30% local value content required for preferential treatment`,
        `Non-tariff barriers: Sanitary/phytosanitary (SPS) + technical barriers to trade (TBT) apply`,
      ],
    })
  }

  return NextResponse.json({ error: "Unknown endpoint. Use: tariffs, rules-of-origin, compliance, market-requirements" }, { status: 400 })
})
