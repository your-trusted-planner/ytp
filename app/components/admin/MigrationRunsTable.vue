<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading migration history...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="runs.length === 0" class="text-center py-12">
      <FileText class="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500">No previous migrations</p>
    </div>

    <!-- Runs Table -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Entities
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Records
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="run in runs" :key="run.id" class="hover:bg-gray-50">
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ formatDate(run.createdAt) }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm">
              <UiBadge :variant="run.runType === 'FULL' ? 'info' : 'default'" size="sm">
                {{ run.runType }}
              </UiBadge>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
              {{ formatEntityTypes(run.entityTypes) }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm">
              <div class="flex items-center gap-2">
                <span class="text-green-600">+{{ run.createdRecords }}</span>
                <span class="text-blue-600">~{{ run.updatedRecords }}</span>
                <span v-if="run.errorCount > 0" class="text-red-600">
                  <AlertCircle class="w-4 h-4 inline" />
                  {{ run.errorCount }}
                </span>
              </div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
              <UiBadge :variant="statusVariant(run.status)" size="sm">
                {{ run.status }}
              </UiBadge>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
              {{ formatDuration(run) }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-right text-sm">
              <div class="flex items-center justify-end gap-2">
                <button
                  v-if="run.errorCount > 0"
                  @click="$emit('view-errors', run)"
                  class="text-red-600 hover:text-red-800"
                  title="View errors"
                >
                  <AlertCircle class="w-4 h-4" />
                </button>
                <button
                  v-if="run.status === 'PAUSED'"
                  @click="$emit('resume', run)"
                  class="text-blue-600 hover:text-blue-800"
                  title="Resume"
                >
                  <Play class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileText, AlertCircle, Play } from 'lucide-vue-next'

interface MigrationRun {
  id: string
  runType: 'FULL' | 'INCREMENTAL'
  entityTypes: string[]
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  processedEntities: number
  createdRecords: number
  updatedRecords: number
  errorCount: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

defineProps<{
  runs: MigrationRun[]
  loading?: boolean
}>()

defineEmits<{
  'view-errors': [run: MigrationRun]
  'resume': [run: MigrationRun]
}>()

const entityLabels: Record<string, string> = {
  users: 'U',
  contacts: 'C',
  prospects: 'P',
  notes: 'N',
  activities: 'A'
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'COMPLETED': return 'success'
    case 'FAILED': return 'danger'
    case 'CANCELLED': return 'warning'
    case 'PAUSED': return 'warning'
    case 'RUNNING': return 'info'
    default: return 'default'
  }
}

function formatEntityTypes(types: string[]): string {
  return types.map(t => entityLabels[t] || t.charAt(0).toUpperCase()).join(', ')
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function formatDuration(run: MigrationRun): string {
  if (!run.startedAt) return '-'

  const start = new Date(run.startedAt).getTime()
  const end = run.completedAt ? new Date(run.completedAt).getTime() : Date.now()
  const seconds = Math.floor((end - start) / 1000)

  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    return `${mins}m`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}
</script>
