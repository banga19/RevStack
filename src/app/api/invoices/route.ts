import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

// GET /api/invoices — List invoices, optional ?status= filter & ?clientId= filter
export const GET = withAuth(async (req: NextRequest, { session }) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const clientId = searchParams.get("clientId")

  const where: any = { userId: session.user.id }
  if (status) where.status = status
  if (clientId) where.clientId = clientId

  const invoices = await prisma.invoice.findMany({
    where,
    include: { client: { select: { name: true, company: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(invoices)
})

// POST /api/invoices — Create a manual invoice
export const POST = withAuth(async (req: NextRequest, { session }) => {
  const body = await req.json()
  const { clientId, amountUsd, currency, dueDate, notes, status } = body

  if (!clientId || !amountUsd) {
    return NextResponse.json(
      { error: "clientId and amountUsd are required" },
      { status: 400 }
    )
  }

  // Verify client belongs to user
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
  })
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  // Generate a unique invoice number
  const prefix = (client.company || client.name).substring(0, 4).toUpperCase()
  const timestamp = Date.now().toString(36).toUpperCase()
  const invoiceNumber = `INV-${prefix}-${timestamp}`

  const invoice = await prisma.invoice.create({
    data: {
      retainerId: body.retainerId || null,
      clientId,
      invoiceNumber,
      amountUsd: parseFloat(amountUsd),
      currency: currency || "USD",
      status: status || "draft",
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      issuedAt: new Date(),
      notes: notes || null,
      userId: session.user.id,
    },
    include: { client: { select: { name: true, company: true } } },
  })

  // Log activity
  await prisma.activity.create({
    data: {
      type: "invoice_generated",
      description: `Invoice ${invoiceNumber} created for ${client.name} — $${amountUsd} (manual)`,
      entityType: "invoice",
      entityId: invoice.id,
      userId: session.user.id,
    },
  })

  return NextResponse.json(invoice, { status: 201 })
})
