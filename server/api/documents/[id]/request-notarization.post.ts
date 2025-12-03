// Request notarization for a document via PandaDoc
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const documentId = getRouterParam(event, 'id')
  
  // Only lawyers/admins can request notarization
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID is required'
    })
  }

  const db = hubDatabase()
  const pandadoc = usePandaDoc()
  
  // Get document details
  const document = await db.prepare(`
    SELECT d.*, u.email as client_email, u.first_name, u.last_name
    FROM documents d
    JOIN users u ON d.client_id = u.id
    WHERE d.id = ?
  `).bind(documentId).first()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  if (!document.requires_notary) {
    throw createError({
      statusCode: 400,
      message: 'This document does not require notarization'
    })
  }

  try {
    // Create notarization request in PandaDoc
    const result = await pandadoc.createNotarizationSession({
      documentId: document.id,
      clientEmail: document.client_email,
      clientFirstName: document.first_name,
      clientLastName: document.last_name,
      documentTitle: document.title
    })

    // Update document with PandaDoc request ID
    await db.prepare(`
      UPDATE documents
      SET 
        pandadoc_request_id = ?,
        notarization_status = 'SCHEDULED',
        updated_at = ?
      WHERE id = ?
    `).bind(result.documentId, Date.now(), documentId).run()

    return {
      success: true,
      pandaDocId: result.documentId,
      signingUrl: result.sessionUrl
    }
  } catch (error) {
    console.error('PandaDoc notarization error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to request notarization: ${error.message}`
    })
  }
})

