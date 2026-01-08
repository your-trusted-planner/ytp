import { eq } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../../db'
import { requireAuth } from '../../../utils/auth'
import { mockDb } from '../../../utils/mock-db'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required'
    })
  }
  
  // Mock database
  if (!isDatabaseAvailable()) {
    const doc = mockDb.documents.findById(id)
    if (!doc || doc.clientId !== user.id) {
      throw createError({
        statusCode: 404,
        message: 'Document not found'
      })
    }
    
    if (!doc.viewedAt) {
      mockDb.documents.update(id, {
        viewedAt: new Date(),
        status: doc.status === 'SENT' ? 'VIEWED' : doc.status
      })
    }
    
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
  
  if (!document.viewedAt) {
    await db
      .update(schema.documents)
      .set({
        viewedAt: new Date(),
        status: document.status === 'SENT' ? 'VIEWED' : document.status,
        updatedAt: new Date()
      })
      .where(eq(schema.documents.id, id))
  }
  
  return { success: true }
})



