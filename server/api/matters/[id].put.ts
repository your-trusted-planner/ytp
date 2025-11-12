import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDrizzle, schema } from '../../database'
import { requireRole } from '../../utils/auth'

const updateMatterSchema = z.object({
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
      message: 'Matter ID required'
    })
  }
  
  const body = await readBody(event)
  const result = updateMatterSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input'
    })
  }
  
  const db = useDrizzle()
  const { price, ...rest } = result.data
  
  const updateData: any = {
    ...rest,
    updatedAt: new Date()
  }
  
  if (price !== undefined) {
    updateData.price = Math.round(price * 100)
  }
  
  await db
    .update(schema.matters)
    .set(updateData)
    .where(eq(schema.matters.id, id))
  
  return { success: true }
})

