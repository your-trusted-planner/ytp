// Add/update attorney call notes for appointments
import { z } from 'zod'
import { requireRole } from '../../utils/auth'

const callNotesSchema = z.object({
  appointmentId: z.string(),
  preCallNotes: z.string().optional(),
  callNotes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['LAWYER', 'ADMIN'])
  const body = await readBody(event)
  const result = callNotesSchema.safeParse(body)
  
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid data',
      data: result.error.errors
    })
  }
  
  const { appointmentId, preCallNotes, callNotes } = result.data
  const db = hubDatabase()
  
  // Build update query dynamically based on what's provided
  const updates: string[] = []
  const params: any[] = []
  
  if (preCallNotes !== undefined) {
    updates.push('pre_call_notes = ?')
    params.push(preCallNotes)
  }
  
  if (callNotes !== undefined) {
    updates.push('call_notes = ?')
    updates.push('call_notes_updated_at = ?')
    params.push(callNotes)
    params.push(Date.now())
  }
  
  if (updates.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No notes provided'
    })
  }
  
  params.push(appointmentId)
  
  await db.prepare(`
    UPDATE appointments 
    SET ${updates.join(', ')}
    WHERE id = ?
  `).bind(...params).run()
  
  return {
    success: true,
    message: 'Call notes updated'
  }
})

