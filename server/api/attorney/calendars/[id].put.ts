import { z } from 'zod'
import { eq, and } from 'drizzle-orm'

const updateSchema = z.object({
  calendarName: z.string().optional(),
  calendarEmail: z.string().email().optional(),
  isPrimary: z.boolean().optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = requireRole(event, ['LAWYER', 'ADMIN', 'STAFF'])
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Calendar ID required' })

  const body = await readBody(event)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Invalid input' })

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

  // If setting as primary, unset others
  if (parsed.data.isPrimary === true) {
    await db
      .update(schema.attorneyCalendars)
      .set({ isPrimary: false })
      .where(eq(schema.attorneyCalendars.attorneyId, user.id))
  }

  const updates: any = { updatedAt: new Date() }
  if (parsed.data.calendarName !== undefined) updates.calendarName = parsed.data.calendarName
  if (parsed.data.calendarEmail !== undefined) updates.calendarEmail = parsed.data.calendarEmail
  if (parsed.data.isPrimary !== undefined) updates.isPrimary = parsed.data.isPrimary
  if (parsed.data.timezone !== undefined) updates.timezone = parsed.data.timezone
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive

  await db
    .update(schema.attorneyCalendars)
    .set(updates)
    .where(eq(schema.attorneyCalendars.id, id))

  return { success: true }
})
