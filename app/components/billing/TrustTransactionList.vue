<template>
  <UiCard>
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <div v-else-if="transactions.length === 0" class="text-center py-12">
      <ArrowLeftRight class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900">No transactions</h3>
      <p class="text-gray-500 mt-1">Record a deposit to see trust transactions here.</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Balance
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="tx in transactions"
            :key="tx.id"
            class="hover:bg-gray-50"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">
                {{ formatDate(tx.transactionDate || tx.transaction_date) }}
              </div>
              <div v-if="tx.referenceNumber || tx.reference_number" class="text-xs text-gray-500">
                Ref: {{ tx.referenceNumber || tx.reference_number }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <NuxtLink
                :to="`/clients/${tx.clientId || tx.client_id}`"
                class="text-sm font-medium text-burgundy-600 hover:text-burgundy-800"
              >
                {{ tx.clientName || tx.client_name }}
              </NuxtLink>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="typeClass(tx.transactionType || tx.transaction_type)"
              >
                {{ formatType(tx.transactionType || tx.transaction_type) }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-900 max-w-[300px] truncate">
                {{ tx.description }}
              </div>
              <div v-if="tx.checkNumber || tx.check_number" class="text-xs text-gray-500">
                Check #{{ tx.checkNumber || tx.check_number }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <span
                class="text-sm font-medium"
                :class="tx.amount > 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ tx.amount > 0 ? '+' : '' }}{{ formatCurrency(tx.amount) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <span class="text-sm font-medium text-gray-900">
                {{ formatCurrency(tx.runningBalance || tx.running_balance) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="hasMore" class="px-6 py-4 border-t border-gray-200">
        <button
          @click="loadMore"
          :disabled="loadingMore"
          class="text-sm text-burgundy-600 hover:text-burgundy-800"
        >
          {{ loadingMore ? 'Loading...' : 'Load more transactions' }}
        </button>
      </div>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { ArrowLeftRight } from 'lucide-vue-next'

const props = defineProps<{
  trustAccountId: string
}>()

const loading = ref(true)
const loadingMore = ref(false)
const transactions = ref<any[]>([])
const hasMore = ref(false)
const offset = ref(0)
const limit = 50

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function formatDate(date: number | string | Date | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'number' ? new Date(date) : new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatType(type: string): string {
  return type.replace(/_/g, ' ')
}

function typeClass(type: string): string {
  const classes: Record<string, string> = {
    DEPOSIT: 'bg-green-100 text-green-700',
    DISBURSEMENT: 'bg-blue-100 text-blue-700',
    EXPENSE: 'bg-orange-100 text-orange-700',
    REFUND: 'bg-purple-100 text-purple-700',
    TRANSFER_IN: 'bg-green-100 text-green-700',
    TRANSFER_OUT: 'bg-red-100 text-red-700',
    ADJUSTMENT: 'bg-gray-100 text-gray-700',
    BANK_FEE: 'bg-red-100 text-red-700',
    INTEREST: 'bg-green-100 text-green-700'
  }
  return classes[type] || 'bg-gray-100 text-gray-700'
}

async function fetchTransactions(append = false) {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
  }

  try {
    const response = await $fetch<{ transactions: any[]; total: number }>('/api/trust/transactions', {
      query: {
        limit,
        offset: offset.value
      }
    })

    if (append) {
      transactions.value = [...transactions.value, ...response.transactions]
    } else {
      transactions.value = response.transactions
    }

    hasMore.value = transactions.value.length < response.total
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  offset.value += limit
  fetchTransactions(true)
}

onMounted(() => {
  fetchTransactions()
})
</script>
