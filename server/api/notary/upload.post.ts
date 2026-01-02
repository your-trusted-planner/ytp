// Upload notarized PDF for offline notary workflow
import { z } from 'zod'
import { requireRole } from '../../utils/auth'

const uploadSchema = z.object({
  notaryRecordId: z.string(),
  notarizedPdfPath: z.string(), // R2 storage path
  notaryName: z.string().optional(),
  notaryCommissionNumber: z.string().optional(),
  notaryState: z.string().optional(),
  notaryExpirationDate: z.string().optional(), // ISO date string
  notes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { user } = await requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])
  const body = await readBody(event)
  const result = uploadSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid data',
      data: result.error.errors
    })
  }
  
  const { notaryRecordId, notarizedPdfPath, notaryName, notaryCommissionNumber, notaryState, notaryExpirationDate, notes } = result.data
  const db = hubDatabase()
  
  // Verify notary record exists
  const record = await db.prepare(`
    SELECT * FROM notary_documents WHERE id = ?
  `).bind(notaryRecordId).first()
  
  if (!record) {
    throw createError({
      statusCode: 404,
      message: 'Notary record not found'
    })
  }
  
  const now = Date.now()
  const expirationTimestamp = notaryExpirationDate ? new Date(notaryExpirationDate).getTime() : null
  
  // Update notary record with uploaded PDF and notary info
  await db.prepare(`
    UPDATE notary_documents 
    SET 
      status = 'UPLOADED',
      notarized_pdf_path = ?,
      uploaded_at = ?,
      uploaded_by = ?,
      notary_name = ?,
      notary_commission_number = ?,
      notary_state = ?,
      notary_expiration_date = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    notarizedPdfPath,
    now,
    user.id,
    notaryName || null,
    notaryCommissionNumber || null,
    notaryState || null,
    expirationTimestamp,
    notes || null,
    now,
    notaryRecordId
  ).run()
  
  // Update the document status
  await db.prepare(`
    UPDATE documents 
    SET 
      notarization_status = 'COMPLETED',
      status = 'SIGNED',
      updated_at = ?
    WHERE id = ?
  `).bind(now, record.document_id).run()
  
  return {
    success: true,
    message: 'Notarized document uploaded successfully'
  }
})

