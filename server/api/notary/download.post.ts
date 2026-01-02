// Mark notary document as downloaded for offline notarization
import { z } from 'zod'
import { requireRole, generateId } from '../../utils/auth'

const downloadSchema = z.object({
  documentId: z.string(),
  clientJourneyId: z.string(),
  stepProgressId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])
  const body = await readBody(event)
  const result = downloadSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid data',
      data: result.error.errors
    })
  }
  
  const { documentId, clientJourneyId, stepProgressId } = result.data
  const db = hubDatabase()
  
  // Verify document requires notary
  const document = await db.prepare(`
    SELECT * FROM documents WHERE id = ? AND requires_notary = 1
  `).bind(documentId).first()
  
  if (!document) {
    throw createError({
      statusCode: 404,
      message: 'Notary document not found'
    })
  }
  
  // Check if notary record already exists
  const existing = await db.prepare(`
    SELECT id FROM notary_documents WHERE document_id = ?
  `).bind(documentId).first()
  
  const now = Date.now()
  
  if (existing) {
    // Update existing record
    await db.prepare(`
      UPDATE notary_documents 
      SET status = 'DOWNLOADED', downloaded_at = ?, downloaded_by = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, user.id, now, existing.id).run()
    
    return {
      success: true,
      notaryRecordId: existing.id,
      message: 'Document marked as downloaded'
    }
  } else {
    // Create new notary record
    const notaryId = generateId()
    await db.prepare(`
      INSERT INTO notary_documents (
        id, document_id, client_journey_id, step_progress_id,
        status, downloaded_at, downloaded_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      notaryId,
      documentId,
      clientJourneyId,
      stepProgressId || null,
      'DOWNLOADED',
      now,
      user.id,
      now,
      now
    ).run()
    
    return {
      success: true,
      notaryRecordId: notaryId,
      message: 'Document marked as downloaded'
    }
  }
})

