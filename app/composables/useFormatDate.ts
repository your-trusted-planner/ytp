/**
 * Date formatting utilities.
 *
 * Two distinct helpers exist because the app stores two different kinds of dates:
 *
 * - **Calendar dates** (DOB, invoice due dates, effectiveDates, work dates, etc.)
 *   are stored as UTC-midnight Unix timestamps. `toLocaleDateString()` without an
 *   explicit timezone shifts the date back by the local UTC offset, showing e.g.
 *   "Apr 14" for a stored Apr 15. Use `formatCalendarDate()` for these.
 *
 * - **Timestamps** (createdAt, updatedAt, activity log times) represent an actual
 *   moment in time and should display in the user's local timezone. Use
 *   `formatTimestamp()` for these.
 */
export function useFormatDate() {
  /**
   * Format a calendar date stored as a UTC-midnight Unix timestamp.
   * Always renders in UTC so the displayed date matches the stored date
   * regardless of the viewer's timezone.
   */
  function formatCalendarDate(
    timestamp?: number | null,
    options?: Intl.DateTimeFormatOptions
  ): string {
    if (!timestamp) return '—'
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
      ...options
    })
  }

  /**
   * Format a Unix timestamp as a local-time date string.
   * Use for createdAt/updatedAt and other true wall-clock moments.
   */
  function formatTimestamp(timestamp?: number | null): string {
    if (!timestamp) return '—'
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return { formatCalendarDate, formatTimestamp }
}
