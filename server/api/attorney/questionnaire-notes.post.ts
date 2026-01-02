// Add/update attorney notes for questionnaire responses
import { z } from 'zod'
import { requireRole } from '../../utils/auth'

const notesSchema = z.object({
  responseId: z.string(),
  notes: z.string(),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  const body = await readBody(event)
  const result = notesSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid data',
      data: result.error.errors
    })
  }
  
  const { responseId, notes } = result.data
  const db = hubDatabase()
  
  // Update questionnaire response with attorney notes
  const now = Date.now()
  await db.prepare(`
    UPDATE questionnaire_responses 
    SET attorney_notes = ?, attorney_notes_updated_at = ?
    WHERE id = ?
  `).bind(notes, now, responseId).run()
  
  return {
    success: true,
    message: 'Attorney notes updated'
  }
})

