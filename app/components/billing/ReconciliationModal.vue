<template>
  <UiModal :modelValue="true" title="Trust Account Reconciliation" size="lg" @update:modelValue="$emit('close')">
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <div v-else-if="!report" class="text-center py-12">
      <AlertCircle class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900">Unable to load reconciliation</h3>
      <p class="text-gray-500 mt-1">Please try again later.</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Reconciliation Header -->
      <div class="text-center pb-4 border-b">
        <h3 class="text-lg font-bold text-gray-900">THREE-WAY RECONCILIATION</h3>
        <p class="text-sm text-gray-500">As of {{ formatDate(report.asOfDate) }}</p>
      </div>

      <!-- Bank Balance Entry -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Bank Balance (per statement)
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            v-model.number="bankBalanceDollars"
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter bank statement balance"
            class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Enter the balance from your most recent bank statement
        </p>
      </div>

      <!-- Three-Way Comparison -->
      <div class="bg-gray-50 rounded-lg p-6">
        <div class="space-y-4">
          <!-- Bank Balance -->
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-gray-700">Bank Balance (entered)</span>
            <span class="text-lg font-bold" :class="bankBalanceDollars ? 'text-gray-900' : 'text-gray-400'">
              {{ bankBalanceDollars ? formatCurrency(bankBalanceDollars * 100) : 'Not entered' }}
            </span>
          </div>

          <!-- Trust Ledger Balance -->
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-gray-700">Trust Ledger Balance</span>
            <span class="text-lg font-bold text-gray-900">
              {{ formatCurrency(report.trustLedgerBalance) }}
            </span>
          </div>

          <!-- Sum of Client Balances -->
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-gray-700">Sum of Client Balances</span>
            <span class="text-lg font-bold text-gray-900">
              {{ formatCurrency(report.clientBalancesTotal) }}
            </span>
          </div>

          <!-- Divider -->
          <div class="border-t border-gray-300 pt-4">
            <!-- Ledger vs Clients Difference -->
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-gray-600">Ledger vs Clients Difference</span>
              <span
                class="font-medium"
                :class="report.ledgerVsClientsVariance === 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ formatCurrency(report.ledgerVsClientsVariance) }}
              </span>
            </div>

            <!-- Bank vs Ledger Difference -->
            <div v-if="bankBalanceDollars" class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Bank vs Ledger Difference</span>
              <span
                class="font-medium"
                :class="bankVsLedgerDifference === 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ formatCurrency(bankVsLedgerDifference) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Status Indicator -->
      <div
        class="rounded-lg p-4"
        :class="isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'"
      >
        <div class="flex items-center gap-3">
          <CheckCircle v-if="isBalanced" class="w-6 h-6 text-green-600" />
          <XCircle v-else class="w-6 h-6 text-red-600" />
          <div>
            <p class="font-medium" :class="isBalanced ? 'text-green-800' : 'text-red-800'">
              {{ isBalanced ? 'BALANCED' : 'OUT OF BALANCE' }}
            </p>
            <p class="text-sm" :class="isBalanced ? 'text-green-700' : 'text-red-700'">
              {{ isBalanced
                ? 'Trust ledger and client balances match.'
                : 'There is a discrepancy that needs to be investigated.' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Client Breakdown -->
      <div>
        <h4 class="text-sm font-medium text-gray-700 mb-3">Client Balance Breakdown</h4>
        <div class="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Client
                </th>
                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="client in report.clientBalances" :key="client.clientId">
                <td class="px-4 py-2 text-sm text-gray-900">
                  {{ client.clientName }}
                </td>
                <td class="px-4 py-2 text-sm text-gray-900 text-right">
                  {{ formatCurrency(client.balance) }}
                </td>
              </tr>
              <tr v-if="report.clientBalances.length === 0">
                <td colspan="2" class="px-4 py-4 text-sm text-gray-500 text-center">
                  No client balances
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-between items-center pt-4 border-t">
        <button
          @click="printReport"
          class="text-sm text-burgundy-600 hover:text-burgundy-800"
        >
          Print Report
        </button>
        <UiButton @click="$emit('close')">
          Close
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { AlertCircle, CheckCircle, XCircle } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'close'): void
}>()

interface ReconciliationReport {
  asOfDate: string
  trustLedgerBalance: number
  clientBalancesTotal: number
  ledgerVsClientsVariance: number
  clientBalances: Array<{
    clientId: string
    clientName: string
    balance: number
  }>
}

const loading = ref(true)
const report = ref<ReconciliationReport | null>(null)
const bankBalanceDollars = ref<number | null>(null)

const bankVsLedgerDifference = computed(() => {
  if (!bankBalanceDollars.value || !report.value) return 0
  return (bankBalanceDollars.value * 100) - report.value.trustLedgerBalance
})

const isBalanced = computed(() => {
  if (!report.value) return false
  // Check ledger vs clients (always)
  if (report.value.ledgerVsClientsVariance !== 0) return false
  // If bank balance entered, check that too
  if (bankBalanceDollars.value) {
    return bankVsLedgerDifference.value === 0
  }
  return true
})

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

function printReport() {
  window.print()
}

async function fetchReport() {
  try {
    const response = await $fetch<{ report: ReconciliationReport }>('/api/trust/reconciliation')
    report.value = response.report
  } catch (error) {
    console.error('Failed to fetch reconciliation:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReport()
})
</script>
