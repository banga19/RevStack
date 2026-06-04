import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import fs from "fs"
import path from "path"

export const GET = withAuth(async (request: NextRequest, { params }) => {
  const { id } = await params
  const document = await prisma.document.findUnique({
    where: { id },
  })
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // If the document has stored content, return it directly
  if (document.content) {
    return NextResponse.json(document)
  }

  // Otherwise, try to read from the filesystem
  const projectRoot = process.cwd()
  const filePath = path.join(projectRoot, document.filename)

  // Reject path traversal
  if (document.filename.includes("..")) {
    return NextResponse.json({ ...document, content: "" })
  }

  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, "utf-8")
    return NextResponse.json({ ...document, content: fileContent })
  }

  return NextResponse.json({ ...document, content: "" })
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
