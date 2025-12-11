import { eq } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../../database'
import { requireRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const matterId = getRouterParam(event, 'id')
  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID required'
    })
  }

  // Use mock database for local testing if needed
  if (!isDatabaseAvailable()) {
    return { services: [] } // Mock response
  }
  
  const { useDrizzle, schema } = await import('../../../database')
  const db = useDrizzle()
  
  // Fetch services associated with this matter, joining with catalog to get names
  const services = await db
    .select({
      id: schema.services.id,
      matterId: schema.services.matterId,
      catalogId: schema.services.catalogId,
      status: schema.services.status,
      fee: schema.services.fee,
      createdAt: schema.services.createdAt,
      name: schema.serviceCatalog.name,
      description: schema.serviceCatalog.description,
      type: schema.serviceCatalog.type
    })
    .from(schema.services)
    .leftJoin(schema.serviceCatalog, eq(schema.services.catalogId, schema.serviceCatalog.id))
    .where(eq(schema.services.matterId, matterId))
    .all()
  
  return { services }
})
