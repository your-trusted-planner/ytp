import { eq } from 'drizzle-orm'
import { isDatabaseAvailable } from '../../database'
import { requireAuth } from '../../utils/auth'
import { mockDb } from '../../utils/mock-db'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required'
    })
  }
  
  // Mock database for local testing
  if (!isDatabaseAvailable()) {
    const doc = mockDb.documents.findById(id)
    if (!doc) {
      throw createError({
        statusCode: 404,
        message: 'Document not found'
      })
    }
    
    // Check permissions
    if (user.role !== 'LAWYER' && user.role !== 'ADMIN' && doc.clientId !== user.id) {
      throw createError({
        statusCode: 403,
        message: 'Access denied'
      })
    }
    
    return doc
  }
  
  // Real database
  const { useDrizzle, schema } = await import('../../database')
  const db = useDrizzle()
  
  const document = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .get()
  
  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }
  
  // Check permissions
  if (user.role !== 'LAWYER' && user.role !== 'ADMIN' && document.clientId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'Access denied'
    })
  }
  
  return document
})

