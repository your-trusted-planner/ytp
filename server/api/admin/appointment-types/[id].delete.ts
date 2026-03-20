import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'
import { logActivity } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const user = event.context.user
  const db = useDrizzle()

  const existing = await db
    .select({ id: schema.appointmentTypes.id, name: schema.appointmentTypes.name })
    .from(schema.appointmentTypes)
    .where(eq(schema.appointmentTypes.id, id))
    .get()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Appointment type not found' })
  }

  // Soft delete — set isActive = false
  await db.update(schema.appointmentTypes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(schema.appointmentTypes.id, id))

  await logActivity({
    type: 'APPOINTMENT_TYPE_DELETED',
    userId: user.id,
    userRole: user.role,
    target: { type: 'appointment_type', id, name: existing.name },
    event
  })

  return { success: true }
})
