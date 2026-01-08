import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDrizzle, schema } from '../../db'
import { requireAuth } from '../../utils/auth'
import { usePandaDoc } from '../../utils/pandadoc'

const createNotarizationSchema = z.object({
  documentId: z.string()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  
  const result = createNotarizationSchema.safeParse(body)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid input'
    })
  }
  
  const { documentId } = result.data
  const db = useDrizzle()
  
  // Get the document
  const document = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, documentId))
    .get()
  
  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Document not found'
    })
  }
  
  if (!document.requiresNotary) {
    throw createError({
      statusCode: 400,
      message: 'Document does not require notarization'
    })
  }
  
  try {
    const pandaDoc = usePandaDoc()
    
    // Create notarization request
    const notarizationRequest = await pandaDoc.createNotarizationRequest({
      documentId: document.id,
      clientEmail: user.email,
      clientName: `${user.firstName} ${user.lastName}`,
      documentTitle: document.title,
      documentContent: document.content
    })
    
    // Update document with PandaDoc request ID
    await db
      .update(schema.documents)
      .set({
        pandaDocRequestId: notarizationRequest.id,
        notarizationStatus: 'PENDING',
        updatedAt: new Date()
      })
      .where(eq(schema.documents.id, documentId))
    
    return {
      success: true,
      requestId: notarizationRequest.id,
      status: notarizationRequest.status
    }
  } catch (error: any) {
    console.error('PandaDoc error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to create notarization request: ${error.message}`
    })
  }
})

