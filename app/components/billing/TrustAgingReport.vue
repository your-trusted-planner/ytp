<template>
  <UiCard>
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <div v-else-if="!report || report.clients.length === 0" class="text-center py-12">
      <Clock class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900">No aging data</h3>
      <p class="text-gray-500 mt-1">Client trust balances will appear here after deposits are recorded.</p>
    </div>

    <div v-else>
      <!-- Summary Header -->
      <div class="mb-6 p-4 bg-gray-50 rounded-lg">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-medium text-gray-900">Trust Balance Aging Report</h3>
          <span class="text-sm text-gray-500">As of {{ formatDate(report.asOfDate) }}</span>
        </div>
        <p class="text-sm text-gray-600">
          Shows how long client funds have been held in trust
        </p>
      </div>

      <!-- Aging Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                30-60 Days
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                60-90 Days
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-amber-50">
                90+ Days
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="client in report.clients"
              :key="client.clientId"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <NuxtLink
                  :to="`/billing/trust/${client.clientId}`"
                  class="text-sm font-medium text-burgundy-600 hover:text-burgundy-800"
                >
                  {{ client.clientName }}
                </NuxtLink>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <span class="text-sm text-gray-900">
                  {{ client.current > 0 ? formatCurrency(client.current) : '-' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <span class="text-sm text-gray-900">
                  {{ client.days30to60 > 0 ? formatCurrency(client.days30to60) : '-' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <span class="text-sm text-gray-900">
                  {{ client.days60to90 > 0 ? formatCurrency(client.days60to90) : '-' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right bg-amber-50">
                <span
                  class="text-sm font-medium"
                  :class="client.days90plus > 0 ? 'text-amber-600' : 'text-gray-900'"
                >
                  {{ client.days90plus > 0 ? formatCurrency(client.days90plus) : '-' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <span class="text-sm font-bold text-gray-900">
                  {{ formatCurrency(client.total) }}
                </span>
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-100">
            <tr>
              <td class="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                TOTALS
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                {{ formatCurrency(report.totals.current) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                {{ formatCurrency(report.totals.days30to60) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                {{ formatCurrency(report.totals.days60to90) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-bold bg-amber-50" :class="report.totals.days90plus > 0 ? 'text-amber-600' : 'text-gray-900'">
                {{ formatCurrency(report.totals.days90plus) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                {{ formatCurrency(report.totals.total) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Aging Note -->
      <div v-if="report.totals.days90plus > 0" class="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div class="flex items-start gap-2">
          <AlertTriangle class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-amber-800 font-medium">Funds held over 90 days</p>
            <p class="text-amber-700 text-sm mt-1">
              {{ formatCurrency(report.totals.days90plus) }} in trust funds have been held for more than 90 days.
              Consider reviewing these balances and contacting clients about refunds or applying to outstanding invoices.
            </p>
          </div>
        </div>
      </div>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { Clock, AlertTriangle } from 'lucide-vue-next'

const props = defineProps<{
  trustAccountId: string
}>()

interface AgingClient {
  clientId: string
  clientName: string
  current: number
  days30to60: number
  days60to90: number
  days90plus: number
  total: number
}

interface AgingReport {
  asOfDate: string
  clients: AgingClient[]
  totals: {
    current: number
    days30to60: number
    days60to90: number
    days90plus: number
    total: number
  }
}

const loading = ref(true)
const report = ref<AgingReport | null>(null)

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

async function fetchReport() {
  try {
    const response = await $fetch<{ report: AgingReport }>('/api/trust/aging')
    report.value = response.report
  } catch (error) {
    console.error('Failed to fetch aging report:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReport()
})
</script>
