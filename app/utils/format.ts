import { format, formatDistance, formatRelative, isValid } from 'date-fns'

export function formatDate(date: Date | string | number | null | undefined, formatStr = 'MMM d, yyyy'): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date

  if (!isValid(dateObj)) return '-'

  return format(dateObj, formatStr)
}

export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date

  if (!isValid(dateObj)) return '-'

  return format(dateObj, 'MMM d, yyyy h:mm a')
}

export function formatTimeAgo(date: Date | string | number | null | undefined): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date

  if (!isValid(dateObj)) return '-'

  return formatDistance(dateObj, new Date(), { addSuffix: true })
}

export function formatRelativeDate(date: Date | string | number | null | undefined): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date

  if (!isValid(dateObj)) return '-'

  return formatRelative(dateObj, new Date())
}

