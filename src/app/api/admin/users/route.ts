import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { onboardingResponses: true } },
    },
  })

  return NextResponse.json(users)
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { userId, role } = body

    if (!userId || !role || !["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Prevent removing your own admin role
    if (userId === session.user.id && role !== "admin") {
      return NextResponse.json({ error: "Cannot remove your own admin role" }, { status: 400 })
    }

    // Prevent removing the last admin
    if (role !== "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 })
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
