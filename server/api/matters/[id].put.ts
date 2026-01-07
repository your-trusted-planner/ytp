import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { isDatabaseAvailable } from '../../database'

const updateMatterSchema = z.object({
  title: z.string().optional(),
  matterNumber: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'PENDING']).optional(),
  leadAttorneyId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  requireRole(event, ['LAWYER', 'ADMIN'])
  
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
  
  const updateData: any = {
    ...result.data,
    updatedAt: new Date()
  }

  // Handle nullable leadAttorneyId updates
  if (result.data.leadAttorneyId !== undefined) {
    updateData.leadAttorneyId = result.data.leadAttorneyId || null
  }
  
  if (!isDatabaseAvailable()) {
    return { success: true } // Mock response
  }
  
  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()
  
  await db
    .update(schema.matters)
    .set(updateData)
    .where(eq(schema.matters.id, id))
  
  return { success: true }
})


