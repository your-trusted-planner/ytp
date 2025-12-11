import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { isDatabaseAvailable } from '../../database'
import { requireRole } from '../../utils/auth'
import { mockDb } from '../../utils/mock-db'

const updateCatalogItemSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  type: z.enum(['SINGLE', 'RECURRING']).optional(),
  price: z.number().optional(),
  duration: z.string().optional(),
  isActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Catalog Item ID required'
    })
  }
  
  const body = await readBody(event)
  const result = updateCatalogItemSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input'
    })
  }
  
  const { price, ...rest } = result.data
  
  const updateData: any = {
    ...rest,
    updatedAt: new Date()
  }
  
  if (price !== undefined) {
    updateData.price = Math.round(price * 100)
  }
  
  // Use mock database for local testing
  if (!isDatabaseAvailable()) {
    mockDb.matters.update(id, updateData)
    return { success: true }
  }
  
  // Real database
  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()
  
  await db
    .update(schema.serviceCatalog)
    .set(updateData)
    .where(eq(schema.serviceCatalog.id, id))
  
  return { success: true }
})
