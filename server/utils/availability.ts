/**
 * Availability Calculator
 *
 * Generates available time slots from free/busy data within business hours.
 * Supports both legacy single-window format and per-day multi-window schedules.
 */

export interface TimeSlot {
  startTime: string // ISO 8601
  endTime: string // ISO 8601
  available: boolean
}

/** Legacy format: single window applied to selected days */
export interface BusinessHours {
  start: number // Hour in 24h format (e.g., 9)
  end: number // Hour in 24h format (e.g., 17)
  days: number[] // 0=Sunday, 1=Monday, ..., 6=Saturday
}

/** A single availability window with HH:MM precision */
export interface TimeWindow {
  start: string // "HH:MM" (e.g., "09:30")
  end: string // "HH:MM" (e.g., "14:00")
}

/** Per-day multi-window schedule. Days without entries are unavailable. */
export interface BusinessSchedule {
  schedule: Record<string, TimeWindow[]> // key = day number ("0"-"6")
}

/** Either legacy or per-day format */
export type BusinessHoursConfig = BusinessHours | BusinessSchedule

export const HARDCODED_DEFAULT_BUSINESS_HOURS: BusinessHours = {
  start: 9,
  end: 17,
  days: [1, 2, 3, 4, 5] // Monday-Friday
}

/**
 * Type guard: check if config is the new per-day schedule format.
 */
export function isBusinessSchedule(config: BusinessHoursConfig): config is BusinessSchedule {
  return 'schedule' in config && typeof config.schedule === 'object'
}

/**
 * Get the active time windows for a specific day from either format.
 */
export function getWindowsForDay(config: BusinessHoursConfig, dayOfWeek: number): TimeWindow[] {
  if (isBusinessSchedule(config)) {
    return config.schedule[String(dayOfWeek)] || []
  }
  // Legacy format: single window for all listed days
  if (!config.days.includes(dayOfWeek)) return []
  const startH = String(Math.floor(config.start)).padStart(2, '0')
  const endH = String(Math.floor(config.end)).padStart(2, '0')
  const startM = String(Math.round((config.start % 1) * 60)).padStart(2, '0')
  const endM = String(Math.round((config.end % 1) * 60)).padStart(2, '0')
  return [{ start: `${startH}:${startM}`, end: `${endH}:${endM}` }]
}

/**
 * Get all days that have any availability configured.
 */
export function getActiveDays(config: BusinessHoursConfig): number[] {
  if (isBusinessSchedule(config)) {
    return Object.entries(config.schedule)
      .filter(([, windows]) => windows.length > 0)
      .map(([day]) => Number(day))
  }
  return config.days
}

/**
 * Parse "HH:MM" string to { hours, minutes }.
 */
function parseTime(time: string): { hours: number; minutes: number } {
  const parts = time.split(':').map(Number)
  return { hours: parts[0] || 0, minutes: parts[1] || 0 }
}

/**
 * Load the system-configured default business hours from the settings table.
 * Falls back to 9-5 M-F if no setting is configured.
 */
export async function getDefaultBusinessHours(): Promise<BusinessHoursConfig> {
  try {
    const { getSetting } = await import('./settings')
    const raw = await getSetting('default_business_hours')
    if (raw) {
      const parsed = JSON.parse(raw)
      // New format
      if (parsed.schedule) return parsed as BusinessSchedule
      // Legacy format
      if (parsed.start !== undefined && parsed.end !== undefined && Array.isArray(parsed.days)) {
        return parsed as BusinessHours
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
 * @param businessHours - Business hours config (legacy or per-day schedule)
 * @returns Array of time slots with availability flags
 */
export function calculateAvailableSlots(
  busyPeriods: Array<{ start: string, end: string }>,
  date: string,
  timezone: string,
  durationMinutes: number = 60,
  businessHours: BusinessHoursConfig = HARDCODED_DEFAULT_BUSINESS_HOURS
): TimeSlot[] {
  const dayOfWeek = getDayOfWeekInTimezone(date, timezone)
  const windows = getWindowsForDay(businessHours, dayOfWeek)

  if (windows.length === 0) {
    return [] // Not a business day / no windows configured
  }

  const slots: TimeSlot[] = []
  const intervalMinutes = 30
  const now = new Date()

  for (const window of windows) {
    const windowStart = parseTime(window.start)
    const windowEnd = parseTime(window.end)
    const windowStartMinutes = windowStart.hours * 60 + windowStart.minutes
    const windowEndMinutes = windowEnd.hours * 60 + windowEnd.minutes

    // Generate slots at 30-min intervals within this window
    for (let totalMin = windowStartMinutes; totalMin < windowEndMinutes; totalMin += intervalMinutes) {
      const hour = Math.floor(totalMin / 60)
      const minute = totalMin % 60

      // Check if slot end would exceed this window
      const slotEndMinutes = totalMin + durationMinutes
      if (slotEndMinutes > windowEndMinutes) continue

      const startISO = toISOInTimezone(date, hour, minute, timezone)
      const endISO = toISOInTimezone(date, hour, minute + durationMinutes, timezone)

      const slotStart = new Date(startISO)
      const slotEnd = new Date(endISO)

      // Skip past times
      if (slotStart <= now) continue

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

  // Sort by start time (windows may not be in order)
  slots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

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
