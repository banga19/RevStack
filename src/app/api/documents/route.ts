import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"
import { qmeIntegration } from "@/lib/qme-integration"
import { ragPipeline } from "@/lib/rag-pipeline"

export const GET = withAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  let whereClause: any = {}

  if (category) {
    whereClause.category = category
  }

  if (search) {
    whereClause = {
      ...whereClause,
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { filename: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  const documents = await prisma.document.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(documents)
})

export const POST = withAuth(async (request: Request) => {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const title = formData.get('title') as string | null
  const description = formData.get('description') as string | null
  const category = formData.get('category') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const qmeResult = await qmeIntegration.processDocument(buffer, {
    extractEntities: true,
    generateSummary: true,
    checkWorkflows: true,
  })

  await ragPipeline.processDocument(buffer, {
    filename: file.name,
    title: title || file.name,
    description: description || '',
    category: category || 'general',
    processedBy: 'user-upload',
    qmeDocumentId: qmeResult.documentId,
  })

  const filename = file.name
  const fileTitle = title || filename.split('.').slice(0, -1).join('.') || 'Untitled Document'
  const fileDescription = description || `Uploaded document: ${filename}`
  const fileCategory = category || 'general'
  const fileSize = file.size
  const fileType = file.type

  const document = await prisma.document.create({
    data: {
      filename,
      title: fileTitle,
      description: fileDescription,
      category: fileCategory,
      pages: Math.max(1, Math.ceil(fileSize / 5000)),
      content: qmeResult.summary || `Document processed with QMe. Extracted ${qmeResult.extractedEntities.length} entities.`,
    },
  })

  return NextResponse.json({
    success: true,
    document,
    qmeResult: {
      entities: qmeResult.extractedEntities,
      summary: qmeResult.summary,
      categories: qmeResult.categories,
      keywords: qmeResult.keywords,
      sentiment: qmeResult.sentiment,
    },
  })
})

export const DELETE = withAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
  }

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
