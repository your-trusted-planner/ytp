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
          <span class="text-sm text-gray-500">As of {{ formatDate(report.asOf || report.asOfDate) }}</span>
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
              :key="client.clientId || client.client_id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <NuxtLink
                  :to="`/billing/trust/${client.clientId || client.client_id}`"
                  class="text-sm font-medium text-burgundy-600 hover:text-burgundy-800"
                >
                  {{ client.clientName || client.client_name }}
                </NuxtLink>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <span class="text-sm text-gray-900">
                  {{ getAgingValue(client, 'current') > 0 ? formatCurrency(getAgingValue(client, 'current')) : '-' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <span class="text-sm text-gray-900">
                  {{ getAgingValue(client, 'days30to60') > 0 ? formatCurrency(getAgingValue(client, 'days30to60')) : '-' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <span class="text-sm text-gray-900">
                  {{ getAgingValue(client, 'days60to90') > 0 ? formatCurrency(getAgingValue(client, 'days60to90')) : '-' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right bg-amber-50">
                <span
                  class="text-sm font-medium"
                  :class="getAgingValue(client, 'over90') > 0 ? 'text-amber-600' : 'text-gray-900'"
                >
                  {{ getAgingValue(client, 'over90') > 0 ? formatCurrency(getAgingValue(client, 'over90')) : '-' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <span class="text-sm font-bold text-gray-900">
                  {{ formatCurrency(getClientTotal(client)) }}
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
                {{ formatCurrency(getTotalsValue('current')) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                {{ formatCurrency(getTotalsValue('days30to60')) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                {{ formatCurrency(getTotalsValue('days60to90')) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-bold bg-amber-50" :class="getTotalsValue('over90') > 0 ? 'text-amber-600' : 'text-gray-900'">
                {{ formatCurrency(getTotalsValue('over90')) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                {{ formatCurrency(getTotalsValue('total')) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Aging Note -->
      <div v-if="getTotalsValue('over90') > 0" class="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div class="flex items-start gap-2">
          <AlertTriangle class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-amber-800 font-medium">Funds held over 90 days</p>
            <p class="text-amber-700 text-sm mt-1">
              {{ formatCurrency(getTotalsValue('over90')) }} in trust funds have been held for more than 90 days.
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
  clientId?: string
  client_id?: string
  clientName?: string
  client_name?: string
  aging?: {
    current: number
    days30to60: number
    days60to90: number
    over90: number
  }
  // Legacy flat fields
  current?: number
  days30to60?: number
  days60to90?: number
  days90plus?: number
  over90?: number
  total?: number
}

interface AgingReport {
  asOf?: string
  asOfDate?: string
  as_of?: string
  clients: AgingClient[]
  totals: {
    current: number
    days30to60: number
    days60to90: number
    over90?: number
    days90plus?: number
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

// Helper to get aging value from client (handles nested aging object from API)
function getAgingValue(client: any, key: string): number {
  // API may return flat structure or nested under 'aging'
  if (client.aging && typeof client.aging[key] === 'number') {
    return client.aging[key]
  }
  // Handle legacy field names
  if (key === 'over90' && typeof client.days90plus === 'number') {
    return client.days90plus
  }
  if (typeof client[key] === 'number') {
    return client[key]
  }
  return 0
}

// Helper to calculate client total from aging buckets
function getClientTotal(client: any): number {
  // If client has a total field, use it
  if (typeof client.total === 'number') {
    return client.total
  }
  // Otherwise sum the aging buckets
  return getAgingValue(client, 'current') +
    getAgingValue(client, 'days30to60') +
    getAgingValue(client, 'days60to90') +
    getAgingValue(client, 'over90')
}

// Helper to get totals value (handles different API field names)
function getTotalsValue(key: string): number {
  if (!report.value?.totals) return 0
  const totals = report.value.totals as any
  // Handle both camelCase and snake_case from API
  if (key === 'over90') {
    return totals.over90 ?? totals.over_90 ?? totals.days90plus ?? 0
  }
  if (key === 'days30to60') {
    return totals.days30to60 ?? totals.days_30_to_60 ?? 0
  }
  if (key === 'days60to90') {
    return totals.days60to90 ?? totals.days_60_to_90 ?? 0
  }
  return totals[key] ?? 0
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
