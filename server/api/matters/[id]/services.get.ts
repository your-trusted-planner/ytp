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

  // Fetch services associated with this matter from junction table
  const services = await db
    .select({
      matterId: schema.mattersToServices.matterId,
      catalogId: schema.mattersToServices.catalogId,
      status: schema.mattersToServices.status,
      engagedAt: schema.mattersToServices.engagedAt,
      startDate: schema.mattersToServices.startDate,
      endDate: schema.mattersToServices.endDate,
      assignedAttorneyId: schema.mattersToServices.assignedAttorneyId,
      name: schema.serviceCatalog.name,
      description: schema.serviceCatalog.description,
      type: schema.serviceCatalog.type,
      price: schema.serviceCatalog.price,
      category: schema.serviceCatalog.category
    })
    .from(schema.mattersToServices)
    .leftJoin(schema.serviceCatalog, eq(schema.mattersToServices.catalogId, schema.serviceCatalog.id))
    .where(eq(schema.mattersToServices.matterId, matterId))
    .all()

  return { services }
})


