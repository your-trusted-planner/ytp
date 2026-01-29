<template>
  <UiModal title="Apply Trust Funds to Invoice" @close="$emit('close')">
    <div v-if="loading" class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <div v-else-if="!invoice" class="text-center py-8">
      <AlertCircle class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900">Invoice not found</h3>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Invoice Info -->
      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="text-sm font-medium text-gray-900">{{ invoice.invoiceNumber || invoice.invoice_number }}</p>
            <p class="text-sm text-gray-500">{{ invoice.clientName || invoice.client_name }}</p>
          </div>
          <span
            class="px-2 py-1 text-xs font-medium rounded-full"
            :class="statusClass(invoice.status)"
          >
            {{ invoice.status }}
          </span>
        </div>
        <div class="flex justify-between items-center pt-2 border-t border-gray-200">
          <span class="text-sm text-gray-600">Balance Due</span>
          <span class="text-lg font-bold text-gray-900">
            {{ formatCurrency(invoice.balanceDue || invoice.balance_due) }}
          </span>
        </div>
      </div>

      <!-- Trust Balance -->
      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-2">
          <Landmark class="w-5 h-5 text-green-600" />
          <span class="text-sm font-medium text-green-800">Client Trust Balance</span>
        </div>
        <p class="text-2xl font-bold text-green-800">{{ formatCurrency(trustBalance) }}</p>
      </div>

      <!-- Amount to Apply -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Amount to Apply <span class="text-red-500">*</span>
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            v-model.number="amountDollars"
            type="number"
            min="0.01"
            step="0.01"
            :max="maxAmountDollars"
            required
            placeholder="0.00"
            class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>
        <div class="flex gap-2 mt-2">
          <button
            type="button"
            @click="amountDollars = maxAmountDollars"
            class="text-xs text-burgundy-600 hover:text-burgundy-800"
          >
            Apply Maximum ({{ formatCurrency(maxAmount) }})
          </button>
          <span class="text-xs text-gray-400">|</span>
          <button
            type="button"
            @click="amountDollars = (invoice.balanceDue || invoice.balance_due) / 100"
            :disabled="trustBalance < (invoice.balanceDue || invoice.balance_due)"
            class="text-xs text-burgundy-600 hover:text-burgundy-800 disabled:text-gray-400"
          >
            Pay in Full
          </button>
        </div>
      </div>

      <!-- Validation Messages -->
      <div v-if="amountExceedsBalance" class="bg-red-50 border border-red-200 rounded-lg p-3">
        <p class="text-sm text-red-700">Amount exceeds available trust balance</p>
      </div>

      <div v-if="amountExceedsInvoice" class="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p class="text-sm text-amber-700">Amount exceeds invoice balance due</p>
      </div>

      <!-- Result Preview -->
      <div v-if="amountDollars && !amountExceedsBalance && !amountExceedsInvoice" class="bg-gray-50 rounded-lg p-4">
        <h4 class="text-sm font-medium text-gray-700 mb-3">After Applying</h4>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Invoice Balance</span>
            <span class="font-medium" :class="newInvoiceBalance === 0 ? 'text-green-600' : 'text-gray-900'">
              {{ formatCurrency(newInvoiceBalance) }}
              {{ newInvoiceBalance === 0 ? '(Paid in full)' : '' }}
            </span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Trust Balance</span>
            <span class="font-medium text-gray-900">{{ formatCurrency(newTrustBalance) }}</span>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t">
        <UiButton type="button" variant="secondary" @click="$emit('close')">
          Cancel
        </UiButton>
        <UiButton type="submit" :disabled="!isValid || submitting">
          {{ submitting ? 'Applying...' : 'Apply Trust Funds' }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { AlertCircle, Landmark } from 'lucide-vue-next'

const props = defineProps<{
  invoiceId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'applied'): void
}>()

const toast = useToast()

const loading = ref(true)
const invoice = ref<any>(null)
const trustBalance = ref(0)
const amountDollars = ref<number | null>(null)
const submitting = ref(false)

const maxAmount = computed(() => {
  if (!invoice.value) return 0
  const balanceDue = invoice.value.balanceDue || invoice.value.balance_due || 0
  return Math.min(trustBalance.value, balanceDue)
})

const maxAmountDollars = computed(() => maxAmount.value / 100)

const amountExceedsBalance = computed(() => {
  if (!amountDollars.value) return false
  return (amountDollars.value * 100) > trustBalance.value
})

const amountExceedsInvoice = computed(() => {
  if (!amountDollars.value || !invoice.value) return false
  const balanceDue = invoice.value.balanceDue || invoice.value.balance_due || 0
  return (amountDollars.value * 100) > balanceDue
})

const newInvoiceBalance = computed(() => {
  if (!invoice.value || !amountDollars.value) return invoice.value?.balanceDue || invoice.value?.balance_due || 0
  const balanceDue = invoice.value.balanceDue || invoice.value.balance_due || 0
  return Math.max(0, balanceDue - (amountDollars.value * 100))
})

const newTrustBalance = computed(() => {
  if (!amountDollars.value) return trustBalance.value
  return Math.max(0, trustBalance.value - (amountDollars.value * 100))
})

const isValid = computed(() => {
  return amountDollars.value &&
    amountDollars.value > 0 &&
    !amountExceedsBalance.value &&
    !amountExceedsInvoice.value
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

async function fetchData() {
  try {
    // Fetch invoice
    const invoiceResponse = await $fetch<{ invoice: any }>(`/api/invoices/${props.invoiceId}`)
    invoice.value = invoiceResponse.invoice

    // Fetch client trust balance
    const clientId = invoice.value.clientId || invoice.value.client_id
    if (clientId) {
      const balanceResponse = await $fetch<{ totalBalance: number }>(`/api/trust/clients/${clientId}/balance`)
      trustBalance.value = balanceResponse.totalBalance || 0
    }

    // Default to max amount
    amountDollars.value = maxAmountDollars.value
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!isValid.value || submitting.value) return

  submitting.value = true

  try {
    await $fetch(`/api/invoices/${props.invoiceId}/apply-trust`, {
      method: 'POST',
      body: {
        amount: Math.round((amountDollars.value || 0) * 100)
      }
    })

    toast.success('Trust funds applied successfully')
    emit('applied')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to apply trust funds')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
