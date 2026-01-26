<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <NuxtLink
        to="/settings/integrations/lawmatics"
        class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <ArrowLeft class="w-5 h-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Lawmatics Migration</h1>
        <p class="text-gray-600 mt-1">Import data from Lawmatics into the system</p>
      </div>
    </div>

    <!-- Current Run Progress -->
    <AdminMigrationProgress
      v-if="currentRun"
      :run="currentRun"
      @pause="pauseMigration"
      @resume="resumeMigration"
      @cancel="cancelMigration"
      @view-errors="viewErrors(currentRun)"
    />

    <!-- New Migration Form (only show if no active run) -->
    <UiCard v-if="!currentRun" title="Start New Migration">
      <div class="space-y-6">
        <!-- Run Type Toggle -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-3">Migration Type</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors"
              :class="runType === 'FULL' ? 'border-burgundy-500 bg-burgundy-50' : 'border-gray-200 hover:border-gray-300'"
            >
              <input type="radio" v-model="runType" value="FULL" class="text-burgundy-600 focus:ring-burgundy-500" />
              <div>
                <span class="font-medium text-gray-900">Full Import</span>
                <p class="text-sm text-gray-500">Import all records from Lawmatics</p>
              </div>
            </label>
            <label class="flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors"
              :class="runType === 'INCREMENTAL' ? 'border-burgundy-500 bg-burgundy-50' : 'border-gray-200 hover:border-gray-300'"
            >
              <input type="radio" v-model="runType" value="INCREMENTAL" class="text-burgundy-600 focus:ring-burgundy-500" />
              <div>
                <span class="font-medium text-gray-900">Incremental</span>
                <p class="text-sm text-gray-500">Only import records updated since last sync</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Entity Selection -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <label class="block text-sm font-medium text-gray-700">Data to Import</label>
            <div class="flex gap-2">
              <button
                type="button"
                @click="selectAllEntities"
                class="text-xs text-burgundy-600 hover:text-burgundy-700 font-medium"
              >
                Select All
              </button>
              <span class="text-gray-300">|</span>
              <button
                type="button"
                @click="selectNoEntities"
                class="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Clear
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <label
              v-for="entity in entityOptions"
              :key="entity.value"
              class="flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors"
              :class="selectedEntities.includes(entity.value) ? 'border-burgundy-500 bg-burgundy-50' : 'border-gray-200 hover:border-gray-300'"
            >
              <input
                type="checkbox"
                :value="entity.value"
                v-model="selectedEntities"
                class="text-burgundy-600 focus:ring-burgundy-500 rounded"
              />
              <div>
                <span class="text-sm font-medium text-gray-700">{{ entity.label }}</span>
                <p v-if="entity.description" class="text-xs text-gray-500">{{ entity.description }}</p>
              </div>
            </label>
          </div>
          <p class="mt-2 text-xs text-gray-500">
            Note: Contacts become People, Prospects become Matters
          </p>
        </div>

        <!-- Start Button -->
        <div class="flex gap-3">
          <UiButton
            @click="startMigration"
            :is-loading="starting"
            :disabled="selectedEntities.length === 0"
          >
            <Play class="w-4 h-4 mr-2" />
            Start Migration
          </UiButton>
        </div>

        <!-- Error Message -->
        <div v-if="startError" class="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-700">{{ startError }}</p>
        </div>
      </div>
    </UiCard>

    <!-- Previous Runs -->
    <UiCard title="Migration History">
      <AdminMigrationRunsTable
        :runs="previousRuns"
        :loading="loadingRuns"
        @view-errors="viewErrors"
        @resume="resumeRun"
      />

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="flex items-center justify-between mt-4 pt-4 border-t">
        <p class="text-sm text-gray-500">
          Showing page {{ pagination.page }} of {{ pagination.totalPages }}
        </p>
        <div class="flex gap-2">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="loadRuns(pagination.page - 1)"
          >
            Previous
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="loadRuns(pagination.page + 1)"
          >
            Next
          </UiButton>
        </div>
      </div>
    </UiCard>

    <!-- Errors Modal -->
    <AdminMigrationErrorsModal
      v-if="showErrorsModal"
      :run-id="selectedRunId!"
      @close="showErrorsModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Play } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

interface MigrationRun {
  id: string
  integrationId: string
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
  createdAt: string
}

const runType = ref<'FULL' | 'INCREMENTAL'>('FULL')
const selectedEntities = ref<string[]>([])
const starting = ref(false)
const startError = ref<string | null>(null)

const currentRun = ref<MigrationRun | null>(null)
const previousRuns = ref<MigrationRun[]>([])
const loadingRuns = ref(true)
const pagination = ref({ page: 1, totalPages: 1 })

