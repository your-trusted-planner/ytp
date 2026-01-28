// Add/update attorney notes for questionnaire responses
import { z } from 'zod'
import { requireRole } from '../../utils/rbac'

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

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Update questionnaire response with attorney notes
  const now = new Date()
  await db.update(schema.questionnaireResponses)
    .set({
      attorneyNotes: notes,
      attorneyNotesUpdatedAt: now
    })
    .where(eq(schema.questionnaireResponses.id, responseId))

  return {
    success: true,
    message: 'Attorney notes updated'
  }
})

