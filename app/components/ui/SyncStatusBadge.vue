<template>
  <div v-if="parsedMeta" class="inline-flex items-center gap-2 text-xs">
    <!-- Source badge -->
    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
      <RefreshCw class="w-3 h-3" />
      {{ sourceLabel }}
    </span>

    <!-- Last synced -->
    <span v-if="lastSyncedText" class="text-gray-500">
      Synced {{ lastSyncedText }}
    </span>

    <!-- Local edits indicator -->
    <span
      v-if="hasLocalEdits"
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium"
      :title="localEditTooltip"
    >
      <PenLine class="w-3 h-3" />
      Local edits
    </span>

    <!-- YTP-owned indicator -->
    <span
      v-if="isYtpOwned"
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium"
    >
      YTP owned
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RefreshCw, PenLine } from 'lucide-vue-next'

interface Props {
  importMetadata?: string | null
}

const props = defineProps<Props>()

interface ParsedMetadata {
  source: string
  externalId: string
  importedAt?: string
  lastSyncedAt?: string
  sourceOfTruth?: 'LAWMATICS' | 'YTP'
  locallyModifiedFields?: string[]
}

const parsedMeta = computed((): ParsedMetadata | null => {
  if (!props.importMetadata) return null
  try {
    const meta = JSON.parse(props.importMetadata) as ParsedMetadata
    return meta.source ? meta : null
  } catch {
    return null
  }
})

const sourceLabel = computed(() => {
  if (!parsedMeta.value) return ''
  switch (parsedMeta.value.source) {
    case 'LAWMATICS': return 'Lawmatics'
    case 'WEALTHCOUNSEL': return 'WealthCounsel'
    case 'CLIO': return 'Clio'
    default: return parsedMeta.value.source
  }
})

const lastSyncedText = computed(() => {
  const syncedAt = parsedMeta.value?.lastSyncedAt
  if (!syncedAt) return null

  const date = new Date(syncedAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})

const hasLocalEdits = computed(() => {
  return (parsedMeta.value?.locallyModifiedFields?.length ?? 0) > 0
})

const localEditTooltip = computed(() => {
  const fields = parsedMeta.value?.locallyModifiedFields || []
  return `Locally modified: ${fields.join(', ')}`
})

const isYtpOwned = computed(() => {
  return parsedMeta.value?.sourceOfTruth === 'YTP'
})
</script>
