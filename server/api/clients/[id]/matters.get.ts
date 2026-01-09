// Get all matters for a client with aggregated stats
export default defineEventHandler(async (event) => {
  const clientId = getRouterParam(event, 'id')

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  // Authorization: lawyers/admins can view any client, clients can only view themselves
  requireClientAccess(event, clientId)

  const { useDrizzle, schema } = await import('../../../db')
  const { eq, and, sql } = await import('drizzle-orm')
  const db = useDrizzle()

  // Get all matters for this client
  const matters = await db.select()
    .from(schema.matters)
    .where(eq(schema.matters.clientId, clientId))
    .all()

  // Sort matters by status priority and creation date
  const statusPriority: Record<string, number> = {
    'OPEN': 1,
    'IN_PROGRESS': 2,
    'PENDING': 3,
    'CLOSED': 4
  }
  matters.sort((a, b) => {
    const priorityDiff = (statusPriority[a.status] || 5) - (statusPriority[b.status] || 5)
    if (priorityDiff !== 0) return priorityDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // For each matter, get aggregated statistics and engaged services
  const mattersWithServices = await Promise.all(
    matters.map(async (matter) => {
      // Get services count
      const servicesCountResult = await db.select({ count: sql<number>`count(*)` })
        .from(schema.mattersToServices)
        .where(eq(schema.mattersToServices.matterId, matter.id))
        .get()

      // Get active journeys count
      const activeJourneysResult = await db.select({ count: sql<number>`count(*)` })
        .from(schema.clientJourneys)
        .where(and(
          eq(schema.clientJourneys.matterId, matter.id),
          eq(schema.clientJourneys.status, 'IN_PROGRESS')
        ))
        .get()

      // Get total paid
      const totalPaidResult = await db.select({ sum: sql<number>`COALESCE(SUM(${schema.payments.amount}), 0)` })
        .from(schema.payments)
        .where(and(
          eq(schema.payments.matterId, matter.id),
          eq(schema.payments.status, 'COMPLETED')
        ))
        .get()

      // Get engaged services with details
      const servicesData = await db.select({
        mts: schema.mattersToServices,
        catalogName: schema.serviceCatalog.name,
        catalogCategory: schema.serviceCatalog.category,
        catalogPrice: schema.serviceCatalog.price
      })
        .from(schema.mattersToServices)
        .innerJoin(
          schema.serviceCatalog,
          eq(schema.mattersToServices.catalogId, schema.serviceCatalog.id)
        )
        .where(eq(schema.mattersToServices.matterId, matter.id))
        .all()

      // Calculate total expected
      const totalExpected = servicesData.reduce((sum, s) => sum + (s.catalogPrice || 0), 0)

      // Format engaged services
      const engaged_services = servicesData.map(s => ({
        id: s.mts.id,
        matter_id: s.mts.matterId,
        catalog_id: s.mts.catalogId,
        engaged_at: s.mts.engagedAt,
        notes: s.mts.notes,
        name: s.catalogName,
        category: s.catalogCategory,
        price: s.catalogPrice
      }))

      // Convert matter to snake_case
      return {
        id: matter.id,
        client_id: matter.clientId,
        title: matter.title,
        matter_number: matter.matterNumber,
        description: matter.description,
        status: matter.status,
        lead_attorney_id: matter.leadAttorneyId,
        engagement_journey_id: matter.engagementJourneyId,
        created_at: matter.createdAt instanceof Date ? matter.createdAt.getTime() : matter.createdAt,
        updated_at: matter.updatedAt instanceof Date ? matter.updatedAt.getTime() : matter.updatedAt,
        services_count: servicesCountResult?.count || 0,
        active_journeys_count: activeJourneysResult?.count || 0,
        total_paid: totalPaidResult?.sum || 0,
        total_expected: totalExpected,
        engaged_services
      }
    })
  )

  return {
    matters: mattersWithServices
  }
})
