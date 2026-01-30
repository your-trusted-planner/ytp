<template>
  <UiModal :modelValue="true" title="Record Trust Disbursement" size="lg" @update:modelValue="$emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Client Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Client <span class="text-red-500">*</span>
        </label>
        <select
          v-model="form.clientId"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          @change="handleClientChange"
        >
          <option value="">Select a client...</option>
          <option v-for="client in clients" :key="client.id" :value="client.id">
            {{ client.firstName || client.first_name }} {{ client.lastName || client.last_name }}
          </option>
        </select>
      </div>

      <!-- Client Balance Display -->
      <div v-if="form.clientId && clientBalance !== null" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex justify-between items-center">
          <span class="text-sm text-blue-700">Available Trust Balance</span>
          <span class="text-lg font-bold text-blue-800">{{ formatCurrency(clientBalance) }}</span>
        </div>
      </div>

      <!-- Matter Selection (Optional) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Matter (Optional)
        </label>
        <select
          v-model="form.matterId"
          :disabled="!form.clientId || clientMatters.length === 0"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500 disabled:bg-gray-100"
        >
          <option value="">General (not matter-specific)</option>
          <option v-for="matter in clientMatters" :key="matter.id" :value="matter.id">
            {{ matter.title }}
          </option>
        </select>
      </div>

      <!-- Disbursement Type -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Disbursement Type <span class="text-red-500">*</span>
        </label>
        <select
          v-model="form.disbursementType"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        >
          <option value="DISBURSEMENT">Transfer to Operating (Earned Fees)</option>
          <option value="EXPENSE">Client Expense Payment</option>
          <option value="REFUND">Refund to Client</option>
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
            :max="clientBalance ? clientBalance / 100 : undefined"
            required
            placeholder="0.00"
            class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>
        <p v-if="amountExceedsBalance" class="text-xs text-red-600 mt-1">
          Amount exceeds available balance
        </p>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Description <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.description"
          type="text"
          required
          placeholder="Disbursement for legal services rendered"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        />
      </div>

      <!-- Invoice Selection (for earned fees) -->
      <div v-if="form.disbursementType === 'DISBURSEMENT' && clientInvoices.length > 0">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Related Invoice (Optional)
        </label>
        <select
          v-model="form.invoiceId"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        >
          <option value="">Not linked to invoice</option>
          <option v-for="invoice in clientInvoices" :key="invoice.id" :value="invoice.id">
            {{ invoice.invoiceNumber || invoice.invoice_number }} - {{ formatCurrency(invoice.balanceDue || invoice.balance_due) }} due
          </option>
        </select>
      </div>

      <!-- Reference & Check Number -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Reference Number
          </label>
          <input
            v-model="form.referenceNumber"
            type="text"
            placeholder="Transfer ref #"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>
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
      </div>

      <!-- Transaction Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Transaction Date <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.transactionDate"
          type="date"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        />
      </div>

      <!-- Balance Preview -->
      <div v-if="form.clientId && clientBalance !== null && form.amountDollars" class="bg-gray-50 rounded-lg p-4">
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-600">Current Balance</span>
          <span class="text-lg font-medium text-gray-900">{{ formatCurrency(clientBalance) }}</span>
        </div>
        <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
          <span class="text-sm text-gray-600">After Disbursement</span>
          <span class="text-lg font-bold" :class="newBalance >= 0 ? 'text-gray-900' : 'text-red-600'">
            {{ formatCurrency(newBalance) }}
          </span>
        </div>
      </div>

      <!-- Warning for refunds -->
      <div v-if="form.disbursementType === 'REFUND'" class="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div class="flex items-start gap-2">
          <AlertTriangle class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-amber-800 font-medium text-sm">Refund Notice</p>
            <p class="text-amber-700 text-sm mt-1">
              Ensure the client has been notified and proper documentation is in place
              before issuing a refund from trust.
            </p>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t">
        <UiButton type="button" variant="secondary" @click="$emit('close')">
          Cancel
        </UiButton>
        <UiButton type="submit" :disabled="!isValid || submitting">
          {{ submitting ? 'Processing...' : 'Record Disbursement' }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'disbursed'): void
}>()

const toast = useToast()

const form = ref({
  clientId: '',
  matterId: '',
  disbursementType: 'DISBURSEMENT',
  amountDollars: null as number | null,
  description: '',
  invoiceId: '',
  referenceNumber: '',
  checkNumber: '',
  transactionDate: new Date().toISOString().split('T')[0]
})

const clients = ref<any[]>([])
const clientMatters = ref<any[]>([])
const clientInvoices = ref<any[]>([])
const clientBalance = ref<number | null>(null)
const submitting = ref(false)

const amountExceedsBalance = computed(() => {
  if (!form.value.amountDollars || clientBalance.value === null) return false
  return (form.value.amountDollars * 100) > clientBalance.value
})

const newBalance = computed(() => {
  if (clientBalance.value === null || !form.value.amountDollars) return 0
  return clientBalance.value - (form.value.amountDollars * 100)
})

const isValid = computed(() => {
  return form.value.clientId &&
    form.value.amountDollars &&
    form.value.amountDollars > 0 &&
    !amountExceedsBalance.value &&
    form.value.description.trim() &&
    form.value.transactionDate
})

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

async function fetchClients() {
  try {
    const response = await $fetch<{ clients: any[] }>('/api/clients')
    clients.value = response.clients
  } catch (error) {
    console.error('Failed to fetch clients:', error)
  }
}

async function handleClientChange() {
  form.value.matterId = ''
  form.value.invoiceId = ''
  clientMatters.value = []
  clientInvoices.value = []
  clientBalance.value = null

  if (!form.value.clientId) return

  // Fetch client's matters
  try {
    const response = await $fetch<{ matters: any[] }>(`/api/clients/${form.value.clientId}/matters`)
    clientMatters.value = response.matters || []
  } catch (error) {
    console.error('Failed to fetch client matters:', error)
  }

  // Fetch client's trust balance
  try {
    const response = await $fetch<{ totalBalance: number }>(`/api/trust/clients/${form.value.clientId}/balance`)
    clientBalance.value = response.totalBalance || 0
  } catch (error) {
    clientBalance.value = 0
  }

  // Fetch client's outstanding invoices
  try {
    const response = await $fetch<{ invoices: any[] }>('/api/invoices', {
      query: { clientId: form.value.clientId, status: 'SENT,PARTIALLY_PAID,OVERDUE' }
    })
    clientInvoices.value = response.invoices || []
  } catch (error) {
    console.error('Failed to fetch client invoices:', error)
  }
}

async function handleSubmit() {
  if (!isValid.value || submitting.value) return

  submitting.value = true

  try {
    const endpoint = form.value.disbursementType === 'REFUND'
      ? '/api/trust/refunds'
      : '/api/trust/disbursements'

    await $fetch(endpoint, {
      method: 'POST',
      body: {
        clientId: form.value.clientId,
        matterId: form.value.matterId || undefined,
        amount: Math.round((form.value.amountDollars || 0) * 100),
        description: form.value.description,
        invoiceId: form.value.invoiceId || undefined,
        referenceNumber: form.value.referenceNumber || undefined,
        checkNumber: form.value.checkNumber || undefined,
        transactionDate: new Date(form.value.transactionDate).toISOString()
      }
    })

    toast.success('Disbursement recorded successfully')
    emit('disbursed')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to record disbursement')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchClients()
})
</script>
