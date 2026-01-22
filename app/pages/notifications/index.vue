<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Notifications</h1>
        <p class="text-gray-600 mt-1">Stay updated on important activity</p>
      </div>
      <div class="flex items-center gap-3">
        <UiButton
          v-if="notices.length > 0 && hasUnread"
          variant="outline"
          size="sm"
          @click="handleMarkAllRead"
        >
          <CheckCheck class="w-4 h-4 mr-2" />
          Mark all read
        </UiButton>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            activeTab === tab.id
              ? 'border-burgundy-500 text-burgundy-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2'
          ]"
        >
          {{ tab.label }}
          <span
            v-if="tab.count > 0"
            class="px-2 py-0.5 text-xs font-medium rounded-full"
            :class="activeTab === tab.id ? 'bg-burgundy-100 text-burgundy-600' : 'bg-gray-100 text-gray-600'"
          >
            {{ tab.count }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Loader class="w-8 h-8 animate-spin text-burgundy-600" />
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredNotices.length === 0" class="text-center py-12">
      <Bell class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        {{ activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet' }}
      </h3>
      <p class="text-gray-500">
        {{ activeTab === 'unread'
          ? 'You\'re all caught up!'
          : 'Notifications about important activity will appear here.' }}
      </p>
    </div>

    <!-- Notifications List -->
    <div v-else class="space-y-2">
      <div
        v-for="notice in filteredNotices"
        :key="notice.recipientId"
        class="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all hover:shadow-sm"
        :class="{ 'border-l-4 border-l-blue-500': !notice.isRead }"
      >
        <div class="flex items-start gap-4 p-4">
          <!-- Severity Icon -->
          <div class="flex-shrink-0 mt-1">
            <component
              :is="getSeverityIcon(notice.severity)"
              class="w-6 h-6"
              :class="getSeverityIconClass(notice.severity)"
            />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h4 class="text-sm font-semibold text-gray-900">
                  {{ notice.title }}
                </h4>
                <p class="text-sm text-gray-600 mt-1">
                  {{ notice.message }}
                </p>
                <div class="flex items-center gap-4 mt-2">
                  <span class="text-xs text-gray-400">
                    {{ formatDate(notice.createdAt) }}
                  </span>
                  <UiBadge size="sm" :variant="getTypeBadgeVariant(notice.type)">
                    {{ formatNoticeType(notice.type) }}
                  </UiBadge>
                </div>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0">
                <!-- Action Button -->
                <UiButton
                  v-if="notice.actionUrl"
                  size="sm"
                  variant="outline"
                  @click="handleNavigate(notice)"
                >
                  {{ notice.actionLabel || 'View' }}
                </UiButton>

                <!-- Mark Read -->
                <button
                  v-if="!notice.isRead"
                  @click="handleMarkAsRead(notice.recipientId)"
                  class="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                  title="Mark as read"
                >
                  <Check class="w-4 h-4" />
                </button>

                <!-- Dismiss -->
                <button
                  @click="handleDismiss(notice.recipientId)"
                  class="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                  title="Dismiss"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="text-center py-4">
        <UiButton variant="outline" @click="loadMore" :is-loading="loadingMore">
          Load more
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Bell,
  Loader,
  CheckCheck,
  Check,
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info
} from 'lucide-vue-next'
import type { Notice } from '~/composables/useNotices'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const router = useRouter()
const { notices, loading, fetchNotices, markAsRead, dismiss, markAllRead } = useNotices()

const activeTab = ref<'all' | 'unread'>('all')
const loadingMore = ref(false)
const offset = ref(0)
const limit = 20

const tabs = computed(() => [
  { id: 'all' as const, label: 'All', count: notices.value.length },
  { id: 'unread' as const, label: 'Unread', count: notices.value.filter(n => !n.isRead).length }
])

const filteredNotices = computed(() => {
  if (activeTab.value === 'unread') {
    return notices.value.filter(n => !n.isRead)
  }
  return notices.value
})

const hasUnread = computed(() => notices.value.some(n => !n.isRead))
const hasMore = computed(() => notices.value.length >= limit + offset.value)

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'SUCCESS':
      return CheckCircle
    case 'WARNING':
      return AlertTriangle
    case 'ERROR':
      return XCircle
    case 'INFO':
    default:
      return Info
  }
}

function getSeverityIconClass(severity: string) {
  switch (severity) {
    case 'SUCCESS':
      return 'text-green-500'
    case 'WARNING':
      return 'text-amber-500'
    case 'ERROR':
      return 'text-red-500'
    case 'INFO':
    default:
      return 'text-blue-500'
  }
}

function getTypeBadgeVariant(type: string): 'default' | 'success' | 'danger' | 'primary' {
  switch (type) {
    case 'DRIVE_SYNC_ERROR':
      return 'danger'
    case 'DOCUMENT_SIGNED':
    case 'PAYMENT_RECEIVED':
      return 'success'
    case 'JOURNEY_ACTION_REQUIRED':
      return 'primary'
    default:
      return 'default'
  }
}

function formatNoticeType(type: string): string {
  const typeMap: Record<string, string> = {
    DRIVE_SYNC_ERROR: 'Drive Error',
    DOCUMENT_SIGNED: 'Document',
    CLIENT_FILE_UPLOADED: 'Upload',
    JOURNEY_ACTION_REQUIRED: 'Action Required',
    SYSTEM_ANNOUNCEMENT: 'Announcement',
    PAYMENT_RECEIVED: 'Payment'
  }
  return typeMap[type] || type
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

async function handleNavigate(notice: Notice) {
  if (!notice.isRead) {
    await markAsRead(notice.recipientId)
  }
  if (notice.actionUrl) {
    router.push(notice.actionUrl)
  }
}

async function handleMarkAsRead(recipientId: string) {
  await markAsRead(recipientId)
}

async function handleDismiss(recipientId: string) {
  await dismiss(recipientId)
}

async function handleMarkAllRead() {
  await markAllRead()
}

async function loadMore() {
  loadingMore.value = true
  offset.value += limit
  await fetchNotices({ limit: limit + offset.value })
  loadingMore.value = false
}

onMounted(() => {
  fetchNotices({ limit })
})
</script>
