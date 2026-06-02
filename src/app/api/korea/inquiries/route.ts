import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    // Only admin users can view all inquiries
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json([])
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "50")

    const inquiries = await prisma.koreanBuyerInquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
    })

    return NextResponse.json(inquiries)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.companyName || !body.contactName || !body.email) {
      return NextResponse.json(
        { error: "companyName, contactName, and email are required" },
        { status: 400 }
      )
    }

    const inquiry = await prisma.koreanBuyerInquiry.create({
      data: {
        companyName: body.companyName,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone || null,
        jobTitle: body.jobTitle || null,
        commodityInterest: body.commodityInterest || null,
        monthlyVolume: body.monthlyVolume || null,
        additionalRequests: body.additionalRequests || null,
      },
    })

    return NextResponse.json(inquiry, { status: 201 })
  } catch (error) {
    console.error("POST inquiry error:", error)
    return NextResponse.json({ error: "Failed to create inquiry" }, { status: 500 })
  }
}
