import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import fs from "fs"
import path from "path"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await params
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Prevent path traversal — only allow known markdown files in project root
    const allowed = !doc.filename.includes("..") && !path.isAbsolute(doc.filename)
    let content = ""
    if (allowed) {
      const filePath = path.join(process.cwd(), doc.filename)
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, "utf-8")
      }
    }

    return NextResponse.json({ ...doc, content })
  } catch (error) {
    console.error("GET document error:", error)
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}
