// Get documents for current user (clients see their own, lawyers/admins see all)
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const query = getQuery(event)
  const limit = query.limit ? parseInt(query.limit as string) : undefined

  const db = hubDatabase()

  // Lawyers and admins see all documents, clients see only their own
  let sql = `
    SELECT
      d.*,
      u.first_name as client_first_name,
      u.last_name as client_last_name,
      dt.name as template_name
    FROM documents d
    LEFT JOIN users u ON d.client_id = u.id
    LEFT JOIN document_templates dt ON d.template_id = dt.id
  `

  // Filter by client if user is a client
  if (user.role === 'CLIENT') {
    sql += ` WHERE d.client_id = ?`
  }

  sql += ` ORDER BY d.created_at DESC`

  if (limit) {
    sql += ` LIMIT ${limit}`
  }

  const result = user.role === 'CLIENT'
    ? await db.prepare(sql).bind(user.id).all()
    : await db.prepare(sql).all()

  const documents = (result.results || []).map((doc: any) => ({
    id: doc.id,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    templateId: doc.template_id,
    templateName: doc.template_name,
    matterId: doc.matter_id,
    content: doc.content,
    variableValues: doc.variable_values,
    requiresNotary: doc.requires_notary === 1,
    notarizationStatus: doc.notarization_status,
    clientId: doc.client_id,
    clientFirstName: doc.client_first_name,
    clientLastName: doc.client_last_name,
    clientFullName: `${doc.client_first_name || ''} ${doc.client_last_name || ''}`.trim(),
    signedAt: doc.signed_at,
    signatureData: doc.signature_data,
    viewedAt: doc.viewed_at,
    sentAt: doc.sent_at,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at
  }))

  return documents
})

