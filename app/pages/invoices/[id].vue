<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <template v-else-if="invoice">
      <!-- Header -->
      <div class="flex justify-between items-start">
        <div>
          <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <NuxtLink to="/billing" class="hover:text-gray-700">Billing</NuxtLink>
            <span>/</span>
            <span>{{ invoice.invoiceNumber || invoice.invoice_number }}</span>
          </div>
          <div class="flex items-center gap-3">
            <h1 class="text-3xl font-bold text-gray-900">
              Invoice {{ invoice.invoiceNumber || invoice.invoice_number }}
            </h1>
            <span
              class="px-3 py-1 text-sm font-medium rounded-full"
              :class="statusClass(invoice.status)"
            >
              {{ formatStatus(invoice.status) }}
            </span>
          </div>
          <p class="text-gray-600 mt-1">
            {{ invoice.clientName || invoice.client_name }} • {{ invoice.matterTitle || invoice.matter_title }}
          </p>
        </div>
        <div class="flex gap-2">
          <UiButton v-if="invoice.status === 'DRAFT'" variant="secondary" @click="showEditModal = true">
            Edit
          </UiButton>
          <UiButton variant="secondary" @click="downloadPdf">
            <Download class="w-4 h-4 mr-2" />
            Download PDF
          </UiButton>
          <UiButton v-if="invoice.status === 'DRAFT'" @click="sendInvoice">
            <Send class="w-4 h-4 mr-2" />
            Send Invoice
          </UiButton>
          <UiButton
            v-if="canApplyTrust && clientTrustBalance > 0"
            @click="showApplyTrustModal = true"
          >
            <Landmark class="w-4 h-4 mr-2" />
            Apply Trust
          </UiButton>
          <UiButton
            v-if="canRecordPayment"
            @click="showPaymentModal = true"
          >
            <DollarSign class="w-4 h-4 mr-2" />
            Record Payment
          </UiButton>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Invoice Details Card -->
          <UiCard>
            <div class="flex justify-between items-start mb-6">
              <div>
                <h2 class="text-xl font-bold text-gray-900">Invoice Details</h2>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-500">Issue Date</p>
                <p class="font-medium">{{ formatDate(invoice.issueDate || invoice.issue_date) }}</p>
                <p class="text-sm text-gray-500 mt-2">Due Date</p>
                <p class="font-medium" :class="isOverdue ? 'text-red-600' : ''">
                  {{ formatDate(invoice.dueDate || invoice.due_date) }}
                  <span v-if="isOverdue" class="text-sm">({{ daysOverdue }} days overdue)</span>
                </p>
              </div>
            </div>

            <!-- Line Items -->
            <div class="border rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Qty
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Rate
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="item in invoice.lineItems" :key="item.id">
                    <td class="px-4 py-3">
                      <div class="text-sm text-gray-900">{{ item.description }}</div>
                      <div v-if="item.itemType !== 'SERVICE'" class="text-xs text-gray-500">
                        {{ item.itemType || item.item_type }}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right text-sm text-gray-900">
                      {{ item.quantity }}
                    </td>
                    <td class="px-4 py-3 text-right text-sm text-gray-900">
                      {{ formatCurrency(item.unitPrice || item.unit_price) }}
                    </td>
                    <td class="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {{ formatCurrency(item.amount) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Totals -->
            <div class="mt-4 border-t pt-4">
              <div class="flex justify-end">
                <div class="w-64 space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Subtotal</span>
                    <span class="font-medium">{{ formatCurrency(invoice.subtotal) }}</span>
                  </div>
                  <div v-if="invoice.discountAmount || invoice.discount_amount" class="flex justify-between text-sm">
                    <span class="text-gray-600">Discount</span>
                    <span class="font-medium text-green-600">
                      -{{ formatCurrency(invoice.discountAmount || invoice.discount_amount) }}
                    </span>
                  </div>
                  <div v-if="invoice.taxAmount || invoice.tax_amount" class="flex justify-between text-sm">
                    <span class="text-gray-600">Tax</span>
                    <span class="font-medium">{{ formatCurrency(invoice.taxAmount || invoice.tax_amount) }}</span>
                  </div>
                  <div class="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span>{{ formatCurrency(invoice.totalAmount || invoice.total_amount) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="invoice.notes" class="mt-6 pt-4 border-t">
              <h3 class="text-sm font-medium text-gray-700 mb-2">Notes</h3>
              <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ invoice.notes }}</p>
            </div>
          </UiCard>

          <!-- Payment History -->
          <UiCard v-if="payments.length > 0">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
            <div class="space-y-3">
              <div
                v-for="payment in payments"
                :key="payment.id"
                class="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-900">
                      {{ formatCurrency(payment.amount) }}
                    </span>
                    <span
                      class="px-2 py-0.5 text-xs font-medium rounded-full"
                      :class="payment.fundSource === 'TRUST' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'"
                    >
                      {{ payment.fundSource === 'TRUST' ? 'From Trust' : 'Direct' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ payment.paymentMethod || payment.payment_method }} •
                    {{ formatDate(payment.paymentDate || payment.payment_date) }}
                    <span v-if="payment.referenceNumber || payment.reference_number">
                      • Ref: {{ payment.referenceNumber || payment.reference_number }}
                    </span>
                  </p>
                </div>
                <CheckCircle class="w-5 h-5 text-green-500" />
              </div>
            </div>
          </UiCard>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Payment Summary -->
          <UiCard>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Payment Summary</h3>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Total Amount</span>
                <span class="font-medium">{{ formatCurrency(invoice.totalAmount || invoice.total_amount) }}</span>
              </div>
              <div v-if="(invoice.trustApplied || invoice.trust_applied) > 0" class="flex justify-between">
                <span class="text-sm text-gray-600">Trust Applied</span>
                <span class="font-medium text-green-600">
                  -{{ formatCurrency(invoice.trustApplied || invoice.trust_applied) }}
                </span>
              </div>
              <div v-if="(invoice.directPayments || invoice.direct_payments) > 0" class="flex justify-between">
                <span class="text-sm text-gray-600">Direct Payments</span>
                <span class="font-medium text-green-600">
                  -{{ formatCurrency(invoice.directPayments || invoice.direct_payments) }}
                </span>
              </div>
              <div class="flex justify-between pt-3 border-t">
                <span class="font-medium text-gray-900">Balance Due</span>
                <span
                  class="text-xl font-bold"
                  :class="(invoice.balanceDue || invoice.balance_due) > 0 ? 'text-gray-900' : 'text-green-600'"
                >
                  {{ formatCurrency(invoice.balanceDue || invoice.balance_due) }}
                </span>
              </div>
            </div>
          </UiCard>

          <!-- Client Trust Balance -->
          <UiCard v-if="clientTrustBalance > 0">
            <div class="flex items-center gap-2 mb-2">
              <Landmark class="w-5 h-5 text-green-600" />
              <h3 class="text-lg font-medium text-gray-900">Client Trust Balance</h3>
            </div>
            <p class="text-2xl font-bold text-green-600 mb-2">
              {{ formatCurrency(clientTrustBalance) }}
            </p>
            <p class="text-sm text-gray-500">
              Available to apply to this invoice
            </p>
            <UiButton
              v-if="canApplyTrust"
              class="w-full mt-4"
              variant="secondary"
              @click="showApplyTrustModal = true"
            >
              Apply Trust Funds
            </UiButton>
          </UiCard>

          <!-- Quick Links -->
          <UiCard>
            <h3 class="text-sm font-medium text-gray-700 mb-3">Related</h3>
            <div class="space-y-2">
              <NuxtLink
                :to="`/clients/${invoice.clientId || invoice.client_id}`"
                class="block text-sm text-burgundy-600 hover:text-burgundy-800"
              >
                View Client Profile
              </NuxtLink>
              <NuxtLink
                :to="`/matters/${invoice.matterId || invoice.matter_id}`"
                class="block text-sm text-burgundy-600 hover:text-burgundy-800"
              >
                View Matter
              </NuxtLink>
              <NuxtLink
                :to="`/billing/trust/${invoice.clientId || invoice.client_id}`"
                class="block text-sm text-burgundy-600 hover:text-burgundy-800"
              >
                View Trust Ledger
              </NuxtLink>
            </div>
          </UiCard>

          <!-- Actions -->
          <UiCard v-if="invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && invoice.status !== 'VOID'">
            <h3 class="text-sm font-medium text-gray-700 mb-3">Actions</h3>
            <div class="space-y-2">
              <button
                v-if="invoice.status !== 'DRAFT'"
                @click="voidInvoice"
                class="block text-sm text-red-600 hover:text-red-800"
              >
                Void Invoice
              </button>
              <button
                v-if="invoice.status === 'DRAFT'"
                @click="deleteInvoice"
                class="block text-sm text-red-600 hover:text-red-800"
              >
                Delete Invoice
              </button>
            </div>
          </UiCard>
        </div>
      </div>
    </template>

    <!-- Not Found -->
    <div v-else class="text-center py-12">
      <FileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900">Invoice not found</h3>
      <p class="text-gray-500 mt-1">The invoice you're looking for doesn't exist.</p>
      <NuxtLink to="/billing" class="text-burgundy-600 hover:text-burgundy-800 mt-4 inline-block">
        Back to Billing
      </NuxtLink>
    </div>

    <!-- Apply Trust Modal -->
    <BillingApplyTrustModal
      v-if="showApplyTrustModal"
      :invoiceId="route.params.id as string"
      @close="showApplyTrustModal = false"
      @applied="handleTrustApplied"
    />

    <!-- Payment Modal -->
    <BillingPaymentRecordModal
      v-if="showPaymentModal"
      :invoiceId="route.params.id as string"
      @close="showPaymentModal = false"
      @recorded="handlePaymentRecorded"
    />
  </div>
