<template>
  <UiCard>
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="invoices.length === 0" class="text-center py-12">
      <FileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900">No invoices found</h3>
      <p class="text-gray-500 mt-1">Create your first invoice to get started.</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Invoice
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Matter
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="invoice in invoices"
            :key="invoice.id"
            class="hover:bg-gray-50 cursor-pointer"
            @click="navigateTo(`/invoices/${invoice.id}`)"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">
                {{ invoice.invoiceNumber || invoice.invoice_number }}
              </div>
              <div class="text-sm text-gray-500">
                {{ formatDate(invoice.issueDate || invoice.issue_date) }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">
                {{ invoice.clientName || invoice.client_name }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900 max-w-[200px] truncate">
                {{ invoice.matterTitle || invoice.matter_title }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="statusClass(invoice.status)"
              >
                {{ formatStatus(invoice.status) }}
              </span>
              <div v-if="invoice.isOverdue || invoice.is_overdue" class="text-xs text-red-600 mt-1">
                {{ invoice.daysPastDue || invoice.days_past_due }} days overdue
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <div class="text-sm font-medium text-gray-900">
                {{ formatCurrency(invoice.totalAmount || invoice.total_amount) }}
              </div>
              <div v-if="(invoice.balanceDue || invoice.balance_due) < (invoice.totalAmount || invoice.total_amount)" class="text-sm text-gray-500">
                Due: {{ formatCurrency(invoice.balanceDue || invoice.balance_due) }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
              {{ formatDate(invoice.dueDate || invoice.due_date) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right" @click.stop>
              <div class="flex justify-end gap-2">
                <button
                  @click="downloadPdf(invoice)"
                  class="text-gray-400 hover:text-gray-600"
                  title="Download PDF"
                >
                  <Download class="w-4 h-4" />
                </button>
                <button
                  v-if="invoice.status === 'DRAFT'"
                  @click="sendInvoice(invoice)"
                  class="text-blue-400 hover:text-blue-600"
                  title="Send Invoice"
                >
                  <Send class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { FileText, Download, Send } from 'lucide-vue-next'

interface Invoice {
  id: string
  invoiceNumber?: string
  invoice_number?: string
  clientName?: string
  client_name?: string
  matterTitle?: string
  matter_title?: string
  status: string
  totalAmount?: number
  total_amount?: number
  balanceDue?: number
  balance_due?: number
  issueDate?: number | Date
  issue_date?: number | Date
  dueDate?: number | Date
  due_date?: number | Date
  isOverdue?: boolean
  is_overdue?: boolean
  daysPastDue?: number
  days_past_due?: number
}

const props = defineProps<{
  invoices: Invoice[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const toast = useToast()

function formatCurrency(cents: number | undefined): string {
  if (cents === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function formatDate(date: number | Date | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'number' ? new Date(date) : date
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

async function downloadPdf(invoice: Invoice) {
  try {
    window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')
  } catch (error) {
    toast.error('Failed to download PDF')
  }
}

async function sendInvoice(invoice: Invoice) {
  try {
    await $fetch(`/api/invoices/${invoice.id}/send`, { method: 'POST' })
    toast.success('Invoice sent successfully')
    emit('refresh')
  } catch (error) {
    toast.error('Failed to send invoice')
  }
}
</script>
