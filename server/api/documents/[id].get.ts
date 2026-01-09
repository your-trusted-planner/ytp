// Get a single document by ID with template details
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const documentId = getRouterParam(event, 'id')

  if (!documentId) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required'
    })
  }

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get document
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

  // Authorization: lawyers/admins can view any document, clients only their own
  if (user.role === 'CLIENT' && document.clientId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Get template info if document has a template
  let template = null
  if (document.templateId) {
    template = await db.select()
      .from(schema.documentTemplates)
      .where(eq(schema.documentTemplates.id, document.templateId))
      .get()
  }

  // Get client info
  let clientInfo = null
  if (document.clientId) {
    clientInfo = await db.select({
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      email: schema.users.email
    })
      .from(schema.users)
      .where(eq(schema.users.id, document.clientId))
      .get()
  }

  // Parse template variables if they exist
  let templateVariables = []
  if (template?.variables) {
    try {
      templateVariables = JSON.parse(template.variables)
    } catch (e) {
      console.error('Error parsing template variables:', e)
    }
  }

  // Return document with template data nested - include both camelCase and snake_case
  return {
    id: document.id,
    // camelCase (backwards compatibility)
    title: document.title,
    description: document.description,
    status: document.status,
    templateId: document.templateId,
    matterId: document.matterId,
    content: document.content,
    docxBlobKey: document.docxBlobKey,
    filePath: document.filePath,
    fileSize: document.fileSize,
    mimeType: document.mimeType,
    variableValues: document.variableValues,
    notarizationStatus: document.notarizationStatus,
    pandadocRequestId: document.pandadocRequestId,
    requiresNotary: document.requiresNotary,
    attorneyApproved: document.attorneyApproved,
    attorneyApprovedAt: document.attorneyApprovedAt instanceof Date ? document.attorneyApprovedAt.getTime() : document.attorneyApprovedAt,
    attorneyApprovedBy: document.attorneyApprovedBy,
    readyForSignature: document.readyForSignature,
    readyForSignatureAt: document.readyForSignatureAt instanceof Date ? document.readyForSignatureAt.getTime() : document.readyForSignatureAt,
    clientId: document.clientId,
    signedAt: document.signedAt instanceof Date ? document.signedAt.getTime() : document.signedAt,
    signatureData: document.signatureData,
    viewedAt: document.viewedAt instanceof Date ? document.viewedAt.getTime() : document.viewedAt,
    sentAt: document.sentAt instanceof Date ? document.sentAt.getTime() : document.sentAt,
    createdAt: document.createdAt instanceof Date ? document.createdAt.getTime() : document.createdAt,
    updatedAt: document.updatedAt instanceof Date ? document.updatedAt.getTime() : document.updatedAt,
    // snake_case versions for API compatibility
    template_id: document.templateId,
    matter_id: document.matterId,
    docx_blob_key: document.docxBlobKey,
    file_path: document.filePath,
    file_size: document.fileSize,
    mime_type: document.mimeType,
    variable_values: document.variableValues,
    notarization_status: document.notarizationStatus,
    pandadoc_request_id: document.pandadocRequestId,
    requires_notary: document.requiresNotary ? 1 : 0,
    attorney_approved: document.attorneyApproved ? 1 : 0,
    attorney_approved_at: document.attorneyApprovedAt instanceof Date ? document.attorneyApprovedAt.getTime() : document.attorneyApprovedAt,
    attorney_approved_by: document.attorneyApprovedBy,
    ready_for_signature: document.readyForSignature ? 1 : 0,
    ready_for_signature_at: document.readyForSignatureAt instanceof Date ? document.readyForSignatureAt.getTime() : document.readyForSignatureAt,
    client_id: document.clientId,
    signed_at: document.signedAt instanceof Date ? document.signedAt.getTime() : document.signedAt,
    signature_data: document.signatureData,
    viewed_at: document.viewedAt instanceof Date ? document.viewedAt.getTime() : document.viewedAt,
    sent_at: document.sentAt instanceof Date ? document.sentAt.getTime() : document.sentAt,
    created_at: document.createdAt instanceof Date ? document.createdAt.getTime() : document.createdAt,
    updated_at: document.updatedAt instanceof Date ? document.updatedAt.getTime() : document.updatedAt,
    // Client info
    clientFirstName: clientInfo?.firstName || null,
    clientLastName: clientInfo?.lastName || null,
    clientEmail: clientInfo?.email || null,
    client_first_name: clientInfo?.firstName || null,
    client_last_name: clientInfo?.lastName || null,
    client_email: clientInfo?.email || null,
    // Template info
    template: {
      name: template?.name || null,
      variables: template?.variables || null,
      variableMappings: template?.variableMappings || null,
      variable_mappings: template?.variableMappings || null,
      category: template?.category || null
    }
  }
})



