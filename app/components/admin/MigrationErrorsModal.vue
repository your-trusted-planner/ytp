<template>
  <UiModal
    v-model="isOpen"
    size="xl"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <AlertTriangle class="w-5 h-5 text-red-500" />
        <h2 class="text-lg font-semibold text-gray-900">
          Migration Errors
        </h2>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Diagnostics Summary -->
      <div
        v-if="summary"
        class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3"
      >
        <!-- Entity Breakdown -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-medium text-gray-500 uppercase mr-1">By entity:</span>
          <button
            v-for="entry in summary.byEntity"
            :key="entry.entityType"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
            :class="filters.entityType === entry.entityType
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-800 hover:bg-red-200'"
            @click="toggleEntityFilter(entry.entityType)"
          >
            {{ entry.entityType }}
            <span class="font-bold">{{ entry.count }}</span>
          </button>
        </div>

        <!-- Top Error Patterns -->
        <div v-if="summary.topPatterns.length > 0">
          <p class="text-xs font-medium text-gray-500 uppercase mb-1.5">
            Top patterns:
          </p>
          <div class="space-y-1.5">
            <div
              v-for="(pattern, idx) in summary.topPatterns"
              :key="idx"
              class="flex items-start gap-2 text-xs"
            >
              <span class="font-bold text-red-700 whitespace-nowrap min-w-[2rem] text-right">{{ pattern.count }}x</span>
              <span class="text-gray-500">{{ pattern.entityType }}</span>
              <span class="text-gray-700">{{ pattern.pattern }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex gap-4 flex-wrap">
        <select
          v-model="filters.entityType"
          class="text-sm border-gray-300 rounded-lg focus:border-accent-500 focus:ring-accent-500"
        >
          <option value="">
            All Entity Types
          </option>
          <option value="users">
            Users
          </option>
          <option value="contacts">
            Contacts
          </option>
          <option value="prospects">
            Prospects
          </option>
          <option value="notes">
            Notes
          </option>
          <option value="activities">
            Activities
          </option>
        </select>

        <select
          v-model="filters.errorType"
          class="text-sm border-gray-300 rounded-lg focus:border-accent-500 focus:ring-accent-500"
        >
          <option value="">
            All Error Types
          </option>
          <option value="VALIDATION">
            Validation
          </option>
          <option value="TRANSFORM">
            Transform
          </option>
          <option value="UPSERT">
            Upsert
          </option>
          <option value="API">
            API
          </option>
          <option value="UNKNOWN">
            Unknown
          </option>
        </select>

        <button
          v-if="filters.entityType || filters.errorType"
          class="text-xs text-gray-500 hover:text-gray-700 underline"
          @click="clearFilters"
        >
          Clear filters
        </button>
      </div>

      <!-- Loading -->
      <div
        v-if="loading"
        class="text-center py-12"
      >
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600 mx-auto" />
        <p class="mt-3 text-gray-500">
          Loading errors...
        </p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="errors.length === 0"
        class="text-center py-12"
      >
        <CheckCircle class="w-12 h-12 text-green-300 mx-auto mb-3" />
        <p class="text-gray-500">
          No errors found
        </p>
      </div>

      <!-- Errors List -->
      <div
        v-else
        class="space-y-3 max-h-96 overflow-y-auto"
      >
        <div
          v-for="error in errors"
          :key="error.id"
          class="p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <UiBadge
                variant="danger"
                size="sm"
              >
                {{ error.entityType }}
              </UiBadge>
              <UiBadge
                variant="default"
                size="sm"
              >
                {{ error.errorType }}
              </UiBadge>
            </div>
            <span class="text-xs text-gray-500">{{ formatDate(error.createdAt) }}</span>
          </div>

          <p class="text-sm text-red-800 font-medium mb-1">
            {{ error.errorMessage }}
          </p>

          <p
            v-if="error.externalId"
            class="text-xs text-gray-600"
          >
            External ID: {{ error.externalId }}
          </p>

          <!-- Error Details (expandable) -->
          <details
            v-if="error.errorDetails"
            class="mt-2"
          >
            <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Show details
            </summary>
            <pre class="mt-2 text-xs bg-gray-800 text-gray-200 p-3 rounded overflow-x-auto">{{ JSON.stringify(error.errorDetails, null, 2) }}</pre>
          </details>

          <div
            v-if="error.retryCount > 0"
            class="mt-2 text-xs text-gray-500"
          >
            Retry attempts: {{ error.retryCount }}
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="pagination.totalPages > 1"
        class="flex items-center justify-between pt-4 border-t"
      >
        <p class="text-sm text-gray-500">
          Page {{ pagination.page }} of {{ pagination.totalPages }}
          ({{ pagination.totalCount }} errors{{ hasActiveFilters ? ' matching filters' : '' }})
        </p>
        <div class="flex gap-2">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page <= 1"
            @click="loadErrors(pagination.page - 1)"
          >
            Previous
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="loadErrors(pagination.page + 1)"
          >
            Next
          </UiButton>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <UiButton
          variant="outline"
          @click="isOpen = false"
        >
          Close
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { AlertTriangle, CheckCircle } from 'lucide-vue-next'

interface MigrationError {
  id: string
  entityType: string
  externalId: string | null
  errorType: string
  errorMessage: string
  errorDetails: any
  retryCount: number
  resolved: boolean
  createdAt: string
}

interface ErrorSummary {
  byEntity: { entityType: string, count: number }[]
  byErrorType: { errorType: string, count: number }[]
  topPatterns: { pattern: string, entityType: string, count: number, sampleMessages: string[] }[]
}

const props = defineProps<{
  runId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const isOpen = ref(true)

// Watch for modal close
watch(isOpen, (newVal) => {
  if (!newVal) {
    emit('close')
  }
})

const loading = ref(true)
const errors = ref<MigrationError[]>([])
const summary = ref<ErrorSummary | null>(null)
const pagination = ref({
  page: 1,
  totalPages: 1,
  totalCount: 0
})

const filters = reactive({
  entityType: '',
  errorType: ''
})

const hasActiveFilters = computed(() => !!filters.entityType || !!filters.errorType)

function toggleEntityFilter(entityType: string) {
  filters.entityType = filters.entityType === entityType ? '' : entityType
}

function clearFilters() {
  filters.entityType = ''
  filters.errorType = ''
}

// Watch filters
watch(filters, () => {
  loadErrors(1)
}, { deep: true })

onMounted(() => {
  loadSummary()
  loadErrors()
})

async function loadSummary() {
  try {
    summary.value = await $fetch<ErrorSummary>(
      `/api/admin/migrations/${props.runId}/error-summary`
    )
  }
  catch {
    summary.value = null
  }
}

async function loadErrors(page = 1) {
  loading.value = true
  try {
    const query: Record<string, any> = { page, limit: 20 }
    if (filters.entityType) query.entityType = filters.entityType
    if (filters.errorType) query.errorType = filters.errorType

    const result = await $fetch<{
      errors: MigrationError[]
      pagination: { page: number, totalPages: number, totalCount: number }
    }>(`/api/admin/migrations/${props.runId}/errors`, { query })

    errors.value = result.errors
    pagination.value = result.pagination
  }
  catch {
    errors.value = []
  }
  finally {
    loading.value = false
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  })
}
</script>
