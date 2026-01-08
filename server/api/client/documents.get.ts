// Get documents for current user (clients see their own, lawyers/admins see all)
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const query = getQuery(event)
  const limit = query.limit ? parseInt(query.limit as string) : undefined

  const { useDrizzle, schema } = await import('../../db')
  const { eq, desc, inArray } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get documents based on user role
  let documentsQuery = db.select()
    .from(schema.documents)

  if (user.role === 'CLIENT') {
    documentsQuery = documentsQuery.where(eq(schema.documents.clientId, user.id))
  }

  documentsQuery = documentsQuery.orderBy(desc(schema.documents.createdAt))

  if (limit) {
    documentsQuery = documentsQuery.limit(limit)
  }

  const docs = await documentsQuery.all()

  // Get unique client IDs and template IDs
  const clientIds = [...new Set(docs.map(d => d.clientId).filter(Boolean) as string[])]
  const templateIds = [...new Set(docs.map(d => d.templateId).filter(Boolean) as string[])]

  // Fetch clients and templates in parallel
  const [clients, templates] = await Promise.all([
    clientIds.length > 0
      ? db.select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName
        })
        .from(schema.users)
        .where(inArray(schema.users.id, clientIds))
        .all()
      : [],
    templateIds.length > 0
      ? db.select({
          id: schema.documentTemplates.id,
          name: schema.documentTemplates.name
        })
        .from(schema.documentTemplates)
        .where(inArray(schema.documentTemplates.id, templateIds))
        .all()
      : []
  ])

  // Create lookup maps
  const clientMap = new Map(clients.map(c => [c.id, c]))
  const templateMap = new Map(templates.map(t => [t.id, t]))

  // Enrich documents with related data
  const documents = docs.map((doc) => {
    const client = doc.clientId ? clientMap.get(doc.clientId) : null
    const template = doc.templateId ? templateMap.get(doc.templateId) : null

    return {
      id: doc.id,
      title: doc.title,
      description: doc.description,
      status: doc.status,
      templateId: doc.templateId,
      templateName: template?.name || null,
      matterId: doc.matterId,
      content: doc.content,
      variableValues: doc.variableValues,
      requiresNotary: doc.requiresNotary,
      notarizationStatus: doc.notarizationStatus,
      clientId: doc.clientId,
      clientFirstName: client?.firstName || null,
      clientLastName: client?.lastName || null,
      clientFullName: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : null,
      signedAt: doc.signedAt,
      signatureData: doc.signatureData,
      viewedAt: doc.viewedAt,
      sentAt: doc.sentAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }
  })

  return documents
})

