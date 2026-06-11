import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { withAuth } from "@/lib/abac-middleware"

// PATCH /api/invoices/:id — Update invoice status (mark as sent, paid, cancelled)
export const PATCH = withAuth(async (req: NextRequest, { params, session }) => {
  const { id } = await params
  const body = await req.json()

  // Verify invoice belongs to user
  const existing = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: { client: { select: { name: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const validStatuses = ["draft", "sent", "paid", "overdue", "cancelled"]
  const updateData: Record<string, any> = {}

  if (body.status !== undefined) {
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }
    updateData.status = body.status

    // When marking as paid, record paidAt timestamp
    if (body.status === "paid") {
      updateData.paidAt = new Date()
    }
    // When un-marking paid, clear paidAt
    if (body.status !== "paid" && existing.status === "paid") {
      updateData.paidAt = null
    }
  }

  if (body.notes !== undefined) {
    updateData.notes = body.notes
  }
  if (body.dueDate !== undefined) {
    updateData.dueDate = new Date(body.dueDate)
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: { client: { select: { name: true, company: true } } },
  })

  // Log activity for status changes
  if (body.status && body.status !== existing.status) {
    const description = body.status === "paid"
      ? `Invoice ${existing.invoiceNumber} marked as paid — $${existing.amountUsd}`
      : `Invoice ${existing.invoiceNumber} status updated to '${body.status}'`

    await prisma.activity.create({
      data: {
        type: "invoice_updated",
        description,
        entityType: "invoice",
        entityId: invoice.id,
        userId: session.user.id,
      },
    })
  }

  return NextResponse.json(invoice)
})

// DELETE /api/invoices/:id — Delete an invoice
export const DELETE = withAuth(async (_req: NextRequest, { params, session }) => {
  const { id } = await params

  // Verify invoice belongs to user
  const existing = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id },
    include: { client: { select: { name: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Only allow deleting draft or cancelled invoices
  if (!["draft", "cancelled"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Only draft or cancelled invoices can be deleted" },
      { status: 400 }
    )
  }

  await prisma.invoice.delete({ where: { id } })

  await prisma.activity.create({
    data: {
      type: "invoice_deleted",
      description: `Invoice ${existing.invoiceNumber} ($${existing.amountUsd}) deleted`,
      entityType: "invoice",
      entityId: id,
      userId: session.user.id,
    },
  })

  return NextResponse.json({ deleted: true })
})
