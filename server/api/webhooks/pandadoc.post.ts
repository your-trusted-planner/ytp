// Webhook endpoint for PandaDoc status updates
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = hubDatabase()
  
  // Verify webhook signature (if configured)
  // const signature = getHeader(event, 'X-PandaDoc-Signature')
  // TODO: Implement signature verification for security

  console.log('PandaDoc webhook received:', body)

  try {
    const pandaDocId = body.data?.id
    const status = body.event

    if (!pandaDocId) {
      throw new Error('No document ID in webhook')
    }

    // Find document by PandaDoc request ID
    const document = await db.prepare(`
      SELECT * FROM documents WHERE pandadoc_request_id = ?
    `).bind(pandaDocId).first()

    if (!document) {
      console.warn('Document not found for PandaDoc ID:', pandaDocId)
      return { success: false, error: 'Document not found' }
    }

    // Map PandaDoc status to our notarization status
    let notarizationStatus = 'PENDING'
    let documentStatus = document.status

    switch (status) {
      case 'document_state_changed':
        if (body.data?.status === 'document.completed') {
          notarizationStatus = 'COMPLETED'
          documentStatus = 'SIGNED' // Also mark document as signed
        } else if (body.data?.status === 'document.sent') {
          notarizationStatus = 'SCHEDULED'
        }
        break
      case 'recipient_completed':
        // Recipient finished signing
        notarizationStatus = 'COMPLETED'
        documentStatus = 'SIGNED'
        break
      case 'document_deleted':
        notarizationStatus = 'NOT_REQUIRED'
        break
    }

    // Update document
    await db.prepare(`
      UPDATE documents
      SET 
        notarization_status = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      notarizationStatus,
      documentStatus,
      Date.now(),
      document.id
    ).run()

    // Log activity
    // TODO: Create activity log entry

    return { success: true }
  } catch (error) {
    console.error('Error processing PandaDoc webhook:', error)
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
})

