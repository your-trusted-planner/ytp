import { format, formatDistance, formatRelative } from 'date-fns'

export function formatDate(date: Date | string | number, formatStr = 'MMM d, yyyy') {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return format(dateObj, formatStr)
}

export function formatDateTime(date: Date | string | number) {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return format(dateObj, 'MMM d, yyyy h:mm a')
}

export function formatTimeAgo(date: Date | string | number) {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return formatDistance(dateObj, new Date(), { addSuffix: true })
}

export function formatRelativeDate(date: Date | string | number) {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return formatRelative(dateObj, new Date())
}

