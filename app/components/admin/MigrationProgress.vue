<template>
  <UiCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            :class="[
              'w-3 h-3 rounded-full',
              run.status === 'RUNNING' ? 'bg-blue-500 animate-pulse' :
              run.status === 'PAUSED' ? 'bg-yellow-500' :
              run.status === 'PENDING' ? 'bg-gray-400' : 'bg-gray-300'
            ]"
          />
          <h3 class="text-lg font-semibold text-gray-900">
            {{ run.runType === 'FULL' ? 'Full Import' : 'Incremental Import' }}
          </h3>
          <UiBadge :variant="statusVariant">{{ statusLabel }}</UiBadge>
        </div>
        <div class="flex gap-2">
          <UiButton
            v-if="run.status === 'RUNNING'"
            variant="outline"
            size="sm"
            @click="$emit('pause')"
          >
            <Pause class="w-4 h-4 mr-1" />
            Pause
          </UiButton>
          <UiButton
            v-if="run.status === 'PAUSED'"
            variant="outline"
            size="sm"
            @click="$emit('resume')"
          >
            <Play class="w-4 h-4 mr-1" />
            Resume
          </UiButton>
          <UiButton
            v-if="run.status === 'RUNNING' || run.status === 'PAUSED'"
            variant="danger"
            size="sm"
            @click="$emit('cancel')"
          >
            <X class="w-4 h-4 mr-1" />
            Cancel
          </UiButton>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Phase Indicator -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">
            {{ currentPhaseLabel }}
          </span>
          <span class="text-sm text-gray-500">
            {{ run.progressPercent !== null ? `${run.progressPercent}%` : 'Calculating...' }}
          </span>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="run.status === 'PAUSED' ? 'bg-yellow-500' : 'bg-burgundy-600'"
            :style="{ width: `${run.progressPercent || 0}%` }"
          />
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="text-center p-3 bg-gray-50 rounded-lg">
          <p class="text-2xl font-bold text-gray-900">{{ run.processedEntities.toLocaleString() }}</p>
          <p class="text-xs text-gray-500">Processed</p>
        </div>
        <div class="text-center p-3 bg-green-50 rounded-lg">
          <p class="text-2xl font-bold text-green-700">{{ run.createdRecords.toLocaleString() }}</p>
          <p class="text-xs text-gray-500">Created</p>
        </div>
        <div class="text-center p-3 bg-blue-50 rounded-lg">
          <p class="text-2xl font-bold text-blue-700">{{ run.updatedRecords.toLocaleString() }}</p>
          <p class="text-xs text-gray-500">Updated</p>
        </div>
        <div class="text-center p-3 bg-gray-50 rounded-lg">
          <p class="text-2xl font-bold text-gray-500">{{ run.skippedRecords.toLocaleString() }}</p>
          <p class="text-xs text-gray-500">Skipped</p>
        </div>
        <div
          v-if="run.duplicatesLinked !== undefined && run.duplicatesLinked > 0"
          class="text-center p-3 bg-amber-50 rounded-lg"
          :title="'Duplicate contacts that were auto-linked to existing people'"
        >
          <p class="text-2xl font-bold text-amber-700">{{ run.duplicatesLinked.toLocaleString() }}</p>
          <p class="text-xs text-gray-500">Duplicates Linked</p>
        </div>
        <div
          class="text-center p-3 rounded-lg cursor-pointer transition-colors"
          :class="run.errorCount > 0 ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50'"
          @click="run.errorCount > 0 && $emit('view-errors')"
        >
          <p :class="['text-2xl font-bold', run.errorCount > 0 ? 'text-red-700' : 'text-gray-500']">
            {{ run.errorCount.toLocaleString() }}
          </p>
          <p class="text-xs text-gray-500">
            {{ run.errorCount > 0 ? 'Errors (click to view)' : 'Errors' }}
          </p>
        </div>
      </div>

      <!-- Time Estimate -->
      <div v-if="run.status === 'RUNNING' && run.estimatedTimeRemaining" class="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Clock class="w-4 h-4" />
        <span>Estimated time remaining: {{ formatDuration(run.estimatedTimeRemaining) }}</span>
      </div>

      <!-- Started/Duration Info -->
      <div class="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
        <span v-if="run.startedAt">
          Started: {{ formatDate(run.startedAt) }}
        </span>
        <span v-if="run.startedAt">
          Duration: {{ formatDuration(elapsed) }}
        </span>
      </div>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { Pause, Play, X, Clock } from 'lucide-vue-next'

interface MigrationRun {
  id: string
  runType: 'FULL' | 'INCREMENTAL'
  entityTypes: string[]
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  processedEntities: number
  totalEntities: number | null
  createdRecords: number
  updatedRecords: number
  skippedRecords: number
  errorCount: number
  duplicatesLinked?: number // Duplicates that were auto-linked to existing people
  currentPhase: string | null
  progressPercent: number | null
  estimatedTimeRemaining: number | null
  startedAt: string | null
  completedAt: string | null
}

const props = defineProps<{
  run: MigrationRun
}>()

defineEmits<{
  pause: []
  resume: []
  cancel: []
  'view-errors': []
}>()

const phaseLabels: Record<string, string> = {
  users: 'Importing Users',
  contacts: 'Importing Contacts',
  prospects: 'Importing Prospects',
  notes: 'Importing Notes',
  activities: 'Importing Activities'
}

const statusVariant = computed(() => {
  switch (props.run.status) {
    case 'RUNNING': return 'info'
    case 'PAUSED': return 'warning'
    case 'PENDING': return 'default'
    default: return 'default'
  }
})

const statusLabel = computed(() => {
  switch (props.run.status) {
    case 'RUNNING': return 'Running'
    case 'PAUSED': return 'Paused'
    case 'PENDING': return 'Starting...'
    default: return props.run.status
  }
})

const currentPhaseLabel = computed(() => {
  if (!props.run.currentPhase) return 'Initializing...'

  const phaseIndex = props.run.entityTypes.indexOf(props.run.currentPhase)
  const totalPhases = props.run.entityTypes.length

  return `Phase ${phaseIndex + 1}/${totalPhases}: ${phaseLabels[props.run.currentPhase] || props.run.currentPhase}`
})

const elapsed = computed(() => {
  if (!props.run.startedAt) return 0
  const start = new Date(props.run.startedAt).getTime()
  const end = props.run.completedAt ? new Date(props.run.completedAt).getTime() : Date.now()
  return Math.floor((end - start) / 1000)
})

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
</script>
