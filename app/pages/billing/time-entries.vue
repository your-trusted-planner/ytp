<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Time Tracking</h1>
        <p class="text-gray-600 mt-1">Track billable hours and manage time entries</p>
      </div>
      <div class="flex gap-2">
        <UiButton v-if="selectedIds.length > 0" variant="secondary" @click="showBulkBillModal = true">
          <FileText class="w-4 h-4 mr-1" />
          Bill {{ selectedIds.length }} Entries
        </UiButton>
        <UiButton @click="showCreateModal = true">
          <Plus class="w-4 h-4 mr-1" />
          Create Time Entry
        </UiButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loadingSummary" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <!-- Summary Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Hours This Month -->
      <UiCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">This Month</p>
            <p class="text-2xl font-bold text-gray-900">{{ summary?.totalHoursThisMonth || '0.00' }}</p>
            <p class="text-sm text-gray-500">hours tracked</p>
          </div>
          <div class="p-3 bg-blue-100 rounded-full">
            <Clock class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </UiCard>

      <!-- Pending Approval -->
      <UiCard class="cursor-pointer hover:shadow-md transition-shadow" @click="activeTab = 'submitted'">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Pending Approval</p>
            <p class="text-2xl font-bold" :class="(summary?.pendingApprovalCount || 0) > 0 ? 'text-amber-600' : 'text-gray-900'">
              {{ summary?.pendingApprovalCount || 0 }}
            </p>
            <p class="text-sm text-gray-500">entries awaiting review</p>
          </div>
          <div class="p-3 rounded-full" :class="(summary?.pendingApprovalCount || 0) > 0 ? 'bg-amber-100' : 'bg-gray-100'">
            <AlertCircle class="w-6 h-6" :class="(summary?.pendingApprovalCount || 0) > 0 ? 'text-amber-600' : 'text-gray-400'" />
          </div>
        </div>
      </UiCard>

      <!-- Billable Amount -->
      <UiCard class="cursor-pointer hover:shadow-md transition-shadow" @click="activeTab = 'approved'">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Ready to Bill</p>
            <p class="text-2xl font-bold text-green-600">{{ formatCurrency(summary?.billableAmount || 0) }}</p>
            <p class="text-sm text-gray-500">approved entries</p>
          </div>
          <div class="p-3 bg-green-100 rounded-full">
            <DollarSign class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </UiCard>

      <!-- This Week -->
      <UiCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">This Week</p>
            <p class="text-2xl font-bold text-gray-900">{{ summary?.totalHoursThisWeek || '0.00' }}</p>
            <p class="text-sm text-gray-500">hours tracked</p>
          </div>
          <div class="p-3 bg-purple-100 rounded-full">
            <Calendar class="w-6 h-6 text-purple-600" />
          </div>
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
          <span
            v-if="tab.count !== undefined && tab.count > 0"
            class="ml-2 py-0.5 px-2 rounded-full text-xs"
            :class="tab.id === 'submitted' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'"
          >
            {{ tab.count }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Bulk Actions Bar -->
    <div
      v-if="selectedIds.length > 0 && activeTab === 'approved'"
      class="bg-burgundy-50 border border-burgundy-200 rounded-lg p-4 flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <CheckSquare class="w-5 h-5 text-burgundy-600" />
        <span class="text-sm font-medium text-burgundy-900">
          {{ selectedIds.length }} entries selected
          ({{ formatCurrency(selectedAmount) }})
        </span>
      </div>
      <div class="flex gap-2">
        <UiButton size="sm" variant="outline" @click="selectedIds = []">
          Clear Selection
        </UiButton>
        <UiButton size="sm" @click="showBulkBillModal = true">
          <FileText class="w-4 h-4 mr-1" />
          Bill Selected
        </UiButton>
      </div>
    </div>

    <!-- Tab Content -->
    <BillingTimeEntryTable
      :time-entries="currentEntries"
      :loading="loadingEntries"
      :selectable="activeTab === 'approved'"
      :selected-ids="selectedIds"
      :can-approve="canApprove"
      @select="handleSelect"
      @edit="handleEdit"
      @delete="handleDelete"
      @submit="handleSubmit"
      @approve="handleApprove"
    />

    <!-- Create/Edit Modal -->
    <BillingTimeEntryModal
      v-if="showCreateModal || editingEntry"
      :editing-entry="editingEntry"
      @close="closeModal"
      @created="handleCreated"
      @updated="handleUpdated"
    />

    <!-- Bulk Bill Modal -->
    <BillingTimeEntryBulkBillModal
      v-if="showBulkBillModal"
      :entry-ids="selectedIds"
      :entries="selectedEntries"
      @close="showBulkBillModal = false"
      @billed="handleBulled"
    />
  </div>
</template>

<script setup lang="ts">
import { Clock, Plus, AlertCircle, DollarSign, Calendar, FileText, CheckSquare } from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard'
})

interface TimeEntry {
  id: string
  userId: string
  userName: string
  matterId: string
  matterTitle: string
  hours: string
  description: string
  workDate: Date | string | number
  isBillable: boolean
  hourlyRate: number
  amount: number
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'BILLED' | 'WRITTEN_OFF'
  invoiceId?: string
  invoiceLineItemId?: string
}

const toast = useToast()
const route = useRoute()
const { data: sessionData } = await useFetch('/api/auth/session')
const currentUser = computed(() => sessionData.value?.user)

