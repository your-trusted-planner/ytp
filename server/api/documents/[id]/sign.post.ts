import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { isDatabaseAvailable } from '../../../db'
import { requireAuth } from '../../../utils/auth'
import { mockDb } from '../../../utils/mock-db'

const signSchema = z.object({
  signatureData: z.string()
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
  const result = signSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid signature data'
    })
  }
  
  const { signatureData } = result.data
  
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
      signatureData,
      signedAt: new Date(),
      status: 'SIGNED'
    })
    
    return { success: true }
  }
  
  // Real database
  const { useDrizzle, schema } = await import('../../../db')
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
      signatureData,
      signedAt: new Date(),
      status: 'SIGNED',
      updatedAt: new Date()
    })
    .where(eq(schema.documents.id, id))
  
  return { success: true }
})