</template>

<script setup lang="ts">
import { FileText, Download, Send, Landmark, DollarSign, CheckCircle } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const toast = useToast()

const loading = ref(true)
const invoice = ref<any>(null)
const payments = ref<any[]>([])
const clientTrustBalance = ref(0)

const showApplyTrustModal = ref(false)
const showPaymentModal = ref(false)
const showEditModal = ref(false)

const isOverdue = computed(() => {
  if (!invoice.value) return false
  const dueDate = invoice.value.dueDate || invoice.value.due_date
  if (!dueDate) return false
  return new Date(dueDate) < new Date() && (invoice.value.balanceDue || invoice.value.balance_due) > 0
})

const daysOverdue = computed(() => {
  if (!invoice.value) return 0
  const dueDate = invoice.value.dueDate || invoice.value.due_date
  if (!dueDate) return 0
  const diff = new Date().getTime() - new Date(dueDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
})

const canApplyTrust = computed(() => {
  if (!invoice.value) return false
  const status = invoice.value.status
  const balanceDue = invoice.value.balanceDue || invoice.value.balance_due
  return ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'].includes(status) && balanceDue > 0
})

const canRecordPayment = computed(() => {
  if (!invoice.value) return false
  const status = invoice.value.status
  const balanceDue = invoice.value.balanceDue || invoice.value.balance_due
  return ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'].includes(status) && balanceDue > 0
})

function formatCurrency(cents: number | undefined): string {
  if (cents === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function formatDate(date: number | string | Date | undefined | null): string {
  if (!date) return '-'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ')
}

function statusClass(status: string): string {
  const classes: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    VIEWED: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    VOID: 'bg-gray-100 text-gray-500'
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

async function fetchInvoice() {
  try {
    const response = await $fetch<{ invoice: any }>(`/api/invoices/${route.params.id}`)
    invoice.value = response.invoice

    // Fetch client trust balance
    const clientId = invoice.value.clientId || invoice.value.client_id
    if (clientId) {
      try {
        const balanceResponse = await $fetch<{ totalBalance: number }>(`/api/trust/clients/${clientId}/balance`)
        clientTrustBalance.value = balanceResponse.totalBalance || 0
      } catch (e) {
        clientTrustBalance.value = 0
      }
    }

    // Fetch payments for this invoice
    try {
      const paymentsResponse = await $fetch<{ payments: any[] }>('/api/payments', {
        query: { invoiceId: route.params.id }
      })
      payments.value = paymentsResponse.payments || []
    } catch (e) {
      payments.value = []
    }
  } catch (error) {
    console.error('Failed to fetch invoice:', error)
    invoice.value = null
  } finally {
    loading.value = false
  }
}

function downloadPdf() {
  window.open(`/api/invoices/${route.params.id}/pdf`, '_blank')
}

async function sendInvoice() {
  try {
    await $fetch(`/api/invoices/${route.params.id}/send`, { method: 'POST' })
    toast.success('Invoice sent successfully')
    fetchInvoice()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to send invoice')
  }
}

async function voidInvoice() {
  if (!confirm('Are you sure you want to void this invoice? This action cannot be undone.')) return

  try {
    await $fetch(`/api/invoices/${route.params.id}`, {
      method: 'DELETE',
      query: { void: 'true' }
    })
    toast.success('Invoice voided')
    fetchInvoice()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to void invoice')
  }
}

async function deleteInvoice() {
  if (!confirm('Are you sure you want to delete this invoice?')) return

  try {
    await $fetch(`/api/invoices/${route.params.id}`, { method: 'DELETE' })
    toast.success('Invoice deleted')
    navigateTo('/billing')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to delete invoice')
  }
}

function handleTrustApplied() {
  showApplyTrustModal.value = false
  fetchInvoice()
}

function handlePaymentRecorded() {
  showPaymentModal.value = false
  fetchInvoice()
}

onMounted(() => {
  fetchInvoice()
})
</script>