// Can approve if admin or lawyer
const canApprove = computed(() => {
  const role = currentUser.value?.role
  return role === 'ADMIN' || role === 'LAWYER'
})

// State
const loadingSummary = ref(true)
const loadingEntries = ref(false)
const summary = ref<any>(null)
const activeTab = ref((route.query.tab as string) || 'all')

// Entries by tab
const allEntries = ref<TimeEntry[]>([])
const draftEntries = ref<TimeEntry[]>([])
const submittedEntries = ref<TimeEntry[]>([])
const approvedEntries = ref<TimeEntry[]>([])
const billedEntries = ref<TimeEntry[]>([])

// Selection state (for bulk billing)
const selectedIds = ref<string[]>([])

// Modal state
const showCreateModal = ref(false)
const showBulkBillModal = ref(false)
const editingEntry = ref<TimeEntry | null>(null)

// Tab configuration
const tabs = computed(() => [
  { id: 'all', name: 'All Entries' },
  { id: 'draft', name: 'Draft', count: summary.value?.byStatus?.DRAFT?.count },
  { id: 'submitted', name: 'Submitted', count: summary.value?.byStatus?.SUBMITTED?.count },
  { id: 'approved', name: 'Approved', count: summary.value?.byStatus?.APPROVED?.count },
  { id: 'billed', name: 'Billed', count: summary.value?.byStatus?.BILLED?.count }
])

// Current entries based on tab
const currentEntries = computed(() => {
  switch (activeTab.value) {
    case 'draft': return draftEntries.value
    case 'submitted': return submittedEntries.value
    case 'approved': return approvedEntries.value
    case 'billed': return billedEntries.value
    default: return allEntries.value
  }
})

// Selected entries for bulk billing
const selectedEntries = computed(() => {
  return approvedEntries.value.filter(e => selectedIds.value.includes(e.id))
})

// Selected amount
const selectedAmount = computed(() => {
  return selectedEntries.value.reduce((sum, e) => sum + e.amount, 0)
})

// Fetch summary
async function fetchSummary() {
  try {
    const response = await $fetch<{ summary: any }>('/api/time-entries/summary')
    summary.value = response.summary
  } catch (error) {
    console.error('Failed to fetch summary:', error)
  } finally {
    loadingSummary.value = false
  }
}

// Fetch entries by status
async function fetchEntries(status?: string) {
  loadingEntries.value = true
  try {
    const query: Record<string, string> = {}
    if (status && status !== 'all') {
      query.status = status.toUpperCase()
    }

    const response = await $fetch<{ timeEntries: TimeEntry[] }>('/api/time-entries', { query })
    const entries = response.timeEntries || []

    if (status === 'all' || !status) {
      allEntries.value = entries
    } else if (status === 'draft') {
      draftEntries.value = entries
    } else if (status === 'submitted') {
      submittedEntries.value = entries
    } else if (status === 'approved') {
      approvedEntries.value = entries
    } else if (status === 'billed') {
      billedEntries.value = entries
    }
  } catch (error) {
    console.error('Failed to fetch entries:', error)
  } finally {
    loadingEntries.value = false
  }
}

// Watch tab changes
watch(activeTab, (tab) => {
  // Clear selection when changing tabs
  selectedIds.value = []

  // Fetch entries for the tab if not already loaded
  if (tab === 'all' && allEntries.value.length === 0) fetchEntries('all')
  if (tab === 'draft' && draftEntries.value.length === 0) fetchEntries('draft')
  if (tab === 'submitted' && submittedEntries.value.length === 0) fetchEntries('submitted')
  if (tab === 'approved' && approvedEntries.value.length === 0) fetchEntries('approved')
  if (tab === 'billed' && billedEntries.value.length === 0) fetchEntries('billed')
})

// Handler functions
function handleSelect(ids: string[]) {
  selectedIds.value = ids
}

function handleEdit(entry: TimeEntry) {
  editingEntry.value = entry
}

async function handleDelete(entry: TimeEntry) {
  if (!confirm(`Are you sure you want to delete this time entry for ${entry.hours} hours?`)) {
    return
  }

  try {
    await $fetch(`/api/time-entries/${entry.id}`, { method: 'DELETE' })
    toast.success('Time entry deleted')
    refreshAll()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to delete entry')
  }
}

async function handleSubmit(entry: TimeEntry) {
  try {
    await $fetch(`/api/time-entries/${entry.id}/submit`, { method: 'POST' })
    toast.success('Time entry submitted for approval')
    refreshAll()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to submit entry')
  }
}

async function handleApprove(entry: TimeEntry) {
  try {
    await $fetch(`/api/time-entries/${entry.id}/approve`, { method: 'POST' })
    toast.success('Time entry approved')
    refreshAll()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to approve entry')
  }
}

function handleCreated(entry: TimeEntry) {
  closeModal()
  refreshAll()
}

function handleUpdated(entry: TimeEntry) {
  closeModal()
  refreshAll()
}

function handleBulled() {
  showBulkBillModal.value = false
  selectedIds.value = []
  refreshAll()
}

function closeModal() {
  showCreateModal.value = false
  editingEntry.value = null
}

function refreshAll() {
  fetchSummary()
  // Clear cached data to force reload
  allEntries.value = []
  draftEntries.value = []
  submittedEntries.value = []
  approvedEntries.value = []
  billedEntries.value = []
  // Fetch current tab
  fetchEntries(activeTab.value)
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

// Initial fetch
onMounted(() => {
  fetchSummary()
  fetchEntries('all')
})
</script>
