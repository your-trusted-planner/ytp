<template>
  <UiCard>
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy-600"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="timeEntries.length === 0" class="text-center py-12">
      <Clock class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900">No time entries found</h3>
      <p class="text-gray-500 mt-1">Create your first time entry to start tracking billable work.</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th v-if="selectable" class="px-4 py-3 text-left">
              <input
                type="checkbox"
                :checked="allSelected"
                @change="toggleSelectAll"
                class="rounded border-gray-300 text-burgundy-600 focus:ring-burgundy-500"
              />
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th v-if="showMatterColumn" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Matter
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hours
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rate
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="entry in timeEntries"
            :key="entry.id"
            class="hover:bg-gray-50"
            :class="{ 'bg-burgundy-50': isSelected(entry.id) }"
          >
            <td v-if="selectable" class="px-4 py-4">
              <input
                type="checkbox"
                :checked="isSelected(entry.id)"
                @change="toggleSelect(entry.id)"
                :disabled="!canSelect(entry)"
                class="rounded border-gray-300 text-burgundy-600 focus:ring-burgundy-500 disabled:opacity-50"
              />
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">
                {{ formatDate(entry.workDate) }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">
                {{ entry.userName }}
              </div>
            </td>
            <td v-if="showMatterColumn" class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900 max-w-[200px] truncate" :title="entry.matterTitle">
                {{ entry.matterTitle }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <div class="text-sm font-medium text-gray-900">
                {{ entry.hours }}
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-900 max-w-[300px] truncate" :title="entry.description">
                {{ entry.description }}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <div class="text-sm text-gray-600">
                {{ formatCurrency(entry.hourlyRate) }}/hr
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <div class="text-sm font-medium" :class="entry.isBillable ? 'text-gray-900' : 'text-gray-400'">
                {{ formatCurrency(entry.amount) }}
              </div>
              <div v-if="!entry.isBillable" class="text-xs text-gray-400">
                Non-billable
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="statusClass(entry.status)"
              >
                {{ formatStatus(entry.status) }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
              <div class="flex justify-end gap-2">
                <!-- Edit - only for DRAFT -->
                <button
                  v-if="entry.status === 'DRAFT'"
                  @click="emit('edit', entry)"
                  class="text-gray-400 hover:text-gray-600"
                  title="Edit"
                >
                  <Edit class="w-4 h-4" />
                </button>

                <!-- Submit - only for DRAFT -->
                <button
                  v-if="entry.status === 'DRAFT'"
                  @click="emit('submit', entry)"
                  class="text-blue-400 hover:text-blue-600"
                  title="Submit for Approval"
                >
                  <Send class="w-4 h-4" />
                </button>

                <!-- Approve - only for SUBMITTED, admin/lawyer only -->
                <button
                  v-if="entry.status === 'SUBMITTED' && canApprove"
                  @click="emit('approve', entry)"
                  class="text-green-400 hover:text-green-600"
                  title="Approve"
                >
                  <Check class="w-4 h-4" />
                </button>

                <!-- View Invoice - only for BILLED -->
                <button
                  v-if="entry.status === 'BILLED' && entry.invoiceId"
                  @click="navigateTo(`/invoices/${entry.invoiceId}`)"
                  class="text-burgundy-400 hover:text-burgundy-600"
                  title="View Invoice"
                >
                  <FileText class="w-4 h-4" />
                </button>

                <!-- Delete - only for DRAFT -->
                <button
                  v-if="entry.status === 'DRAFT'"
                  @click="emit('delete', entry)"
                  class="text-red-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { Clock, Edit, Send, Check, FileText, Trash2 } from 'lucide-vue-next'

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
  approvedBy?: string
  approvedAt?: Date | string | number
  createdAt?: Date | string | number
  updatedAt?: Date | string | number
}

const props = withDefaults(defineProps<{
  timeEntries: TimeEntry[]
  loading?: boolean
  selectable?: boolean
  selectedIds?: string[]
  canApprove?: boolean
  showMatterColumn?: boolean
}>(), {
  loading: false,
  selectable: false,
  selectedIds: () => [],
  canApprove: false,
  showMatterColumn: true
})

const emit = defineEmits<{
  (e: 'select', ids: string[]): void
  (e: 'edit', entry: TimeEntry): void
  (e: 'delete', entry: TimeEntry): void
  (e: 'submit', entry: TimeEntry): void
  (e: 'approve', entry: TimeEntry): void
}>()

const allSelected = computed(() => {
  const selectableEntries = props.timeEntries.filter(e => canSelect(e))
  return selectableEntries.length > 0 && selectableEntries.every(e => props.selectedIds.includes(e.id))
})

function isSelected(id: string): boolean {
  return props.selectedIds.includes(id)
}

function canSelect(entry: TimeEntry): boolean {
  // Can only select APPROVED entries for billing
  return entry.status === 'APPROVED'
}

function toggleSelect(id: string) {
  const newSelection = isSelected(id)
    ? props.selectedIds.filter(i => i !== id)
    : [...props.selectedIds, id]
  emit('select', newSelection)
}

function toggleSelectAll() {
  const selectableEntries = props.timeEntries.filter(e => canSelect(e))
  if (allSelected.value) {
    emit('select', [])
  } else {
    emit('select', selectableEntries.map(e => e.id))
  }
}

function formatCurrency(cents: number | undefined): string {
  if (cents === undefined || cents === null) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function formatDate(date: Date | string | number | undefined | null): string {
  if (!date) return '-'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ')
}

function statusClass(status: string): string {
  const classes: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-green-100 text-green-700',
    BILLED: 'bg-purple-100 text-purple-700',
    WRITTEN_OFF: 'bg-gray-100 text-gray-500'
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}
</script>
