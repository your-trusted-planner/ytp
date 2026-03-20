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

  const { useDrizzle } = await import('../../../db')
  const { sql } = await import('drizzle-orm')
  const { getLegacyClientIds } = await import('../../../utils/client-ids')
  const db = useDrizzle()

  // matters.clientId references users.id, but URL param is clients.id
  const allIds = await getLegacyClientIds(clientId)

  // Single query with correlated subqueries for aggregated stats
  // Replaces the previous N+1 pattern (4 queries per matter)
  const inList = sql.join(allIds.map(id => sql`${id}`), sql`, `)
  const matters = await db.all<any>(sql`
    SELECT m.*,
      (SELECT COUNT(*) FROM matters_to_services WHERE matter_id = m.id) as services_count,
      (SELECT COUNT(*) FROM client_journeys WHERE matter_id = m.id AND status = 'IN_PROGRESS') as active_journeys_count,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE matter_id = m.id AND status = 'COMPLETED') as total_paid
    FROM matters m
    WHERE m.client_id IN (${inList})
  `)

  // Sort matters by status priority and creation date
  const statusPriority: Record<string, number> = {
    OPEN: 1,
    IN_PROGRESS: 2,
    PENDING: 3,
    CLOSED: 4
  }
  matters.sort((a, b) => {
    const priorityDiff = (statusPriority[a.status] || 5) - (statusPriority[b.status] || 5)
    if (priorityDiff !== 0) return priorityDiff
    return (b.created_at || 0) - (a.created_at || 0)
  })

  // Batch fetch all engaged services for all matters in a single query
  const matterIds = matters.map((m: any) => m.id)
  const servicesByMatter: Record<string, any[]> = {}

  if (matterIds.length > 0) {
    const matterInList = sql.join(matterIds.map(id => sql`${id}`), sql`, `)
    const servicesResult = await db.all<any>(sql`
      SELECT mts.matter_id, mts.catalog_id, mts.engaged_at, mts.status as mts_status,
             sc.name, sc.category, sc.price
      FROM matters_to_services mts
      INNER JOIN service_catalog sc ON mts.catalog_id = sc.id
      WHERE mts.matter_id IN (${matterInList})
    `)

    for (const svc of servicesResult) {
      if (!servicesByMatter[svc.matter_id]) servicesByMatter[svc.matter_id] = []
      servicesByMatter[svc.matter_id].push(svc)
    }
  }

  // Build response
  const mattersWithServices = matters.map((matter: any) => {
    const matterServices = servicesByMatter[matter.id] || []
    const totalExpected = matterServices.reduce((sum: number, s: any) => sum + (s.price || 0), 0)

    return {
      id: matter.id,
      client_id: matter.client_id,
      title: matter.title,
      matter_number: matter.matter_number,
      description: matter.description,
      status: matter.status,
      lead_attorney_id: matter.lead_attorney_id,
      engagement_journey_id: matter.engagement_journey_id,
      created_at: matter.created_at,
      updated_at: matter.updated_at,
      services_count: matter.services_count || 0,
      active_journeys_count: matter.active_journeys_count || 0,
      total_paid: matter.total_paid || 0,
      total_expected: totalExpected,
      engaged_services: matterServices.map((s: any) => ({
        matter_id: s.matter_id,
        catalog_id: s.catalog_id,
        engaged_at: s.engaged_at,
        name: s.name,
        category: s.category,
        price: s.price
      }))
    }
  })

  return {
    matters: mattersWithServices
  }
})
