import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../database'
import { requireAuth } from '../../../utils/auth'
import { usePandaDoc } from '../../../utils/pandadoc'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Document ID required'
    })
  }
  
  const db = useDrizzle()
  
  const document = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id))
    .get()
  
  if (!document || !document.pandaDocRequestId) {
    throw createError({
      statusCode: 404,
      message: 'Notarization request not found'
    })
  }
  
  try {
    const pandaDoc = usePandaDoc()
    const status = await pandaDoc.getStatus(document.pandaDocRequestId)
    
    // Update document status based on PandaDoc status
    let newStatus = document.notarizationStatus
    if (status.status === 'completed') {
      newStatus = 'COMPLETED'
      
      await db
        .update(schema.documents)
        .set({
          notarizationStatus: 'COMPLETED',
          status: 'COMPLETED',
          updatedAt: new Date()
        })
        .where(eq(schema.documents.id, id))
    }
    
    return {
      documentId: id,
      notarizationStatus: newStatus,
      pandaDocStatus: status.status,
      scheduledTime: status.scheduledTime,
      completedAt: status.completedAt,
      notary: status.notary
    }
  } catch (error: any) {
    console.error('PandaDoc status check error:', error)
    throw createError({
      statusCode: 500,
      message: `Failed to check notarization status: ${error.message}`
    })
  }
})

