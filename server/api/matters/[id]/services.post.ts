import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { isDatabaseAvailable } from '../../../database'
import { requireRole, generateId } from '../../../utils/auth'

const addServiceSchema = z.object({
  catalogId: z.string().min(1),
  fee: z.number().optional(), // Optional override of catalog price
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const matterId = getRouterParam(event, 'id')
  if (!matterId) {
    throw createError({
      statusCode: 400,
      message: 'Matter ID required'
    })
  }
  
  const body = await readBody(event)
  const result = addServiceSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input',
      data: result.error
    })
  }
  
  const { catalogId, fee } = result.data

  if (!isDatabaseAvailable()) {
    return { success: true } // Mock response
  }

  const { useDrizzle, schema } = await import('../../../database')
  const db = useDrizzle()

  // If fee is not provided, fetch it from the catalog
  let serviceFee = fee
  if (serviceFee === undefined) {
    const catalogItem = await db.select().from(schema.serviceCatalog).where(eq(schema.serviceCatalog.id, catalogId)).get()
    if (!catalogItem) {
        throw createError({ statusCode: 404, message: 'Service not found in catalog' })
    }
    serviceFee = catalogItem.price
  }

  const newService = {
    id: generateId(),
    matterId,
    catalogId,
    fee: serviceFee,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  await db.insert(schema.services).values(newService)
  
  return { success: true, service: newService }
})
