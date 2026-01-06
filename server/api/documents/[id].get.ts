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

  const db = hubDatabase()

  // Get document with template info
  const document = await db.prepare(`
    SELECT
      d.*,
      dt.name as template_name,
      dt.variables as template_variables,
      dt.variable_mappings as template_variable_mappings,
      dt.category as template_category,
      u.first_name as client_first_name,
      u.last_name as client_last_name,
      u.email as client_email
    FROM documents d
    LEFT JOIN document_templates dt ON d.template_id = dt.id
    LEFT JOIN users u ON d.client_id = u.id
    WHERE d.id = ?
  `).bind(documentId).first()

  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }

  // Authorization: lawyers/admins can view any document, clients only their own
  if (user.role === 'CLIENT' && document.client_id !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  // Parse template variables if they exist
  let templateVariables = []
  if (document.template_variables) {
    try {
      templateVariables = JSON.parse(document.template_variables)
    } catch (e) {
      console.error('Error parsing template variables:', e)
    }
  }

  // Return document with template data nested and all fields in camelCase
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    status: document.status,
    templateId: document.template_id,
    matterId: document.matter_id,
    content: document.content,
    docxBlobKey: document.docx_blob_key,
    filePath: document.file_path,
    fileSize: document.file_size,
    mimeType: document.mime_type,
    variableValues: document.variable_values,
    requiresNotary: document.requires_notary,
    notarizationStatus: document.notarization_status,
    clientId: document.client_id,
    signedAt: document.signed_at,
    signatureData: document.signature_data,
    viewedAt: document.viewed_at,
    sentAt: document.sent_at,
    createdAt: document.created_at,
    updatedAt: document.updated_at,
    // Client info
    clientFirstName: document.client_first_name,
    clientLastName: document.client_last_name,
    clientEmail: document.client_email,
    // Template info
    template: {
      name: document.template_name,
      variables: document.template_variables,
      variableMappings: document.template_variable_mappings,
      category: document.template_category
    }
  }
})



