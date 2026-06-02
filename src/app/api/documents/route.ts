import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { qmeIntegration } from "@/lib/qme-integration"
import { ragPipeline } from "@/lib/rag-pipeline"

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Limit file uploads to 10MB
    },
  },
}

export async function GET(request: Request) {
  try {
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
          { filename: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const description = formData.get('description') as string | null
    const category = formData.get('category') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Process file with QMe integration
    const buffer = Buffer.from(await file.arrayBuffer())
    const qmeResult = await qmeIntegration.processDocument(buffer, {
      extractEntities: true,
      generateSummary: true,
      checkWorkflows: true
    })

    // Add to RAG pipeline for knowledge base
    await ragPipeline.processDocument(buffer, {
      filename: file.name,
      title: title || file.name,
      description: description || '',
      category: category || 'general',
      processedBy: 'user-upload',
      qmeDocumentId: qmeResult.documentId
    })

    // Extract file info
    const filename = file.name
    const fileTitle = title || filename.split('.').slice(0, -1).join('.') || 'Untitled Document'
    const fileDescription = description || `Uploaded document: ${filename}`
    const fileCategory = category || 'general'
    const fileSize = file.size
    const fileType = file.type

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        filename,
        title: fileTitle,
        description: fileDescription,
        category: fileCategory,
        pages: Math.max(1, Math.ceil(fileSize / 5000)), // Rough estimate
        content: qmeResult.summary || `Document processed with QMe. Extracted ${qmeResult.extractedEntities.length} entities.`
      }
    })

    // Trigger any relevant QMe workflows based on document content
    // This is already handled in the processDocument call above

    return NextResponse.json({
      success: true,
      document,
      qmeResult: {
        entities: qmeResult.extractedEntities,
        summary: qmeResult.summary,
        categories: qmeResult.categories,
        keywords: qmeResult.keywords,
        sentiment: qmeResult.sentiment
      }
    })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    const document = await prisma.document.findUnique({
      where: { id }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await prisma.document.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Document deleted' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
