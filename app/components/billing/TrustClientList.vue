<template>
  <UiCard>
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <div v-else-if="clients.length === 0" class="text-center py-12">
      <Users class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900">No client balances</h3>
      <p class="text-gray-500 mt-1">Record a deposit to see client trust balances here.</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Matter
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Balance
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="client in clients"
            :key="client.clientId + (client.matterId || '')"
            class="hover:bg-gray-50"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <NuxtLink
                :to="`/clients/${client.clientId || client.client_id}`"
                class="text-sm font-medium text-burgundy-600 hover:text-burgundy-800"
              >
                {{ client.clientName || client.client_name }}
              </NuxtLink>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <NuxtLink
                v-if="client.matterId || client.matter_id"
                :to="`/matters/${client.matterId || client.matter_id}`"
                class="text-sm text-gray-600 hover:text-gray-900"
              >
                {{ client.matterTitle || client.matter_title }}
              </NuxtLink>
              <span v-else class="text-sm text-gray-400">General</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <span class="text-sm font-medium text-gray-900">
                {{ formatCurrency(client.balance) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <button
                @click="viewLedger(client)"
                class="text-sm text-burgundy-600 hover:text-burgundy-800"
              >
                View Ledger
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { Users } from 'lucide-vue-next'

const props = defineProps<{
  trustAccountId: string
}>()

const loading = ref(true)
const clients = ref<any[]>([])

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function viewLedger(client: any) {
  const clientId = client.clientId || client.client_id
  navigateTo(`/billing/trust/${clientId}`)
}

async function fetchClients() {
  try {
    // Get all transactions grouped by client
    const response = await $fetch<{ transactions: any[] }>('/api/trust/transactions', {
      query: { limit: 1000 }
    })

    // Group by client and calculate balances
    const clientMap = new Map<string, any>()

    for (const tx of response.transactions) {
      const key = `${tx.clientId || tx.client_id}-${tx.matterId || tx.matter_id || ''}`
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          clientId: tx.clientId || tx.client_id,
          clientName: tx.clientName || tx.client_name,
          matterId: tx.matterId || tx.matter_id,
          matterTitle: tx.matterTitle || tx.matter_title,
          balance: 0
        })
      }
    }

    // Fetch actual balances
    const clientIds = [...new Set(response.transactions.map(t => t.clientId || t.client_id))]

    for (const clientId of clientIds) {
      try {
        const balanceResponse = await $fetch<{ balances: any[]; clientName: string }>(`/api/trust/clients/${clientId}/balance`)

        for (const balance of balanceResponse.balances) {
          const key = `${balance.clientId || balance.client_id}-${balance.matterId || balance.matter_id || ''}`
          if (clientMap.has(key)) {
            clientMap.get(key).balance = balance.balance
            clientMap.get(key).clientName = balanceResponse.clientName || balance.clientName || balance.client_name
          } else if (balance.balance > 0) {
            clientMap.set(key, {
              clientId: balance.clientId || balance.client_id,
              clientName: balanceResponse.clientName || balance.clientName || balance.client_name,
              matterId: balance.matterId || balance.matter_id,
              matterTitle: balance.matterTitle || balance.matter_title,
              balance: balance.balance
            })
          }
        }
      } catch (e) {
        // Client balance fetch failed, skip
      }
    }

    // Filter to only clients with balance > 0
    clients.value = Array.from(clientMap.values())
      .filter(c => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
  } catch (error) {
    console.error('Failed to fetch client balances:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchClients()
})
</script>
