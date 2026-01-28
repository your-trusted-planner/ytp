// Add/update attorney call notes for appointments
import { z } from 'zod'
import { requireRole } from '../../utils/rbac'

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

  const { useDrizzle, schema } = await import('../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // Build update object dynamically based on what's provided
  const updateData: any = {}

  if (preCallNotes !== undefined) {
    updateData.preCallNotes = preCallNotes
  }

  if (callNotes !== undefined) {
    updateData.callNotes = callNotes
    updateData.callNotesUpdatedAt = new Date()
  }

  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No notes provided'
    })
  }

  await db.update(schema.appointments)
    .set(updateData)
    .where(eq(schema.appointments.id, appointmentId))

  return {
    success: true,
    message: 'Call notes updated'
  }
})

