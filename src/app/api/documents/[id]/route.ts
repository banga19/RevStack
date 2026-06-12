import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

async function tryReadLocalFile(filename: string | null) {
  if (!filename || filename.includes("..")) return null
  try {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const projectRoot = process.cwd()
    const filePath = path.join(projectRoot, filename)
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8")
    }
  } catch (error) {
    console.warn("[documents] local read failed", error)
  }
  return null
}

export const GET = withAuth(async (request: NextRequest, { params }) => {
  const { id } = await params
  const document = await prisma.document.findUnique({
    where: { id },
  })
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  if (document.content) {
    return NextResponse.json(document)
  }

  const local = await tryReadLocalFile(document.filename)
  return NextResponse.json({ ...document, content: local ?? "" })
})

export const PUT = withAuth(async (request: NextRequest, { params }) => {
  const { id } = await params
  const body = await request.json()
  const document = await prisma.document.update({
    where: { id },
    data: body,
  })
  return NextResponse.json(document)
})

export const DELETE = withAuth(async (request: NextRequest, { params }) => {
  const { id } = await params

  const document = await prisma.document.findUnique({
    where: { id },
  })
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  await prisma.document.delete({
    where: { id },
  })

  return NextResponse.json({ success: true, message: 'Document deleted' })
})
