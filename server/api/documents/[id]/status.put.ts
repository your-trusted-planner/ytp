// Update document status and signature readiness
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const documentId = getRouterParam(event, 'id')

  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required'
    })
  }

  const body = await readBody(event)
  const { status, readyForSignature, attorneyApproved } = body

  if (!status) {
    throw createError({
      statusCode: 400,
      message: 'Status is required'
    })
  }

  // Validate status
  const validStatuses = ['DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED']
  if (!validStatuses.includes(status)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid status'
    })
  }

  const { useDrizzle, schema } = await import('../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get the document to check authorization
  const document = await db.select()
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId))
    .get()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  // Prevent status changes on signed/completed documents
  if (document.status === 'SIGNED' || document.status === 'COMPLETED') {
    throw createError({
      statusCode: 400,
      message: 'Cannot change status of a signed document'
    })
  }

  // Only lawyers/admins/staff can update document status
  if (!['LAWYER', 'ADMIN', 'STAFF'].includes(user.role)) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Build update object
  const updateData: Record<string, any> = {
    status,
    updatedAt: new Date()
  }

  // Handle readyForSignature flag
  if (readyForSignature !== undefined) {
    updateData.readyForSignature = readyForSignature
    if (readyForSignature) {
      updateData.readyForSignatureAt = new Date()
    }
  }

  // Handle attorneyApproved flag
  if (attorneyApproved !== undefined) {
    updateData.attorneyApproved = attorneyApproved
    if (attorneyApproved) {
      updateData.attorneyApprovedAt = new Date()
      updateData.attorneyApprovedBy = user.id
    }
  }

  // Update the document
  await db.update(schema.documents)
    .set(updateData)
    .where(eq(schema.documents.id, documentId))

  return { success: true, status }
})
