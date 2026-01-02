// Get attorney's Google Calendar configurations
import { requireRole } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const { user } = await requireRole(event, ['LAWYER', 'ADMIN'])
  const db = hubDatabase()
  
  const calendars = await db.prepare(`
    SELECT 
      id, calendar_id, calendar_name, calendar_email,
      is_primary, timezone, is_active, created_at, updated_at
    FROM attorney_calendars 
    WHERE attorney_id = ? 
    AND is_active = 1
    ORDER BY is_primary DESC, created_at ASC
  `).bind(user.id).all()
  
  return {
    success: true,
    calendars: calendars.results || []
  }
})

