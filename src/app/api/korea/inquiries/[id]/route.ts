import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAbac } from "@/lib/abac-middleware"
import { RESOURCES } from "@/lib/abac"

export const PUT = withAbac(RESOURCES.admin, "admin", async (req: NextRequest, { params }) => {
  const { id } = await params
  const body = await req.json()

  const inquiry = await prisma.koreanBuyerInquiry.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  })

  return NextResponse.json(inquiry)
})
