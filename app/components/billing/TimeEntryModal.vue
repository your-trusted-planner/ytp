<template>
  <UiModal :modelValue="true" :title="editingEntry ? 'Edit Time Entry' : 'Create Time Entry'" size="md" @update:modelValue="$emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Matter Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Matter <span class="text-red-500">*</span>
        </label>
        <UiAutocomplete
          v-model="form.matterId"
          :options="matters"
          :label-key="getMatterLabel"
          value-key="id"
          :sublabel-key="getMatterSublabel"
          placeholder="Search for a matter..."
          :loading="loadingMatters"
          @select="handleMatterSelect"
        />
        <p v-if="matters.length === 0 && !loadingMatters" class="text-xs text-amber-600 mt-1">
          No matters found. Create a matter first before logging time.
        </p>
      </div>

      <!-- Work Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Work Date <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.workDate"
          type="date"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
        />
      </div>

      <!-- Hours -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Hours <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.hours"
          type="number"
          min="0.25"
          step="0.25"
          required
          placeholder="0.00"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
        />
        <p class="text-xs text-gray-500 mt-1">Enter time in increments of 0.25 hours (15 minutes)</p>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Description <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="form.description"
          rows="3"
          required
          placeholder="Describe the work performed..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 resize-none"
        ></textarea>
      </div>

      <!-- Billable Toggle -->
      <div class="flex items-center justify-between">
        <div>
          <label class="text-sm font-medium text-gray-700">Billable</label>
          <p class="text-xs text-gray-500">Mark as non-billable for internal work</p>
        </div>
        <UiToggle v-model="form.isBillable" />
      </div>

      <!-- Rate Preview Section -->
      <div v-if="form.matterId && ratePreview" class="bg-gray-50 rounded-lg p-4 space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Hourly Rate:</span>
          <span class="font-medium">{{ ratePreview.rateFormatted }}</span>
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-gray-500">Rate Source:</span>
          <span class="text-gray-500">{{ ratePreview.sourceLabel }}</span>
        </div>
        <div v-if="form.isBillable && form.hours" class="flex justify-between text-sm font-medium pt-2 border-t border-gray-200">
          <span class="text-gray-700">Estimated Amount:</span>
          <span class="text-burgundy-600">{{ formatCurrency(estimatedAmount) }}</span>
        </div>
        <div v-if="!form.isBillable" class="text-xs text-gray-500 pt-2 border-t border-gray-200">
          Non-billable time will not generate charges
        </div>
      </div>

      <!-- Loading rate -->
      <div v-else-if="form.matterId && loadingRate" class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center justify-center gap-2 text-gray-500">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-burgundy-600"></div>
          <span class="text-sm">Loading rate information...</span>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton type="button" variant="outline" @click="$emit('close')">
          Cancel
        </UiButton>
        <UiButton
          type="submit"
          :is-loading="submitting"
          :disabled="!isFormValid"
          @click="handleSubmit"
        >
          {{ editingEntry ? 'Update Entry' : 'Create Entry' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
interface Matter {
  id: string
  title: string
  matterNumber: string
  matter_number?: string
  clientName?: string
  client_name?: string
}

interface TimeEntry {
  id: string
  matterId: string
  hours: string
  description: string
  workDate: Date | string | number
  isBillable: boolean
  // Additional fields from the full TimeEntry (optional for editing)
  userId?: string
  userName?: string
  matterTitle?: string
  hourlyRate?: number
  amount?: number
  status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'BILLED' | 'WRITTEN_OFF'
  invoiceId?: string
  invoiceLineItemId?: string
}

interface RatePreview {
  rate: number
  source: string
  sourceLabel: string
  rateFormatted: string
}

const props = defineProps<{
  editingEntry?: TimeEntry | null
  defaultMatterId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', entry: any): void
  (e: 'updated', entry: any): void
}>()

const toast = useToast()
const { data: sessionData } = await useFetch('/api/auth/session')
const currentUser = computed(() => sessionData.value?.user)

// Form state
const form = reactive({
  matterId: props.defaultMatterId || '',
  workDate: formatDateForInput(new Date()),
  hours: '',
  description: '',
  isBillable: true
})

// UI state
const loadingMatters = ref(true)
const loadingRate = ref(false)
const submitting = ref(false)
const matters = ref<Matter[]>([])
const ratePreview = ref<RatePreview | null>(null)

// Computed
const isFormValid = computed(() => {
  return form.matterId && form.workDate && form.hours && parseFloat(form.hours) > 0 && form.description.trim()
})

const estimatedAmount = computed(() => {
  if (!ratePreview.value || !form.hours) return 0
  const hours = parseFloat(form.hours) || 0
  return Math.round(hours * ratePreview.value.rate)
})

// Initialize from editing entry or default matter
if (props.editingEntry) {
  form.matterId = props.editingEntry.matterId
  form.workDate = formatDateForInput(props.editingEntry.workDate)
  form.hours = props.editingEntry.hours
  form.description = props.editingEntry.description
  form.isBillable = props.editingEntry.isBillable
} else if (props.defaultMatterId) {
  form.matterId = props.defaultMatterId
}

// Fetch matters
async function fetchMatters() {
  loadingMatters.value = true
  try {
    const response = await $fetch<{ matters: Matter[] }>('/api/matters')
    matters.value = response.matters || []
  } catch (error) {
    console.error('Failed to fetch matters:', error)
    matters.value = []
  } finally {
    loadingMatters.value = false
  }
}

// Resolve rate for the selected matter
async function resolveRate() {
  if (!form.matterId || !currentUser.value?.id) {
    ratePreview.value = null
    return
  }

  loadingRate.value = true
  try {
    const response = await $fetch<RatePreview>('/api/billing-rates/resolve', {
      method: 'POST',
      body: {
        matterId: form.matterId,
        userId: currentUser.value.id
      }
    })
    ratePreview.value = response
  } catch (error) {
    console.error('Failed to resolve rate:', error)
    ratePreview.value = null
  } finally {
    loadingRate.value = false
  }
}

// Matter selection handlers
function getMatterLabel(matter: Matter): string {
  return matter.title
}

function getMatterSublabel(matter: Matter): string {
  const num = matter.matterNumber || matter.matter_number
  const client = matter.clientName || matter.client_name
  return client ? `#${num} - ${client}` : `#${num}`
}

function handleMatterSelect(matter: Matter) {
  form.matterId = matter.id
  resolveRate()
}

// Watch for matter changes
watch(() => form.matterId, (newMatterId) => {
  if (newMatterId) {
    resolveRate()
  } else {
    ratePreview.value = null
  }
})

// Form submission
async function handleSubmit() {
  if (!isFormValid.value) return

  submitting.value = true
  try {
    if (props.editingEntry) {
      // Update existing entry
      const response = await $fetch<{ timeEntry: any }>(`/api/time-entries/${props.editingEntry.id}`, {
        method: 'PUT',
        body: {
          matterId: form.matterId,
          hours: form.hours,
          description: form.description.trim(),
          workDate: form.workDate,
          isBillable: form.isBillable
        }
      })
      toast.success('Time entry updated')
      emit('updated', response.timeEntry)
    } else {
      // Create new entry
      const response = await $fetch<{ timeEntry: any }>('/api/time-entries', {
        method: 'POST',
        body: {
          matterId: form.matterId,
          hours: form.hours,
          description: form.description.trim(),
          workDate: form.workDate,
          isBillable: form.isBillable
        }
      })
      toast.success('Time entry created')
      emit('created', response.timeEntry)
    }
    emit('close')
  } catch (error: any) {
    console.error('Failed to save time entry:', error)
    toast.error(error.data?.message || 'Failed to save time entry')
  } finally {
    submitting.value = false
  }
}

// Helper functions
function formatDateForInput(date: Date | string | number | null | undefined): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0] || ''
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

// Initial data fetch
onMounted(() => {
  fetchMatters()
  // Resolve rate if we have a matter (from editing or default)
  if (props.editingEntry?.matterId || props.defaultMatterId) {
    resolveRate()
  }
})
</script>
