import { ref, readonly } from 'vue'

export interface Notice {
  id: string
  recipientId: string
  type: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  title: string
  message: string
  targetType?: string
  targetId?: string
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, any>
  createdAt: number
  readAt?: number
  dismissedAt?: number
  isRead: boolean
}

// Global state shared across components
const notices = ref<Notice[]>([])
const unreadCount = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
let pollInterval: NodeJS.Timeout | null = null

export function useNotices() {
  async function fetchNotices(options?: { unreadOnly?: boolean; limit?: number }) {
    loading.value = true
    error.value = null

    try {
      const query = new URLSearchParams()
      if (options?.unreadOnly) query.set('unreadOnly', 'true')
      if (options?.limit) query.set('limit', options.limit.toString())

      const response = await $fetch<{ notices: Notice[] }>(`/api/notices?${query}`)
      notices.value = response.notices
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch notices'
      console.error('Failed to fetch notices:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchUnreadCount() {
    try {
      const response = await $fetch<{ count: number }>('/api/notices/unread-count')
      unreadCount.value = response.count
    } catch (e) {
      console.error('Failed to fetch unread count:', e)
    }
  }

  async function markAsRead(recipientId: string) {
    try {
      await $fetch(`/api/notices/${recipientId}/read`, { method: 'POST' })

      // Update local state
      const notice = notices.value.find(n => n.recipientId === recipientId)
      if (notice && !notice.isRead) {
        notice.isRead = true
        notice.readAt = Math.floor(Date.now() / 1000)
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (e) {
      console.error('Failed to mark notice as read:', e)
    }
  }

  async function dismiss(recipientId: string) {
    try {
      await $fetch(`/api/notices/${recipientId}/dismiss`, { method: 'POST' })

      // Remove from local state
      const index = notices.value.findIndex(n => n.recipientId === recipientId)
      if (index !== -1) {
        const notice = notices.value[index]
        if (!notice.isRead) {
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
        notices.value.splice(index, 1)
      }
    } catch (e) {
      console.error('Failed to dismiss notice:', e)
    }
  }

  async function markAllRead() {
    try {
      await $fetch('/api/notices/mark-all-read', { method: 'POST' })

      // Update local state
      notices.value.forEach(notice => {
        notice.isRead = true
        notice.readAt = Math.floor(Date.now() / 1000)
      })
      unreadCount.value = 0
    } catch (e) {
      console.error('Failed to mark all as read:', e)
    }
  }

  function startPolling(intervalMs = 60000) {
    // Fetch immediately
    fetchUnreadCount()

    // Stop any existing polling
    stopPolling()

    // Start new polling interval
    pollInterval = setInterval(() => {
      fetchUnreadCount()
    }, intervalMs)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  return {
    notices: readonly(notices),
    unreadCount: readonly(unreadCount),
    loading: readonly(loading),
    error: readonly(error),
    fetchNotices,
    fetchUnreadCount,
    markAsRead,
    dismiss,
    markAllRead,
    startPolling,
    stopPolling
  }
}
