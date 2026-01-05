// Get all matters for a client with aggregated stats
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const clientId = getRouterParam(event, 'id')

  // Authorization: lawyers/admins can view any client, clients can only view themselves
  if (user.role === 'CLIENT' && user.id !== clientId) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized'
    })
  }

  if (!clientId) {
    throw createError({
      statusCode: 400,
      message: 'Client ID is required'
    })
  }

  const db = hubDatabase()

  // Get all matters for this client with aggregated statistics
  const matters = await db.prepare(`
    SELECT
      m.*,
      (SELECT COUNT(*)
       FROM matters_to_services
       WHERE matter_id = m.id) as services_count,
      (SELECT COUNT(*)
       FROM client_journeys
       WHERE matter_id = m.id
       AND status = 'IN_PROGRESS') as active_journeys_count,
      (SELECT COALESCE(SUM(amount), 0)
       FROM payments
       WHERE matter_id = m.id
       AND status = 'COMPLETED') as total_paid,
      (SELECT COALESCE(SUM(sc.price), 0)
       FROM matters_to_services mts
       JOIN service_catalog sc ON mts.catalog_id = sc.id
       WHERE mts.matter_id = m.id) as total_expected
    FROM matters m
    WHERE m.client_id = ?
    ORDER BY
      CASE m.status
        WHEN 'OPEN' THEN 1
        WHEN 'IN_PROGRESS' THEN 2
        WHEN 'PENDING' THEN 3
        WHEN 'CLOSED' THEN 4
        ELSE 5
      END,
      m.created_at DESC
  `).bind(clientId).all()

  // For each matter, get engaged services
  const mattersWithServices = await Promise.all(
    (matters.results || []).map(async (matter: any) => {
      const services = await db.prepare(`
        SELECT
          mts.*,
          sc.name,
          sc.category,
          sc.price
        FROM matters_to_services mts
        JOIN service_catalog sc ON mts.catalog_id = sc.id
        WHERE mts.matter_id = ?
        ORDER BY mts.engaged_at DESC
      `).bind(matter.id).all()

      return {
        ...matter,
        engaged_services: services.results || []
      }
    })
  )

  return {
    matters: mattersWithServices
  }
})
