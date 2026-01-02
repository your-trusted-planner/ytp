import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { isDatabaseAvailable } from '../../../database'
import { requireAuth } from '../../../utils/auth'
import { mockDb } from '../../../utils/mock-db'

const variablesSchema = z.object({
  variables: z.record(z.string())
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required'
    })
  }
  
  const body = await readBody(event)
  const result = variablesSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid variables data'
    })
  }
  
  const { variables } = result.data
  
  // Mock database
  if (!isDatabaseAvailable()) {
    const doc = mockDb.documents.findById(id)
    if (!doc || doc.clientId !== user.id) {
      throw createError({
        statusCode: 404,
        message: 'Document not found'
      })
    }
    
    mockDb.documents.update(id, {
      variableValues: JSON.stringify(variables)
    })
    
    return { success: true }
  }
  
  // Real database
  const { useDrizzle, schema } = await import('../../../database')
  const db = useDrizzle()
  
  const document = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .get()
  
  if (!document || document.clientId !== user.id) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }
  
  await db
    .update(schema.documents)
    .set({
      variableValues: JSON.stringify(variables),
      updatedAt: new Date()
    })
    .where(eq(schema.documents.id, id))
  
  return { success: true }
})



