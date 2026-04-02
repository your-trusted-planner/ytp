<template>
  <UiModal
    :model-value="true"
    :title="editingEntry ? 'Edit Time Entry' : 'Create Time Entry'"
    size="md"
    @update:model-value="$emit('close')"
  >
    <form
      class="space-y-6"
      @submit.prevent="handleSubmit"
    >
      <!-- Matter Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Matter <span class="text-red-500">*</span>
        </label>
        <!-- Selected matter chip -->
        <div
          v-if="selectedMatter"
          class="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
        >
          <div class="flex-1 min-w-0">
            <span class="text-sm text-gray-900">{{ selectedMatter.title }}</span>
            <span
              v-if="selectedMatter.sublabel"
              class="text-xs text-gray-500 ml-2"
            >{{ selectedMatter.sublabel }}</span>
          </div>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 flex-shrink-0"
            @click="clearMatter"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
        <!-- Search input -->
        <div
          v-else
          class="relative"
        >
          <input
            ref="matterSearchRef"
            v-model="matterSearch"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
            placeholder="Search for a matter..."
            @input="onMatterSearchInput"
            @focus="showMatterDropdown = true"
            @blur="hideMatterDropdown"
          >
          <div
            v-if="matterSearchLoading"
            class="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-burgundy-600" />
          </div>
          <div
            v-if="showMatterDropdown && (matterOptions.length > 0 || (matterSearch.length >= 2 && !matterSearchLoading))"
            class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            <button
              v-for="option in matterOptions"
              :key="option.id"
              type="button"
              class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              @mousedown.prevent="selectMatter(option)"
            >
              <div class="font-medium text-gray-900">{{ option.title }}</div>
              <div
                v-if="option.sublabel"
                class="text-xs text-gray-500"
              >{{ option.sublabel }}</div>
            </button>
            <div
              v-if="matterOptions.length === 0 && matterSearch.length >= 2 && !matterSearchLoading"
              class="px-3 py-4 text-sm text-gray-500 text-center"
            >
              No matters found for "{{ matterSearch }}"
            </div>
          </div>
        </div>
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
        >
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
        >
        <p class="text-xs text-gray-500 mt-1">
          Enter time in increments of 0.25 hours (15 minutes)
        </p>
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
        />
      </div>

      <!-- Billable Toggle -->
      <div class="flex items-center justify-between">
        <div>
          <label class="text-sm font-medium text-gray-700">Billable</label>
          <p class="text-xs text-gray-500">
            Mark as non-billable for internal work
          </p>
        </div>
        <UiToggle v-model="form.isBillable" />
      </div>

      <!-- Rate Preview Section -->
      <div
        v-if="form.matterId && ratePreview"
        class="bg-gray-50 rounded-lg p-4 space-y-2"
      >
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Hourly Rate:</span>
          <span class="font-medium">{{ ratePreview.rateFormatted }}</span>
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-gray-500">Rate Source:</span>
          <span class="text-gray-500">{{ ratePreview.sourceLabel }}</span>
        </div>
        <div
          v-if="form.isBillable && form.hours"
          class="flex justify-between text-sm font-medium pt-2 border-t border-gray-200"
        >
          <span class="text-gray-700">Estimated Amount:</span>
          <span class="text-burgundy-600">{{ formatCurrency(estimatedAmount) }}</span>
        </div>
        <div
          v-if="!form.isBillable"
          class="text-xs text-gray-500 pt-2 border-t border-gray-200"
        >
          Non-billable time will not generate charges
        </div>
      </div>

      <!-- Loading rate -->
      <div
        v-else-if="form.matterId && loadingRate"
        class="bg-gray-50 rounded-lg p-4"
      >
        <div class="flex items-center justify-center gap-2 text-gray-500">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-burgundy-600" />
          <span class="text-sm">Loading rate information...</span>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton
          type="button"
          variant="outline"
          @click="$emit('close')"
        >
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
import { X } from 'lucide-vue-next'

interface MatterOption {
  id: string
  title: string
  sublabel: string
  raw: any
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
const loadingRate = ref(false)
const submitting = ref(false)
const ratePreview = ref<RatePreview | null>(null)

// Matter search state
const matterSearchRef = ref<HTMLInputElement>()
const matterSearch = ref('')
const matterOptions = ref<MatterOption[]>([])
const showMatterDropdown = ref(false)
const matterSearchLoading = ref(false)
const selectedMatter = ref<MatterOption | null>(null)
let matterSearchTimeout: ReturnType<typeof setTimeout> | null = null

function buildMatterSublabel(matter: any): string {
  const clientName = matter.clientName || matter.client_name || ''
  const matterNumber = matter.matterNumber || matter.matter_number || ''
  const parts = []
  if (clientName) parts.push(clientName)
  if (matterNumber) parts.push(`#${matterNumber}`)
  return parts.join(' \u2022 ')
}

function onMatterSearchInput() {
  if (matterSearchTimeout) clearTimeout(matterSearchTimeout)
  if (matterSearch.value.length < 2) {
    matterOptions.value = []
    return
  }
  matterSearchLoading.value = true
  matterSearchTimeout = setTimeout(async () => {
    try {
      const response = await $fetch<{ matters: any[] }>(`/api/matters?search=${encodeURIComponent(matterSearch.value)}&page=1&limit=10`)
      const matters = response.matters || []
      matterOptions.value = matters.map((m: any) => ({
        id: m.id,
        title: m.title || 'Untitled Matter',
        sublabel: buildMatterSublabel(m),
        raw: m
      }))
    } catch {
      matterOptions.value = []
    } finally {
      matterSearchLoading.value = false
    }
  }, 300)
}

function selectMatter(option: MatterOption) {
  selectedMatter.value = option
  form.matterId = option.id
  matterSearch.value = ''
  matterOptions.value = []
  showMatterDropdown.value = false
  resolveRate()
}

function clearMatter() {
  selectedMatter.value = null
  form.matterId = ''
  ratePreview.value = null
  matterSearch.value = ''
  nextTick(() => matterSearchRef.value?.focus())
}

function hideMatterDropdown() {
  setTimeout(() => { showMatterDropdown.value = false }, 200)
}

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
}
else if (props.defaultMatterId) {
  form.matterId = props.defaultMatterId
}

// Resolve a matter ID to a display option (for editing/default)
async function resolveMatterId(matterId: string) {
  try {
    const response = await $fetch<any>(`/api/matters/${matterId}`)
    const m = response.matter || response
    if (m) {
      selectedMatter.value = {
        id: m.id,
        title: m.title || 'Untitled Matter',
        sublabel: buildMatterSublabel(m),
        raw: m
      }
    }
  } catch {
    // Matter not found — leave selectedMatter null
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
  }
  catch (error) {
    console.error('Failed to resolve rate:', error)
    ratePreview.value = null
  }
  finally {
    loadingRate.value = false
  }
}

// Watch for matter changes (covers programmatic updates)
watch(() => form.matterId, (newMatterId) => {
  if (newMatterId) {
    resolveRate()
  }
  else {
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
    }
    else {
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
  }
  catch (error: any) {
    console.error('Failed to save time entry:', error)
    toast.error(error.data?.message || 'Failed to save time entry')
  }
  finally {
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

// Initial data fetch — resolve matter name if editing or default
onMounted(() => {
  const matterId = props.editingEntry?.matterId || props.defaultMatterId
  if (matterId) {
    resolveMatterId(matterId)
    resolveRate()
  }
})
</script>