const showErrorsModal = ref(false)
const selectedRunId = ref<string | null>(null)

let pollInterval: ReturnType<typeof setInterval> | null = null

const entityOptions = [
  { value: 'users', label: 'Users', description: 'Staff & attorneys' },
  { value: 'contacts', label: 'Contacts', description: '→ People' },
  { value: 'prospects', label: 'Prospects', description: '→ Matters' },
  { value: 'notes', label: 'Notes', description: 'Entity notes' },
  { value: 'activities', label: 'Activities', description: 'Activity log' }
]

function selectAllEntities() {
  selectedEntities.value = entityOptions.map(e => e.value)
}

function selectNoEntities() {
  selectedEntities.value = []
}

// Load integration ID
const integrationId = ref<string | null>(null)

onMounted(async () => {
  // Get integration ID
  try {
    const { integrations } = await $fetch<{ integrations: { id: string; type: string }[] }>('/api/admin/integrations')
    const lawmatics = integrations.find(i => i.type === 'LAWMATICS')
    if (lawmatics) {
      integrationId.value = lawmatics.id
    }
  } catch {
    // Handle error
  }

  await loadRuns()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

async function loadRuns(page = 1) {
  loadingRuns.value = true
  try {
    const result = await $fetch<{
      runs: MigrationRun[]
      pagination: { page: number; totalPages: number }
    }>('/api/admin/migrations', {
      query: { page, limit: 10 }
    })

    // Separate current active run from history
    const activeStatuses = ['PENDING', 'RUNNING', 'PAUSED']
    const activeRun = result.runs.find(r => activeStatuses.includes(r.status))

    if (activeRun) {
      currentRun.value = activeRun
      previousRuns.value = result.runs.filter(r => r.id !== activeRun.id)
    } else {
      currentRun.value = null
      previousRuns.value = result.runs
    }

    pagination.value = result.pagination
  } catch {
    // Handle error
  } finally {
    loadingRuns.value = false
  }
}

async function startMigration() {
  if (!integrationId.value || selectedEntities.value.length === 0) return

  starting.value = true
  startError.value = null

  try {
    const result = await $fetch<{ runId: string }>('/api/admin/migrations', {
      method: 'POST',
      body: {
        integrationId: integrationId.value,
        runType: runType.value,
        entityTypes: selectedEntities.value
      }
    })

    // Reload to get the new run
    await loadRuns()
  } catch (error: any) {
    startError.value = error.data?.message || 'Failed to start migration'
  } finally {
    starting.value = false
  }
}

async function pauseMigration() {
  if (!currentRun.value) return
  try {
    await $fetch(`/api/admin/migrations/${currentRun.value.id}/pause`, { method: 'POST' })
    await refreshCurrentRun()
  } catch (error: any) {
    alert(error.data?.message || 'Failed to pause migration')
  }
}

async function resumeMigration() {
  if (!currentRun.value) return
  try {
    await $fetch(`/api/admin/migrations/${currentRun.value.id}/resume`, { method: 'POST' })
    await refreshCurrentRun()
  } catch (error: any) {
    alert(error.data?.message || 'Failed to resume migration')
  }
}

async function cancelMigration() {
  if (!currentRun.value) return
  if (!confirm('Are you sure you want to cancel this migration?')) return

  try {
    await $fetch(`/api/admin/migrations/${currentRun.value.id}/cancel`, { method: 'POST' })
    await loadRuns()
  } catch (error: any) {
    alert(error.data?.message || 'Failed to cancel migration')
  }
}

async function resumeRun(run: MigrationRun) {
  try {
    await $fetch(`/api/admin/migrations/${run.id}/resume`, { method: 'POST' })
    await loadRuns()
  } catch (error: any) {
    alert(error.data?.message || 'Failed to resume migration')
  }
}

function viewErrors(run: MigrationRun) {
  selectedRunId.value = run.id
  showErrorsModal.value = true
}

async function refreshCurrentRun() {
  if (!currentRun.value) return

  try {
    const run = await $fetch<{ run: MigrationRun }>(`/api/admin/migrations/${currentRun.value.id}`)
    currentRun.value = run.run

    // If completed, move to history
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.run.status)) {
      await loadRuns()
    }
  } catch {
    // Run may have been deleted
    currentRun.value = null
  }
}

function startPolling() {
  pollInterval = setInterval(async () => {
    if (currentRun.value && ['RUNNING', 'PENDING'].includes(currentRun.value.status)) {
      await refreshCurrentRun()
    }
  }, 3000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}
</script>
