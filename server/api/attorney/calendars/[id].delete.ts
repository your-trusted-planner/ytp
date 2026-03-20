import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Calendar ID required' })

  const { useDrizzle, schema } = await import('../../../db')
  const db = useDrizzle()

  // Verify the calendar belongs to the current user
  const [existing] = await db
    .select()
    .from(schema.attorneyCalendars)
    .where(and(
      eq(schema.attorneyCalendars.id, id),
      eq(schema.attorneyCalendars.attorneyId, user.id)
    ))
    .all()

  if (!existing) throw createError({ statusCode: 404, message: 'Calendar not found' })

  // Soft deactivate
  await db
    .update(schema.attorneyCalendars)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(schema.attorneyCalendars.id, id))

  return { success: true }
})
