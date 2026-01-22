<template>
  <div class="w-80 max-h-96 overflow-hidden bg-white rounded-lg shadow-lg border border-gray-200">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
      <h3 class="font-semibold text-gray-900">Notifications</h3>
      <button
        v-if="notices.length > 0 && hasUnread"
        @click="handleMarkAllRead"
        class="text-xs text-burgundy-600 hover:text-burgundy-800 font-medium"
      >
        Mark all read
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <Loader class="w-6 h-6 animate-spin text-gray-400" />
    </div>

    <!-- Empty State -->
    <div v-else-if="notices.length === 0" class="py-8 text-center">
      <Bell class="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p class="text-sm text-gray-500">No notifications yet</p>
    </div>

    <!-- Notices List -->
    <div v-else class="overflow-y-auto max-h-72 divide-y divide-gray-100">
      <NoticesNotificationItem
        v-for="notice in displayedNotices"
        :key="notice.recipientId"
        :notice="notice"
        @click="handleNoticeClick"
        @dismiss="handleDismiss"
      />
    </div>

    <!-- Footer -->
    <div v-if="notices.length > 0" class="px-4 py-2 border-t border-gray-100 bg-gray-50">
      <NuxtLink
        to="/notifications"
        class="block text-center text-sm text-burgundy-600 hover:text-burgundy-800 font-medium"
        @click="$emit('close')"
      >
        View all notifications
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Bell, Loader } from 'lucide-vue-next'
import type { Notice } from '~/composables/useNotices'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()
const { notices, loading, fetchNotices, markAsRead, dismiss, markAllRead } = useNotices()

const displayedNotices = computed(() => {
  return notices.value.slice(0, 5)
})

const hasUnread = computed(() => {
  return notices.value.some(n => !n.isRead)
})

async function handleNoticeClick(notice: Notice) {
  // Mark as read
  if (!notice.isRead) {
    await markAsRead(notice.recipientId)
  }

  // Navigate if there's an action URL
  if (notice.actionUrl) {
    emit('close')
    router.push(notice.actionUrl)
  }
}

async function handleDismiss(recipientId: string) {
  await dismiss(recipientId)
}

async function handleMarkAllRead() {
  await markAllRead()
}

onMounted(() => {
  fetchNotices({ limit: 10 })
})
</script>
