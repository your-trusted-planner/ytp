<template>
  <div
    class="flex items-start gap-3 p-3 rounded-lg transition-colors"
    :class="[
      !notice.isRead ? 'bg-blue-50' : 'hover:bg-gray-50',
      clickable ? 'cursor-pointer' : ''
    ]"
    @click="handleClick"
  >
    <!-- Severity Icon -->
    <div class="flex-shrink-0 mt-0.5">
      <component
        :is="severityIcon"
        class="w-5 h-5"
        :class="severityIconClass"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <!-- Title -->
          <p class="text-sm font-medium text-gray-900 truncate">
            {{ notice.title }}
          </p>

          <!-- Message -->
          <p class="text-sm text-gray-600 mt-0.5 line-clamp-2">
            {{ notice.message }}
          </p>

          <!-- Timestamp -->
          <p class="text-xs text-gray-400 mt-1">
            {{ formatRelativeTime(notice.createdAt) }}
          </p>
        </div>

        <!-- Dismiss Button -->
        <button
          v-if="showDismiss"
          @click.stop="handleDismiss"
          class="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          title="Dismiss"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Unread indicator -->
      <div
        v-if="!notice.isRead"
        class="w-2 h-2 bg-blue-500 rounded-full absolute top-3 left-3"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-vue-next'
import type { Notice } from '~/composables/useNotices'

const props = withDefaults(defineProps<{
  notice: Notice
  showDismiss?: boolean
}>(), {
  showDismiss: true
})

const emit = defineEmits<{
  (e: 'click', notice: Notice): void
  (e: 'dismiss', recipientId: string): void
}>()

const severityIcon = computed(() => {
  switch (props.notice.severity) {
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
})

const severityIconClass = computed(() => {
  switch (props.notice.severity) {
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
})

const clickable = computed(() => !!props.notice.actionUrl)

function handleClick() {
  emit('click', props.notice)
}

function handleDismiss() {
  emit('dismiss', props.notice.recipientId)
}

function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
