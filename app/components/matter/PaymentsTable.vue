<template>
  <div class="space-y-4">
    <!-- Summary Card -->
    <div v-if="payments.length > 0" class="bg-gray-50 rounded-lg p-4">
      <div class="grid grid-cols-3 gap-4">
        <div>
          <div class="text-sm text-gray-600">Total Paid</div>
          <div class="text-2xl font-bold text-green-600">{{ formatCurrency(totalPaid) }}</div>
        </div>
        <div>
          <div class="text-sm text-gray-600">Pending</div>
          <div class="text-2xl font-bold text-yellow-600">{{ formatCurrency(totalPending) }}</div>
        </div>
        <div>
          <div class="text-sm text-gray-600">Total</div>
          <div class="text-2xl font-bold text-gray-900">{{ formatCurrency(totalAmount) }}</div>
        </div>
      </div>
    </div>

    <!-- Payment History -->
    <div v-if="payments.length === 0" class="text-center py-8 text-gray-500">
      No payments recorded yet
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Method
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="payment in payments" :key="payment.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">{{ formatPaymentType(payment.payment_type) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ formatCurrency(payment.amount) }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500">{{ payment.payment_method || '-' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <UiBadge :variant="getStatusVariant(payment.status)">
                {{ payment.status }}
              </UiBadge>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-500">
                {{ payment.paid_at ? formatDate(payment.paid_at) : '-' }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '~/utils/format'

interface Payment {
  id: string
  payment_type: string
  amount: number
  payment_method?: string
  status: string
  paid_at?: number
}

interface Props {
  payments: Payment[]
}

const props = defineProps<Props>()

const totalPaid = computed(() => {
  return props.payments
    .filter(p => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.amount, 0)
})

const totalPending = computed(() => {
  return props.payments
    .filter(p => p.status === 'PENDING' || p.status === 'PROCESSING')
    .reduce((sum, p) => sum + p.amount, 0)
})

const totalAmount = computed(() => {
  return props.payments.reduce((sum, p) => sum + p.amount, 0)
})

function formatDate(timestamp: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatPaymentType(type: string): string {
  const typeMap: Record<string, string> = {
    CONSULTATION: 'Consultation',
    DEPOSIT_50: 'Deposit (50%)',
    FINAL_50: 'Final Payment (50%)',
    MAINTENANCE: 'Maintenance',
    CUSTOM: 'Custom Payment'
  }
  return typeMap[type] || type
}

function getStatusVariant(status: string): 'success' | 'primary' | 'default' | 'danger' {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'PROCESSING':
    case 'PENDING':
      return 'primary'
    case 'FAILED':
    case 'REFUNDED':
      return 'danger'
    default:
      return 'default'
  }
}
</script>
