// Add Google Calendar configuration for attorney
import { z } from 'zod'
import { requireRole, generateId } from '../../../utils/auth'

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
  const db = hubDatabase()
  
  // If setting as primary, unset other primary calendars for this attorney
  if (isPrimary) {
    await db.prepare(`
      UPDATE attorney_calendars 
      SET is_primary = 0 
      WHERE attorney_id = ?
    `).bind(user.id).run()
  }
  
  // Create calendar record
  const id = generateId()
  const now = Date.now()
  
  await db.prepare(`
    INSERT INTO attorney_calendars (
      id, attorney_id, calendar_id, calendar_name, calendar_email,
      is_primary, timezone, service_account_key, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    user.id,
    calendarId,
    calendarName,
    calendarEmail,
    isPrimary ? 1 : 0,
    timezone || 'America/New_York',
    serviceAccountKey || null, // TODO: Encrypt before storing
    1,
    now,
    now
  ).run()
  
  return {
    success: true,
    calendarId: id,
    message: 'Calendar added successfully'
  }
})

