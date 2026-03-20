import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

export default defineEventHandler(async (event) => {
  // Admin middleware auto-protects /api/admin/* routes
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Calendar ID required' })
  }

  const db = useDrizzle()

  const [existing] = await db
    .select()
    .from(schema.attorneyCalendars)
    .where(eq(schema.attorneyCalendars.id, id))
    .all()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Calendar not found' })
  }

  // Soft deactivate (query param approach for Workers DELETE)
  await db
    .update(schema.attorneyCalendars)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(schema.attorneyCalendars.id, id))

  return { success: true }
})
