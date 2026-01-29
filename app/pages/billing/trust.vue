<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <NuxtLink to="/billing" class="hover:text-gray-700">Billing</NuxtLink>
          <span>/</span>
          <span>Trust Accounts</span>
        </div>
        <h1 class="text-3xl font-bold text-gray-900">Trust Account Management</h1>
        <p class="text-gray-600 mt-1">IOLTA compliance and client trust fund tracking</p>
      </div>
      <div class="flex gap-2">
        <UiButton variant="secondary" @click="showReconciliationModal = true">
          Reconcile
        </UiButton>
        <UiButton variant="secondary" @click="showDepositModal = true">
          Record Deposit
        </UiButton>
        <UiButton v-if="!trustAccount" @click="showCreateAccountModal = true">
          Create Trust Account
        </UiButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <template v-else>
      <!-- No Trust Account -->
      <UiCard v-if="!trustAccount" class="text-center py-12">
        <Landmark class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900">No Trust Account Configured</h3>
        <p class="text-gray-500 mt-1 mb-4">
          Set up a trust account to track client retainers and manage IOLTA compliance.
        </p>
        <UiButton @click="showCreateAccountModal = true">
          Create Trust Account
        </UiButton>
      </UiCard>

      <!-- Trust Account Info -->
      <template v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Total Balance -->
          <UiCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-500">Trust Balance</p>
                <p class="text-2xl font-bold text-gray-900">{{ formatCurrency(trustAccount.currentBalance || trustAccount.current_balance) }}</p>
              </div>
              <div class="p-3 bg-green-100 rounded-full">
                <Landmark class="w-6 h-6 text-green-600" />
              </div>
            </div>
          </UiCard>

          <!-- Clients with Balances -->
          <UiCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-500">Clients with Balance</p>
                <p class="text-2xl font-bold text-gray-900">{{ clientCount }}</p>
              </div>
              <div class="p-3 bg-blue-100 rounded-full">
                <Users class="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </UiCard>

          <!-- Account Info -->
          <UiCard>
            <div>
              <p class="text-sm font-medium text-gray-500">{{ trustAccount.accountName || trustAccount.account_name }}</p>
              <p class="text-lg font-medium text-gray-900">{{ trustAccount.bankName || trustAccount.bank_name || 'No bank specified' }}</p>
              <p class="text-sm text-gray-500">
                {{ trustAccount.accountType || trustAccount.account_type }}
                {{ (trustAccount.accountNumberLast4 || trustAccount.account_number_last4) ? `****${trustAccount.accountNumberLast4 || trustAccount.account_number_last4}` : '' }}
              </p>
            </div>
          </UiCard>
        </div>

        <!-- Tabs -->
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-burgundy-500 text-burgundy-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              {{ tab.name }}
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div v-if="activeTab === 'clients'">
          <BillingTrustClientList :trustAccountId="trustAccount.id" />
        </div>

        <div v-else-if="activeTab === 'transactions'">
          <BillingTrustTransactionList :trustAccountId="trustAccount.id" />
        </div>

        <div v-else-if="activeTab === 'aging'">
          <BillingTrustAgingReport :trustAccountId="trustAccount.id" />
        </div>
      </template>
    </template>

    <!-- Create Account Modal -->
    <BillingCreateTrustAccountModal
      v-if="showCreateAccountModal"
      @close="showCreateAccountModal = false"
      @created="handleAccountCreated"
    />

    <!-- Deposit Modal -->
    <BillingTrustDepositModal
      v-if="showDepositModal"
      @close="showDepositModal = false"
      @deposited="handleDeposit"
    />

    <!-- Reconciliation Modal -->
    <BillingReconciliationModal
      v-if="showReconciliationModal"
      @close="showReconciliationModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { Landmark, Users } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const loading = ref(true)
const trustAccount = ref<any>(null)
const clientCount = ref(0)
const activeTab = ref('clients')

const showCreateAccountModal = ref(false)
const showDepositModal = ref(false)
const showReconciliationModal = ref(false)

const tabs = [
  { id: 'clients', name: 'Client Balances' },
  { id: 'transactions', name: 'Transactions' },
  { id: 'aging', name: 'Aging Report' }
]

function formatCurrency(cents: number | undefined): string {
  if (cents === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

async function fetchTrustAccount() {
  try {
    const response = await $fetch<{ accounts: any[] }>('/api/trust/accounts')
    // Get the first active account
    trustAccount.value = response.accounts.find(a => a.isActive || a.is_active) || null

    // Get client count from summary
    if (trustAccount.value) {
      const summary = await $fetch<{ summary: any }>('/api/billing/summary')
      clientCount.value = summary.summary?.trust?.clientsWithBalance || 0
    }
  } catch (error) {
    console.error('Failed to fetch trust accounts:', error)
  } finally {
    loading.value = false
  }
}

function handleAccountCreated(account: any) {
  showCreateAccountModal.value = false
  trustAccount.value = account
}

function handleDeposit() {
  showDepositModal.value = false
  fetchTrustAccount() // Refresh balance
}

onMounted(() => {
  fetchTrustAccount()
})
</script>
