<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <template v-else-if="client">
      <!-- Header -->
      <div class="flex justify-between items-start">
        <div>
          <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <NuxtLink to="/billing" class="hover:text-gray-700">Billing</NuxtLink>
            <span>/</span>
            <NuxtLink to="/billing/trust" class="hover:text-gray-700">Trust</NuxtLink>
            <span>/</span>
            <span>{{ client.firstName || client.first_name }} {{ client.lastName || client.last_name }}</span>
          </div>
          <h1 class="text-3xl font-bold text-gray-900">
            Trust Ledger
          </h1>
          <p class="text-gray-600 mt-1">
            {{ client.firstName || client.first_name }} {{ client.lastName || client.last_name }}
          </p>
        </div>
        <div class="flex gap-2">
          <UiButton variant="secondary" @click="showDepositModal = true">
            Record Deposit
          </UiButton>
          <UiButton variant="secondary" @click="showDisbursementModal = true">
            Record Disbursement
          </UiButton>
          <UiButton variant="secondary" @click="printLedger">
            <Printer class="w-4 h-4 mr-2" />
            Print Statement
          </UiButton>
        </div>
      </div>

      <!-- Balance Card -->
      <UiCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Current Trust Balance</p>
            <p class="text-4xl font-bold" :class="totalBalance >= 0 ? 'text-green-600' : 'text-red-600'">
              {{ formatCurrency(totalBalance) }}
            </p>
            <p class="text-sm text-gray-500 mt-1">
              As of {{ formatDate(new Date()) }}
            </p>
          </div>
          <div class="p-4 bg-green-100 rounded-full">
            <Landmark class="w-8 h-8 text-green-600" />
          </div>
        </div>

        <!-- Balance Breakdown by Matter -->
        <div v-if="balances.length > 1" class="mt-6 pt-4 border-t">
          <h3 class="text-sm font-medium text-gray-700 mb-3">Balance by Matter</h3>
          <div class="space-y-2">
            <div
              v-for="balance in balances"
              :key="balance.matterId || 'general'"
              class="flex justify-between items-center text-sm"
            >
              <span class="text-gray-600">
                {{ balance.matterTitle || balance.matter_title || 'General (no matter)' }}
              </span>
              <span class="font-medium text-gray-900">{{ formatCurrency(balance.balance) }}</span>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Transaction History -->
      <UiCard>
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-medium text-gray-900">Transaction History</h2>
          <div class="flex gap-2">
            <select
              v-model="filterType"
              class="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-burgundy-500"
            >
              <option value="">All Types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="DISBURSEMENT">Disbursements</option>
              <option value="EXPENSE">Expenses</option>
              <option value="REFUND">Refunds</option>
            </select>
          </div>
        </div>

        <div v-if="filteredTransactions.length === 0" class="text-center py-8">
          <ArrowLeftRight class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-medium text-gray-900">No transactions</h3>
          <p class="text-gray-500 mt-1">Record a deposit to see transactions here.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Matter
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Deposit
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Disbursement
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="tx in filteredTransactions"
                :key="tx.id"
                class="hover:bg-gray-50"
              >
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ formatDate(tx.transactionDate || tx.transaction_date) }}
                  </div>
                  <div v-if="tx.referenceNumber || tx.reference_number" class="text-xs text-gray-500">
                    Ref: {{ tx.referenceNumber || tx.reference_number }}
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="typeClass(tx.transactionType || tx.transaction_type)"
                  >
                    {{ formatType(tx.transactionType || tx.transaction_type) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm text-gray-900 max-w-[250px]">
                    {{ tx.description }}
                  </div>
                  <div v-if="tx.checkNumber || tx.check_number" class="text-xs text-gray-500">
                    Check #{{ tx.checkNumber || tx.check_number }}
                  </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {{ tx.matterTitle || tx.matter_title || 'General' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right">
                  <span v-if="tx.amount > 0" class="text-sm font-medium text-green-600">
                    {{ formatCurrency(tx.amount) }}
                  </span>
                  <span v-else class="text-sm text-gray-400">-</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right">
                  <span v-if="tx.amount < 0" class="text-sm font-medium text-red-600">
                    {{ formatCurrency(Math.abs(tx.amount)) }}
                  </span>
                  <span v-else class="text-sm text-gray-400">-</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right">
                  <span class="text-sm font-medium text-gray-900">
                    {{ formatCurrency(tx.runningBalance || tx.running_balance) }}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-100">
              <tr>
                <td colspan="4" class="px-4 py-3 text-sm font-bold text-gray-900">
                  TOTALS
                </td>
                <td class="px-4 py-3 text-right text-sm font-bold text-green-600">
                  {{ formatCurrency(totalDeposits) }}
                </td>
                <td class="px-4 py-3 text-right text-sm font-bold text-red-600">
                  {{ formatCurrency(totalDisbursements) }}
                </td>
                <td class="px-4 py-3 text-right text-sm font-bold text-gray-900">
                  {{ formatCurrency(totalBalance) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </UiCard>

      <!-- Quick Links -->
      <UiCard>
        <h3 class="text-sm font-medium text-gray-700 mb-3">Related</h3>
        <div class="flex gap-4">
          <NuxtLink
            :to="`/clients/${route.params.clientId}`"
            class="text-sm text-burgundy-600 hover:text-burgundy-800"
          >
            View Client Profile
          </NuxtLink>
          <NuxtLink
            to="/billing/trust"
            class="text-sm text-burgundy-600 hover:text-burgundy-800"
          >
            Trust Account Overview
          </NuxtLink>
          <NuxtLink
            :to="`/billing?clientId=${route.params.clientId}`"
            class="text-sm text-burgundy-600 hover:text-burgundy-800"
          >
            View Client Invoices
          </NuxtLink>
        </div>
      </UiCard>
    </template>

    <!-- Not Found -->
    <div v-else class="text-center py-12">
      <Users class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900">Client not found</h3>
      <p class="text-gray-500 mt-1">The client you're looking for doesn't exist.</p>
      <NuxtLink to="/billing/trust" class="text-burgundy-600 hover:text-burgundy-800 mt-4 inline-block">
        Back to Trust Accounts
      </NuxtLink>
    </div>

    <!-- Deposit Modal -->
    <BillingTrustDepositModal
      v-if="showDepositModal"
      @close="showDepositModal = false"
      @deposited="handleDeposit"
    />

    <!-- Disbursement Modal -->
    <BillingTrustDisbursementModal
      v-if="showDisbursementModal"
      @close="showDisbursementModal = false"
      @disbursed="handleDisbursement"
    />
  </div>
</template>

<script setup lang="ts">
import { Landmark, ArrowLeftRight, Users, Printer } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()

const loading = ref(true)
const client = ref<any>(null)
const balances = ref<any[]>([])
const transactions = ref<any[]>([])
const filterType = ref('')

const showDepositModal = ref(false)
const showDisbursementModal = ref(false)

const totalBalance = computed(() => {
  return balances.value.reduce((sum, b) => sum + b.balance, 0)
})

const totalDeposits = computed(() => {
  return transactions.value
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0)
})

const totalDisbursements = computed(() => {
  return Math.abs(transactions.value
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + tx.amount, 0))
})

const filteredTransactions = computed(() => {
  if (!filterType.value) return transactions.value
  return transactions.value.filter(tx =>
    (tx.transactionType || tx.transaction_type) === filterType.value
  )
})

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
    ADJUSTMENT: 'bg-gray-100 text-gray-700'
  }
  return classes[type] || 'bg-gray-100 text-gray-700'
}

async function fetchData() {
  try {
    // Fetch client info
    const clientResponse = await $fetch<{ client: any }>(`/api/clients/${route.params.clientId}`)
    client.value = clientResponse.client

    // Fetch trust balance
    const balanceResponse = await $fetch<{ balances: any[]; totalBalance: number }>(`/api/trust/clients/${route.params.clientId}/balance`)
    balances.value = balanceResponse.balances || []

    // Fetch ledger/transactions
    const ledgerResponse = await $fetch<{ transactions: any[] }>(`/api/trust/clients/${route.params.clientId}/ledger`)
    transactions.value = ledgerResponse.transactions || []
  } catch (error) {
    console.error('Failed to fetch data:', error)
    client.value = null
  } finally {
    loading.value = false
  }
}

function printLedger() {
  window.print()
}

function handleDeposit() {
  showDepositModal.value = false
  fetchData()
}

function handleDisbursement() {
  showDisbursementModal.value = false
  fetchData()
}

onMounted(() => {
  fetchData()
})
</script>
