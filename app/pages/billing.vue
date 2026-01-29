<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Billing & Trust</h1>
        <p class="text-gray-600 mt-1">Manage invoices, payments, and trust accounting</p>
      </div>
      <div class="flex gap-2">
        <UiButton variant="secondary" @click="navigateTo('/billing/trust')">
          Trust Accounts
        </UiButton>
        <UiButton @click="showCreateInvoiceModal = true">
          Create Invoice
        </UiButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <!-- Summary Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Outstanding Invoices -->
      <UiCard class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/billing?tab=outstanding')">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Outstanding</p>
            <p class="text-2xl font-bold text-gray-900">{{ summary?.invoices?.outstanding?.amountFormatted || '$0.00' }}</p>
            <p class="text-sm text-gray-500">{{ summary?.invoices?.outstanding?.count || 0 }} invoices</p>
          </div>
          <div class="p-3 bg-yellow-100 rounded-full">
            <FileText class="w-6 h-6 text-yellow-600" />
          </div>
        </div>
      </UiCard>

      <!-- Overdue Invoices -->
      <UiCard class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/billing?tab=overdue')">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Overdue</p>
            <p class="text-2xl font-bold" :class="(summary?.invoices?.overdue?.count || 0) > 0 ? 'text-red-600' : 'text-gray-900'">
              {{ summary?.invoices?.overdue?.amountFormatted || '$0.00' }}
            </p>
            <p class="text-sm text-gray-500">{{ summary?.invoices?.overdue?.count || 0 }} invoices</p>
          </div>
          <div class="p-3 rounded-full" :class="(summary?.invoices?.overdue?.count || 0) > 0 ? 'bg-red-100' : 'bg-gray-100'">
            <AlertTriangle class="w-6 h-6" :class="(summary?.invoices?.overdue?.count || 0) > 0 ? 'text-red-600' : 'text-gray-400'" />
          </div>
        </div>
      </UiCard>

      <!-- Trust Balance -->
      <UiCard class="cursor-pointer hover:shadow-md transition-shadow" @click="navigateTo('/billing/trust')">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Trust Balance</p>
            <p class="text-2xl font-bold text-gray-900">{{ summary?.trust?.balanceFormatted || '$0.00' }}</p>
            <p class="text-sm text-gray-500">{{ summary?.trust?.clientsWithBalance || 0 }} clients</p>
          </div>
          <div class="p-3 bg-green-100 rounded-full">
            <Landmark class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </UiCard>

      <!-- Collected This Month -->
      <UiCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Collected This Month</p>
            <p class="text-2xl font-bold text-green-600">{{ summary?.invoices?.paidThisMonth?.amountFormatted || '$0.00' }}</p>
            <p class="text-sm text-gray-500">{{ summary?.invoices?.paidThisMonth?.count || 0 }} invoices paid</p>
          </div>
          <div class="p-3 bg-green-100 rounded-full">
            <DollarSign class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Trust Account Alert -->
    <div v-if="!summary?.trust?.hasAccount" class="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <AlertTriangle class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p class="text-amber-800 font-medium">No Trust Account Configured</p>
          <p class="text-amber-700 text-sm mt-1">
            Set up a trust account to track client retainers and IOLTA compliance.
          </p>
          <button
            @click="navigateTo('/billing/trust')"
            class="text-sm text-amber-700 hover:text-amber-900 underline mt-2"
          >
            Configure Trust Account
          </button>
        </div>
      </div>
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
          <span
            v-if="tab.count !== undefined && tab.count > 0"
            class="ml-2 py-0.5 px-2 rounded-full text-xs"
            :class="tab.id === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'"
          >
            {{ tab.count }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div v-if="activeTab === 'all'">
      <BillingInvoiceTable :invoices="invoices" :loading="loadingInvoices" @refresh="fetchInvoices" />
    </div>

    <div v-else-if="activeTab === 'outstanding'">
      <BillingInvoiceTable :invoices="outstandingInvoices" :loading="loadingOutstanding" @refresh="fetchOutstanding" />
    </div>

    <div v-else-if="activeTab === 'overdue'">
      <BillingInvoiceTable :invoices="overdueInvoices" :loading="loadingOverdue" @refresh="fetchOverdue" />
    </div>

    <div v-else-if="activeTab === 'draft'">
      <BillingInvoiceTable :invoices="draftInvoices" :loading="loadingDrafts" @refresh="fetchDrafts" />
    </div>

    <!-- Create Invoice Modal -->
    <BillingCreateInvoiceModal
      v-if="showCreateInvoiceModal"
      @close="showCreateInvoiceModal = false"
      @created="handleInvoiceCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { FileText, AlertTriangle, Landmark, DollarSign } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const loading = ref(true)
const summary = ref<any>(null)

// Tab state
const activeTab = ref((route.query.tab as string) || 'all')

// Invoice lists
const invoices = ref<any[]>([])
const outstandingInvoices = ref<any[]>([])
const overdueInvoices = ref<any[]>([])
const draftInvoices = ref<any[]>([])

const loadingInvoices = ref(false)
const loadingOutstanding = ref(false)
const loadingOverdue = ref(false)
const loadingDrafts = ref(false)

// Modal state
const showCreateInvoiceModal = ref(false)

// Tab configuration
const tabs = computed(() => [
  { id: 'all', name: 'All Invoices' },
  { id: 'outstanding', name: 'Outstanding', count: summary.value?.invoices?.outstanding?.count },
  { id: 'overdue', name: 'Overdue', count: summary.value?.invoices?.overdue?.count },
  { id: 'draft', name: 'Drafts', count: summary.value?.invoices?.draft?.count }
])

// Fetch billing summary
async function fetchSummary() {
  try {
    const response = await $fetch('/api/billing/summary')
    summary.value = response.summary
  } catch (error) {
    console.error('Failed to fetch billing summary:', error)
  } finally {
    loading.value = false
  }
}

// Fetch all invoices
async function fetchInvoices() {
  loadingInvoices.value = true
  try {
    const response = await $fetch<{ invoices: any[] }>('/api/invoices')
    invoices.value = response.invoices
  } catch (error) {
    console.error('Failed to fetch invoices:', error)
  } finally {
    loadingInvoices.value = false
  }
}

// Fetch outstanding invoices
async function fetchOutstanding() {
  loadingOutstanding.value = true
  try {
    const response = await $fetch<{ invoices: any[] }>('/api/billing/outstanding')
    outstandingInvoices.value = response.invoices
  } catch (error) {
    console.error('Failed to fetch outstanding invoices:', error)
  } finally {
    loadingOutstanding.value = false
  }
}

// Fetch overdue invoices
async function fetchOverdue() {
  loadingOverdue.value = true
  try {
    const response = await $fetch<{ invoices: any[] }>('/api/billing/overdue')
    overdueInvoices.value = response.invoices
  } catch (error) {
    console.error('Failed to fetch overdue invoices:', error)
  } finally {
    loadingOverdue.value = false
  }
}

// Fetch draft invoices
async function fetchDrafts() {
  loadingDrafts.value = true
  try {
    const response = await $fetch<{ invoices: any[] }>('/api/invoices', {
      query: { status: 'DRAFT' }
    })
    draftInvoices.value = response.invoices
  } catch (error) {
    console.error('Failed to fetch draft invoices:', error)
  } finally {
    loadingDrafts.value = false
  }
}

// Handle invoice created
function handleInvoiceCreated(invoice: any) {
  showCreateInvoiceModal.value = false
  fetchSummary()
  fetchInvoices()
  // Navigate to the new invoice
  navigateTo(`/invoices/${invoice.id}`)
}

// Watch for tab changes and fetch data
watch(activeTab, (tab) => {
  if (tab === 'all' && invoices.value.length === 0) fetchInvoices()
  if (tab === 'outstanding' && outstandingInvoices.value.length === 0) fetchOutstanding()
  if (tab === 'overdue' && overdueInvoices.value.length === 0) fetchOverdue()
  if (tab === 'draft' && draftInvoices.value.length === 0) fetchDrafts()
})

// Initial fetch
onMounted(() => {
  fetchSummary()
  fetchInvoices() // Always load all invoices initially
})
</script>
