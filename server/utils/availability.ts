/**
 * Availability Calculator
 *
 * Generates available time slots from free/busy data within business hours.
 */

export interface TimeSlot {
  startTime: string // ISO 8601
  endTime: string // ISO 8601
  available: boolean
}

export interface BusinessHours {
  start: number // Hour in 24h format (e.g., 9)
  end: number // Hour in 24h format (e.g., 17)
  days: number[] // 0=Sunday, 1=Monday, ..., 6=Saturday
}

export const HARDCODED_DEFAULT_BUSINESS_HOURS: BusinessHours = {
  start: 9,
  end: 17,
  days: [1, 2, 3, 4, 5] // Monday-Friday
}

/**
 * Load the system-configured default business hours from the settings table.
 * Falls back to 9-5 M-F if no setting is configured.
 */
export async function getDefaultBusinessHours(): Promise<BusinessHours> {
  try {
    const { getSetting } = await import('./settings')
    const raw = await getSetting('default_business_hours')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.start !== undefined && parsed.end !== undefined && Array.isArray(parsed.days)) {
        return parsed
      }
    }
  }
  catch {
    // Fall back to hardcoded default
  }
  return HARDCODED_DEFAULT_BUSINESS_HOURS
}

/**
 * Calculate available time slots for a given date.
 *
 * @param busyPeriods - Array of { start, end } ISO strings from Google free/busy
 * @param date - ISO date string (YYYY-MM-DD)
 * @param timezone - IANA timezone (e.g., 'America/New_York')
 * @param durationMinutes - Desired slot duration (default 60)
 * @param businessHours - Business hours config (pass null to use system default)
 * @returns Array of time slots with availability flags
 */
export function calculateAvailableSlots(
  busyPeriods: Array<{ start: string, end: string }>,
  date: string,
  timezone: string,
  durationMinutes: number = 60,
  businessHours: BusinessHours = HARDCODED_DEFAULT_BUSINESS_HOURS
): TimeSlot[] {
  const slots: TimeSlot[] = []

  // Parse the date and check if it's a business day
  const dateObj = new Date(`${date}T12:00:00Z`) // noon UTC to avoid timezone edge cases
  const dayOfWeek = getDayOfWeekInTimezone(date, timezone)

  if (!businessHours.days.includes(dayOfWeek)) {
    return slots // Not a business day
  }

  // Generate slots at 30-min intervals within business hours
  const intervalMinutes = 30
  const now = new Date()

  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      // Check if slot end would exceed business hours
      const slotEndMinutes = hour * 60 + minute + durationMinutes
      const businessEndMinutes = businessHours.end * 60
      if (slotEndMinutes > businessEndMinutes) continue

      const startISO = toISOInTimezone(date, hour, minute, timezone)
      const endISO = toISOInTimezone(date, hour, minute + durationMinutes, timezone)

      const slotStart = new Date(startISO)
      const slotEnd = new Date(endISO)

      // Skip past times
      if (slotStart <= now) {
        continue
      }

      // Check if slot overlaps with any busy period
      const isBusy = busyPeriods.some((busy) => {
        const busyStart = new Date(busy.start)
        const busyEnd = new Date(busy.end)
        return slotStart < busyEnd && slotEnd > busyStart
      })

      slots.push({
        startTime: startISO,
        endTime: endISO,
        available: !isBusy
      })
    }
  }

  return slots
}

/**
 * Get the day of week for a date string in a specific timezone.
 */
function getDayOfWeekInTimezone(dateStr: string, timezone: string): number {
  // Create a date at noon in the target timezone to get the correct day
  const date = new Date(`${dateStr}T12:00:00`)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short'
  })
  const dayName = formatter.format(date)
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  }
  return dayMap[dayName] ?? 0
}

/**
 * Convert a date + time in a timezone to ISO 8601 string.
 */
function toISOInTimezone(
  dateStr: string,
  hours: number,
  minutes: number,
  timezone: string
): string {
  // Handle minute overflow
  const totalMinutes = hours * 60 + minutes
  const normalizedHours = Math.floor(totalMinutes / 60)
  const normalizedMinutes = totalMinutes % 60

  const hh = String(normalizedHours).padStart(2, '0')
  const mm = String(normalizedMinutes).padStart(2, '0')

  // Build a local datetime string and use the timezone to resolve to UTC
  // We create the date assuming the local time, then format in the target timezone
  const localStr = `${dateStr}T${hh}:${mm}:00`

  // Use a trick: create the date, then calculate the offset
  // For Workers compatibility, we format in both UTC and target timezone to find offset
  const tempDate = new Date(localStr + 'Z') // treat as UTC temporarily

  // Get the offset between UTC and target timezone
  const utcParts = getDateParts(tempDate, 'UTC')
  const tzParts = getDateParts(tempDate, timezone)

  // Calculate offset in minutes (timezone - UTC)
  const utcMinutes = utcParts.hours * 60 + utcParts.minutes
  const tzMinutes = tzParts.hours * 60 + tzParts.minutes
  let offsetMinutes = tzMinutes - utcMinutes

  // Handle day boundary
  if (offsetMinutes > 720) offsetMinutes -= 1440
  if (offsetMinutes < -720) offsetMinutes += 1440

  // The actual UTC time is: localTime - offset
  const actualUTC = new Date(tempDate.getTime() - offsetMinutes * 60 * 1000)
  return actualUTC.toISOString()
}

function getDateParts(date: Date, timezone: string): { hours: number, minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  })
  const parts = formatter.formatToParts(date)
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
  return { hours, minutes }
}
