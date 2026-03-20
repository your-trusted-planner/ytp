import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../db'

const updateSchema = z.object({
  calendarName: z.string().optional(),
  calendarEmail: z.string().email().optional(),
  isPrimary: z.boolean().optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  // Admin middleware auto-protects /api/admin/* routes
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Calendar ID required' })
  }

  const body = await readBody(event)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const data = parsed.data
  const db = useDrizzle()

  const [existing] = await db
    .select()
    .from(schema.attorneyCalendars)
    .where(eq(schema.attorneyCalendars.id, id))
    .all()

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Calendar not found' })
  }

  // If setting as primary, unset other primary calendars for this attorney
  if (data.isPrimary === true) {
    await db
      .update(schema.attorneyCalendars)
      .set({ isPrimary: false })
      .where(eq(schema.attorneyCalendars.attorneyId, existing.attorneyId))
  }

  const updates: any = { updatedAt: new Date() }
  if (data.calendarName !== undefined) updates.calendarName = data.calendarName
  if (data.calendarEmail !== undefined) updates.calendarEmail = data.calendarEmail
  if (data.isPrimary !== undefined) updates.isPrimary = data.isPrimary
  if (data.timezone !== undefined) updates.timezone = data.timezone
  if (data.isActive !== undefined) updates.isActive = data.isActive

  await db
    .update(schema.attorneyCalendars)
    .set(updates)
    .where(eq(schema.attorneyCalendars.id, id))

  return { success: true }
})
