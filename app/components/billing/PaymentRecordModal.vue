<template>
  <UiModal title="Record Payment" size="lg" @close="$emit('close')">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Invoice Selection (if not provided) -->
      <div v-if="!invoiceId">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Invoice <span class="text-red-500">*</span>
        </label>
        <select
          v-model="form.invoiceId"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          @change="handleInvoiceChange"
        >
          <option value="">Select an invoice...</option>
          <option v-for="inv in invoices" :key="inv.id" :value="inv.id">
            {{ inv.invoiceNumber || inv.invoice_number }} - {{ inv.clientName || inv.client_name }} - {{ formatCurrency(inv.balanceDue || inv.balance_due) }} due
          </option>
        </select>
      </div>

      <!-- Invoice Info (when invoice selected or provided) -->
      <div v-if="selectedInvoice" class="bg-gray-50 rounded-lg p-4">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="text-sm font-medium text-gray-900">
              {{ selectedInvoice.invoiceNumber || selectedInvoice.invoice_number }}
            </p>
            <p class="text-sm text-gray-500">
              {{ selectedInvoice.clientName || selectedInvoice.client_name }}
            </p>
          </div>
          <span
            class="px-2 py-1 text-xs font-medium rounded-full"
            :class="statusClass(selectedInvoice.status)"
          >
            {{ selectedInvoice.status }}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          <div>
            <span class="text-xs text-gray-500">Total Amount</span>
            <p class="text-sm font-medium text-gray-900">
              {{ formatCurrency(selectedInvoice.totalAmount || selectedInvoice.total_amount) }}
            </p>
          </div>
          <div>
            <span class="text-xs text-gray-500">Balance Due</span>
            <p class="text-lg font-bold text-gray-900">
              {{ formatCurrency(selectedInvoice.balanceDue || selectedInvoice.balance_due) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Payment Method -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Payment Method <span class="text-red-500">*</span>
        </label>
        <select
          v-model="form.paymentMethod"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        >
          <option value="CHECK">Check</option>
          <option value="CASH">Cash</option>
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="ACH">ACH / Bank Transfer</option>
          <option value="WIRE">Wire Transfer</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <!-- Amount -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Amount <span class="text-red-500">*</span>
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            v-model.number="form.amountDollars"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>
        <button
          v-if="selectedInvoice"
          type="button"
          @click="form.amountDollars = (selectedInvoice.balanceDue || selectedInvoice.balance_due) / 100"
          class="text-xs text-burgundy-600 hover:text-burgundy-800 mt-1"
        >
          Pay Balance in Full ({{ formatCurrency(selectedInvoice.balanceDue || selectedInvoice.balance_due) }})
        </button>
      </div>

      <!-- Reference Numbers -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Check Number
          </label>
          <input
            v-model="form.checkNumber"
            type="text"
            placeholder="1234"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Reference Number
          </label>
          <input
            v-model="form.referenceNumber"
            type="text"
            placeholder="Transaction ID"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>
      </div>

      <!-- Payment Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Payment Date <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.paymentDate"
          type="date"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        />
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Notes (Optional)
        </label>
        <textarea
          v-model="form.notes"
          rows="2"
          placeholder="Any additional notes about this payment..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        ></textarea>
      </div>

      <!-- Result Preview -->
      <div v-if="selectedInvoice && form.amountDollars" class="bg-gray-50 rounded-lg p-4">
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-600">New Balance After Payment</span>
          <span
            class="text-lg font-bold"
            :class="newBalance <= 0 ? 'text-green-600' : 'text-gray-900'"
          >
            {{ formatCurrency(Math.max(0, newBalance)) }}
            {{ newBalance <= 0 ? '(Paid in full)' : '' }}
          </span>
        </div>
        <p v-if="form.amountDollars * 100 > (selectedInvoice.balanceDue || selectedInvoice.balance_due)" class="text-xs text-amber-600 mt-2">
          Note: Payment exceeds balance due. Overpayment of {{ formatCurrency((form.amountDollars * 100) - (selectedInvoice.balanceDue || selectedInvoice.balance_due)) }} will be recorded.
        </p>
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t">
        <UiButton type="button" variant="secondary" @click="$emit('close')">
          Cancel
        </UiButton>
        <UiButton type="submit" :disabled="!isValid || submitting">
          {{ submitting ? 'Recording...' : 'Record Payment' }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  invoiceId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'recorded'): void
}>()

const toast = useToast()

const loading = ref(true)
const invoices = ref<any[]>([])
const selectedInvoice = ref<any>(null)
const submitting = ref(false)

const form = ref({
  invoiceId: props.invoiceId || '',
  paymentMethod: 'CHECK',
  amountDollars: null as number | null,
  checkNumber: '',
  referenceNumber: '',
  paymentDate: new Date().toISOString().split('T')[0],
  notes: ''
})

const newBalance = computed(() => {
  if (!selectedInvoice.value || !form.value.amountDollars) return selectedInvoice.value?.balanceDue || selectedInvoice.value?.balance_due || 0
  const balanceDue = selectedInvoice.value.balanceDue || selectedInvoice.value.balance_due || 0
  return balanceDue - (form.value.amountDollars * 100)
})

const isValid = computed(() => {
  return (form.value.invoiceId || props.invoiceId) &&
    form.value.paymentMethod &&
    form.value.amountDollars &&
    form.value.amountDollars > 0 &&
    form.value.paymentDate
})

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function statusClass(status: string): string {
  const classes: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    VIEWED: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
    OVERDUE: 'bg-red-100 text-red-700'
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

async function fetchInvoices() {
  try {
    // Only fetch invoice list if no invoiceId provided
    if (!props.invoiceId) {
      const response = await $fetch<{ invoices: any[] }>('/api/billing/outstanding')
      invoices.value = response.invoices || []
    }

    // Fetch specific invoice if provided
    if (props.invoiceId) {
      const response = await $fetch<{ invoice: any }>(`/api/invoices/${props.invoiceId}`)
      selectedInvoice.value = response.invoice
      form.value.invoiceId = props.invoiceId

      // Default to full balance
      if (selectedInvoice.value) {
        form.value.amountDollars = (selectedInvoice.value.balanceDue || selectedInvoice.value.balance_due) / 100
      }
    }
  } catch (error) {
    console.error('Failed to fetch invoices:', error)
  } finally {
    loading.value = false
  }
}

async function handleInvoiceChange() {
  if (!form.value.invoiceId) {
    selectedInvoice.value = null
    return
  }

  try {
    const response = await $fetch<{ invoice: any }>(`/api/invoices/${form.value.invoiceId}`)
    selectedInvoice.value = response.invoice
    // Default to full balance
    form.value.amountDollars = (selectedInvoice.value.balanceDue || selectedInvoice.value.balance_due) / 100
  } catch (error) {
    console.error('Failed to fetch invoice:', error)
    selectedInvoice.value = null
  }
}

async function handleSubmit() {
  if (!isValid.value || submitting.value) return

  submitting.value = true

  try {
    await $fetch('/api/payments', {
      method: 'POST',
      body: {
        invoiceId: form.value.invoiceId || props.invoiceId,
        amount: Math.round((form.value.amountDollars || 0) * 100),
        paymentMethod: form.value.paymentMethod,
        fundSource: 'DIRECT',
        checkNumber: form.value.checkNumber || undefined,
        referenceNumber: form.value.referenceNumber || undefined,
        paymentDate: new Date(form.value.paymentDate).toISOString(),
        notes: form.value.notes || undefined
      }
    })

    toast.success('Payment recorded successfully')
    emit('recorded')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to record payment')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchInvoices()
})
</script>
