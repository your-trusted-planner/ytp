// Check notarization status from PandaDoc
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const documentId = getRouterParam(event, 'id')
  
  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID is required'
    })
  }

  const db = hubDatabase()
  
  // Get document
  const document = await db.prepare(`
    SELECT * FROM documents WHERE id = ?
  `).bind(documentId).first()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  // Check authorization
  const canView = 
    user.role === 'LAWYER' ||
    user.role === 'ADMIN' ||
    user.id === document.client_id

  if (!canView) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  if (!document.pandadoc_request_id) {
    return {
      status: 'NOT_REQUESTED',
      message: 'Notarization has not been requested for this document'
    }
  }

  try {
    const pandadoc = usePandaDoc()
    const status = await pandadoc.getDocumentStatus(document.pandadoc_request_id)

    // Update local status based on PandaDoc status
    let notarizationStatus = 'PENDING'
    if (status.status === 'document.completed') {
      notarizationStatus = 'COMPLETED'
    } else if (status.status === 'document.sent') {
      notarizationStatus = 'SCHEDULED'
    }

    await db.prepare(`
      UPDATE documents
      SET notarization_status = ?, updated_at = ?
      WHERE id = ?
    `).bind(notarizationStatus, Date.now(), documentId).run()

    return {
      status: notarizationStatus,
      pandaDocStatus: status.status,
      details: status
    }
  } catch (error) {
    console.error('Error checking PandaDoc status:', error)
    return {
      status: document.notarization_status,
      error: error.message
    }
  }
})



