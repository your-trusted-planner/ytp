// Add Google Calendar configuration for attorney
import { z } from 'zod'
import { generateId } from '../../../utils/auth'
import { requireRole } from '../../../utils/rbac'

const addCalendarSchema = z.object({
  calendarId: z.string().min(1), // Google Calendar ID
  calendarName: z.string().min(1),
  calendarEmail: z.string().email(),
  isPrimary: z.boolean().optional(),
  timezone: z.string().optional(),
  serviceAccountKey: z.string().optional(), // JSON string (will be encrypted)
})

export default defineEventHandler(async (event) => {
  const { user } = await requireRole(event, ['LAWYER', 'ADMIN'])
  const body = await readBody(event)
  const result = addCalendarSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid calendar data',
      data: result.error.errors
    })
  }

  const { calendarId, calendarName, calendarEmail, isPrimary, timezone, serviceAccountKey } = result.data

  const { useDrizzle, schema } = await import('../../../db')
  const { eq } = await import('drizzle-orm')
  const db = useDrizzle()

  // If setting as primary, unset other primary calendars for this attorney
  if (isPrimary) {
    await db.update(schema.attorneyCalendars)
      .set({ isPrimary: false })
      .where(eq(schema.attorneyCalendars.attorneyId, user.id))
  }

  // Create calendar record
  const id = generateId()
  const now = new Date()

  await db.insert(schema.attorneyCalendars).values({
    id,
    attorneyId: user.id,
    calendarId,
    calendarName,
    calendarEmail,
    isPrimary: isPrimary || false,
    timezone: timezone || 'America/New_York',
    serviceAccountKey: serviceAccountKey || null, // TODO: Encrypt before storing
    isActive: true,
    createdAt: now,
    updatedAt: now
  })

  return {
    success: true,
    calendarId: id,
    message: 'Calendar added successfully'
  }
})

