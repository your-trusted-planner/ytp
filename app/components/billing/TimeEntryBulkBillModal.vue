<template>
  <UiModal :modelValue="true" title="Bill Time Entries" size="md" @update:modelValue="$emit('close')">
    <div class="space-y-6">
      <!-- Selected Entries Summary -->
      <div class="bg-gray-50 rounded-lg p-4">
        <h4 class="text-sm font-medium text-gray-700 mb-3">Selected Time Entries</h4>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ entries.length }}</div>
            <div class="text-xs text-gray-500">Entries</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ totalHours }}</div>
            <div class="text-xs text-gray-500">Hours</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-burgundy-600">{{ formatCurrency(totalAmount) }}</div>
            <div class="text-xs text-gray-500">Amount</div>
          </div>
        </div>
      </div>

      <!-- Invoice Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Add to Invoice
        </label>
        <div class="space-y-2">
          <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" :class="{ 'border-burgundy-500 bg-burgundy-50': !selectedInvoiceId }">
            <input
              type="radio"
              :value="''"
              v-model="selectedInvoiceId"
              class="text-burgundy-600 focus:ring-burgundy-500"
            />
            <span class="ml-3">
              <span class="block text-sm font-medium text-gray-900">Create New Invoice</span>
              <span class="block text-xs text-gray-500">A new draft invoice will be created with these time entries</span>
            </span>
          </label>

          <template v-if="loadingInvoices">
            <div class="flex items-center justify-center py-4">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-burgundy-600"></div>
            </div>
          </template>

          <template v-else-if="draftInvoices.length > 0">
            <label
              v-for="invoice in draftInvoices"
              :key="invoice.id"
              class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              :class="{ 'border-burgundy-500 bg-burgundy-50': selectedInvoiceId === invoice.id }"
            >
              <input
                type="radio"
                :value="invoice.id"
                v-model="selectedInvoiceId"
                class="text-burgundy-600 focus:ring-burgundy-500"
              />
              <span class="ml-3 flex-1">
                <span class="block text-sm font-medium text-gray-900">
                  {{ invoice.invoiceNumber }}
                </span>
                <span class="block text-xs text-gray-500">
                  {{ invoice.matterTitle }} - {{ formatCurrency(invoice.totalAmount) }}
                </span>
              </span>
              <UiBadge size="sm" variant="default">DRAFT</UiBadge>
            </label>
          </template>
        </div>
      </div>

      <!-- Matter Selection (only if creating new invoice) -->
      <div v-if="!selectedInvoiceId && uniqueMatters.length > 1">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Matter for New Invoice <span class="text-red-500">*</span>
        </label>
        <select
          v-model="selectedMatterId"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
          required
        >
          <option value="">Select a matter...</option>
          <option v-for="matter in uniqueMatters" :key="matter.id" :value="matter.id">
            {{ matter.title }}
          </option>
        </select>
        <p class="text-xs text-amber-600 mt-1">
          Selected entries span multiple matters. Choose which matter to bill.
        </p>
      </div>

      <!-- Entries Preview -->
      <div>
        <h4 class="text-sm font-medium text-gray-700 mb-2">Entries to Bill</h4>
        <div class="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
          <div v-for="entry in entries" :key="entry.id" class="p-3 text-sm">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="font-medium text-gray-900 truncate">{{ entry.description }}</div>
                <div class="text-xs text-gray-500 mt-0.5">
                  {{ formatDate(entry.workDate) }} - {{ entry.matterTitle }}
                </div>
              </div>
              <div class="text-right ml-3">
                <div class="font-medium text-gray-900">{{ entry.hours }} hrs</div>
                <div class="text-xs text-gray-500">{{ formatCurrency(entry.amount) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton type="button" variant="outline" @click="$emit('close')">
          Cancel
        </UiButton>
        <UiButton
          type="submit"
          :is-loading="submitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          <FileText class="w-4 h-4 mr-1" />
          {{ selectedInvoiceId ? 'Add to Invoice' : 'Create Invoice' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { FileText } from 'lucide-vue-next'

interface TimeEntry {
  id: string
  matterId: string
  matterTitle: string
  hours: string
  description: string
  workDate: Date | string | number
  amount: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  matterId: string
  matterTitle: string
  totalAmount: number
  status: string
}

const props = defineProps<{
  entryIds: string[]
  entries: TimeEntry[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'billed'): void
}>()

const toast = useToast()

// State
const loadingInvoices = ref(true)
const submitting = ref(false)
const draftInvoices = ref<Invoice[]>([])
const selectedInvoiceId = ref('')
const selectedMatterId = ref('')

// Computed
const totalHours = computed(() => {
  return props.entries.reduce((sum, e) => sum + parseFloat(e.hours), 0).toFixed(2)
})

const totalAmount = computed(() => {
  return props.entries.reduce((sum, e) => sum + e.amount, 0)
})

const uniqueMatters = computed(() => {
  const matterMap = new Map<string, { id: string; title: string }>()
  for (const entry of props.entries) {
    if (!matterMap.has(entry.matterId)) {
      matterMap.set(entry.matterId, { id: entry.matterId, title: entry.matterTitle })
    }
  }
  return Array.from(matterMap.values())
})

const canSubmit = computed(() => {
  if (selectedInvoiceId.value) {
    return true
  }
  // Creating new invoice
  if (uniqueMatters.value.length === 1) {
    return true
  }
  // Multiple matters - must select one
  return !!selectedMatterId.value
})

// Fetch draft invoices that could receive these entries
async function fetchDraftInvoices() {
  loadingInvoices.value = true
  try {
    // Get draft invoices for the matters in the selected entries
    const matterIds = uniqueMatters.value.map(m => m.id)
    const response = await $fetch<{ invoices: Invoice[] }>('/api/invoices', {
      query: { status: 'DRAFT' }
    })
    // Filter to only invoices for the relevant matters
    draftInvoices.value = (response.invoices || []).filter(inv =>
      matterIds.includes(inv.matterId)
    )
  } catch (error) {
    console.error('Failed to fetch invoices:', error)
    draftInvoices.value = []
  } finally {
    loadingInvoices.value = false
  }
}

// Submit
async function handleSubmit() {
  if (!canSubmit.value) return

  submitting.value = true
  try {
    // Determine matter ID for new invoice
    let matterId = selectedMatterId.value
    if (!selectedInvoiceId.value && uniqueMatters.value.length === 1 && uniqueMatters.value[0]) {
      matterId = uniqueMatters.value[0].id
    }

    const response = await $fetch('/api/time-entries/bulk-bill', {
      method: 'POST',
      body: {
        timeEntryIds: props.entryIds,
        invoiceId: selectedInvoiceId.value || undefined,
        matterId: !selectedInvoiceId.value ? matterId : undefined
      }
    })

    toast.success(selectedInvoiceId.value
      ? 'Time entries added to invoice'
      : 'Invoice created with time entries'
    )
    emit('billed')
  } catch (error: any) {
    console.error('Failed to bill entries:', error)
    toast.error(error.data?.message || 'Failed to bill time entries')
  } finally {
    submitting.value = false
  }
}

// Helpers
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function formatDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

// Initial fetch
onMounted(() => {
  fetchDraftInvoices()

  // Auto-select matter if only one
  if (uniqueMatters.value.length === 1 && uniqueMatters.value[0]) {
    selectedMatterId.value = uniqueMatters.value[0].id
  }
})
</script>
