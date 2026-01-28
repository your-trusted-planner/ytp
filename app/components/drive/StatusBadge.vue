<template>
  <component
    :is="folderUrl && status === 'SYNCED' ? 'a' : 'span'"
    :href="folderUrl && status === 'SYNCED' ? folderUrl : undefined"
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors"
    :class="[
      badgeClasses,
      folderUrl && status === 'SYNCED' ? 'cursor-pointer hover:opacity-80' : ''
    ]"
    :title="tooltipText"
  >
    <component :is="icon" class="w-3.5 h-3.5" />
    <span v-if="showLabel">{{ labelText }}</span>
    <ExternalLink v-if="folderUrl && status === 'SYNCED'" class="w-3 h-3" />
  </component>
</template>

<script setup lang="ts">
import { CheckCircle, AlertCircle, XCircle, CloudOff, ExternalLink } from 'lucide-vue-next'
import { computed } from 'vue'

type SyncStatus = 'SYNCED' | 'NOT_SYNCED' | 'ERROR' | null | undefined

const props = withDefaults(defineProps<{
  status?: SyncStatus
  folderUrl?: string | null
  showLabel?: boolean
}>(), {
  status: 'NOT_SYNCED',
  showLabel: true
})

const badgeClasses = computed(() => {
  switch (props.status) {
    case 'SYNCED':
      return 'bg-green-50 text-green-700 border border-green-200'
    case 'ERROR':
      return 'bg-red-50 text-red-700 border border-red-200'
    case 'NOT_SYNCED':
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200'
  }
})

const icon = computed(() => {
  switch (props.status) {
    case 'SYNCED':
      return CheckCircle
    case 'ERROR':
      return XCircle
    case 'NOT_SYNCED':
    default:
      return CloudOff
  }
})

const labelText = computed(() => {
  switch (props.status) {
    case 'SYNCED':
      return 'Drive Synced'
    case 'ERROR':
      return 'Sync Error'
    case 'NOT_SYNCED':
    default:
      return 'Not Synced'
  }
})

const tooltipText = computed(() => {
  switch (props.status) {
    case 'SYNCED':
      return props.folderUrl ? 'Click to open Google Drive folder' : 'Synced to Google Drive'
    case 'ERROR':
      return 'Google Drive sync failed - click Resync to retry'
    case 'NOT_SYNCED':
    default:
      return 'Not synced to Google Drive'
  }
})
</script>
