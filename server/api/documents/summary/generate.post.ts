// Generate document choices summary for client (pre-final payment)
import { z } from 'zod'
import { requireRole, generateId } from '../../../utils/auth'

const summarySchema = z.object({
  clientJourneyId: z.string(),
  documentChoices: z.record(z.any()), // Document selections and choices made
  isFinal: z.boolean().optional(), // True after final payment
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  const body = await readBody(event)
  const result = summarySchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid data',
      data: result.error.errors
    })
  }
  
  const { clientJourneyId, documentChoices, isFinal } = result.data
  const db = hubDatabase()
  
  // Verify client journey exists
  const journey = await db.prepare(`
    SELECT * FROM client_journeys WHERE id = ?
  `).bind(clientJourneyId).first()
  
  if (!journey) {
    throw createError({
      statusCode: 404,
      message: 'Client journey not found'
    })
  }
  
  // Check if summary already exists
  const existing = await db.prepare(`
    SELECT id FROM document_summaries 
    WHERE client_journey_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `).bind(clientJourneyId).first()
  
  const now = Date.now()
  
  if (existing) {
    // Update existing summary
    await db.prepare(`
      UPDATE document_summaries 
      SET summary_data = ?, is_final = ?, generated_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(documentChoices),
      isFinal ? 1 : 0,
      now,
      now,
      existing.id
    ).run()
    
    return {
      success: true,
      summaryId: existing.id,
      message: 'Document summary updated'
    }
  } else {
    // Create new summary
    const summaryId = generateId()
    await db.prepare(`
      INSERT INTO document_summaries (
        id, client_journey_id, summary_data, is_final, generated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      summaryId,
      clientJourneyId,
      JSON.stringify(documentChoices),
      isFinal ? 1 : 0,
      now,
      now,
      now
    ).run()
    
    return {
      success: true,
      summaryId,
      message: 'Document summary created'
    }
  }
})

