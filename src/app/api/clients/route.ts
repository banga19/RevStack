import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const clients = await prisma.client.findMany({ orderBy: { createdAt: "desc" } })
    return NextResponse.json(clients)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const client = await prisma.client.create({
      data: {
        name: body.name,
        company: body.company,
        email: body.email,
        phone: body.phone || null,
        status: body.status || "lead",
        tier: body.tier || null,
        monthlyRetainer: body.monthlyRetainer ? parseFloat(body.monthlyRetainer) : null,
        setupFee: body.setupFee ? parseFloat(body.setupFee) : null,
        source: body.source || null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error("POST client error:", error)
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
  }
}
