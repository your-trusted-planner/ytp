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
              Progress
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
          <template v-for="run in runs" :key="run.id">
            <tr
              class="hover:bg-gray-50 cursor-pointer"
              @click="toggleExpanded(run.id)"
            >
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
                  <span v-if="run.skippedRecords > 0" class="text-gray-400">-{{ run.skippedRecords }}</span>
                  <span v-if="run.errorCount > 0" class="text-red-600">
                    <AlertCircle class="w-4 h-4 inline" />
                    {{ run.errorCount }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                <template v-if="run.totalEntities">
                  {{ run.processedEntities }}/{{ run.totalEntities }}
                </template>
                <template v-else>-</template>
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
                <div class="flex items-center justify-end gap-2" @click.stop>
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
                  <ChevronDown
                    class="w-4 h-4 text-gray-400 transition-transform"
                    :class="{ 'rotate-180': expandedRunId === run.id }"
                  />
                </div>
              </td>
            </tr>
            <!-- Expanded Detail Row -->
            <tr v-if="expandedRunId === run.id">
              <td colspan="8" class="px-4 py-4 bg-gray-50 border-b">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p class="text-gray-500 text-xs uppercase mb-1">Processed</p>
                    <p class="font-medium">{{ run.processedEntities ?? 0 }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs uppercase mb-1">Created</p>
                    <p class="font-medium text-green-600">{{ run.createdRecords }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs uppercase mb-1">Updated</p>
                    <p class="font-medium text-blue-600">{{ run.updatedRecords }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs uppercase mb-1">Skipped</p>
                    <p class="font-medium text-gray-500">{{ run.skippedRecords ?? 0 }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs uppercase mb-1">Duplicates Linked</p>
                    <p class="font-medium text-amber-600">{{ run.duplicatesLinked ?? 0 }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs uppercase mb-1">Errors</p>
                    <p class="font-medium" :class="run.errorCount > 0 ? 'text-red-600' : 'text-gray-500'">
                      {{ run.errorCount }}
                    </p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs uppercase mb-1">Started</p>
                    <p class="font-medium">{{ run.startedAt ? formatDate(run.startedAt) : '-' }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs uppercase mb-1">Completed</p>
                    <p class="font-medium">{{ run.completedAt ? formatDate(run.completedAt) : '-' }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs uppercase mb-1">Duration</p>
                    <p class="font-medium">{{ formatDuration(run) }}</p>
                  </div>
                  <div>
                    <p class="text-gray-500 text-xs uppercase mb-1">Entity Types</p>
                    <p class="font-medium">{{ run.entityTypes.map(t => entityFullLabels[t] || t).join(', ') }}</p>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FileText, AlertCircle, Play, ChevronDown } from 'lucide-vue-next'

interface MigrationRun {
  id: string
  integrationId: string
  runType: 'FULL' | 'INCREMENTAL'
  entityTypes: string[]
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  totalEntities: number | null
  processedEntities: number
  createdRecords: number
  updatedRecords: number
  skippedRecords: number
  duplicatesLinked?: number
  errorCount: number
  progressPercent: number | null
  currentPhase: string | null
  estimatedTimeRemaining: number | null
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

const expandedRunId = ref<string | null>(null)

function toggleExpanded(id: string) {
  expandedRunId.value = expandedRunId.value === id ? null : id
}

const entityFullLabels: Record<string, string> = {
  users: 'Users',
  contacts: 'Contacts',
  prospects: 'Prospects',
  notes: 'Notes',
  activities: 'Activities'
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
  return types.map(t => entityFullLabels[t] || t).join(', ')
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
