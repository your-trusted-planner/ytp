<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center">
        <DollarSign class="w-5 h-5 mr-2 text-burgundy-600" />
        Billing Rates
      </h3>
      <UiButton size="sm" variant="outline" @click="showEditModal = true">
        <Edit class="w-4 h-4 mr-1" />
        Edit
      </UiButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-burgundy-600"></div>
    </div>

    <!-- Content -->
    <div v-else class="space-y-4">
      <!-- Role-Based Rates -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-sm text-gray-600">Attorney Rate</div>
          <div class="text-lg font-semibold" :class="rates?.attorneyRate ? 'text-gray-900' : 'text-gray-400'">
            {{ rates?.attorneyRate ? formatCurrency(rates.attorneyRate) + '/hr' : 'Not set' }}
          </div>
        </div>
        <div>
          <div class="text-sm text-gray-600">Staff Rate</div>
          <div class="text-lg font-semibold" :class="rates?.staffRate ? 'text-gray-900' : 'text-gray-400'">
            {{ rates?.staffRate ? formatCurrency(rates.staffRate) + '/hr' : 'Not set' }}
          </div>
        </div>
      </div>

      <p v-if="!rates?.attorneyRate && !rates?.staffRate" class="text-xs text-gray-500">
        Uses client or service catalog defaults
      </p>

      <!-- User-Specific Rates -->
      <div v-if="userRatesList.length > 0">
        <div class="text-sm text-gray-600 mb-2">User-Specific Overrides</div>
        <div class="space-y-2">
          <div
            v-for="userRate in userRatesList"
            :key="userRate.userId"
            class="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded"
          >
            <span class="text-gray-900">{{ userRate.userName }}</span>
            <span class="font-medium text-burgundy-600">{{ formatCurrency(userRate.rate) }}/hr</span>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="rates?.notes" class="pt-2 border-t border-gray-100">
        <div class="text-xs text-gray-500">Notes</div>
        <div class="text-sm text-gray-700 mt-1">{{ rates.notes }}</div>
      </div>

      <!-- Effective Date -->
      <div v-if="rates?.effectiveDate" class="text-xs text-gray-500">
        Effective: {{ formatDate(rates.effectiveDate) }}
      </div>
    </div>

    <!-- Edit Modal -->
    <BillingRatesEditModal
      v-if="showEditModal"
      :entity-type="entityType"
      :entity-id="entityId"
      :entity-name="entityName"
      :current-rates="rates"
      @close="showEditModal = false"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { DollarSign, Edit } from 'lucide-vue-next'

interface BillingRates {
  attorneyRate: number | null
  staffRate: number | null
  userRates: Record<string, number>
  notes: string | null
  effectiveDate: Date | string | null
}

interface UserRate {
  userId: string
  userName: string
  rate: number
}

const props = defineProps<{
  entityType: 'client' | 'matter'
  entityId: string
  entityName: string
}>()

const emit = defineEmits<{
  (e: 'updated'): void
}>()

// State
const loading = ref(true)
const showEditModal = ref(false)
const rates = ref<BillingRates | null>(null)
const users = ref<Array<{ id: string; firstName: string; lastName: string }>>([])

// Computed
const userRatesList = computed<UserRate[]>(() => {
  if (!rates.value?.userRates) return []

  const userMap = new Map(users.value.map(u => [u.id, u]))
  const result: UserRate[] = []

  for (const [userId, rate] of Object.entries(rates.value.userRates)) {
    const user = userMap.get(userId)
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown User'
    result.push({ userId, userName, rate: rate as number })
  }

  return result.sort((a, b) => a.userName.localeCompare(b.userName))
})

// Fetch rates
async function fetchRates() {
  loading.value = true
  try {
    const endpoint = props.entityType === 'client'
      ? `/api/billing-rates/clients/${props.entityId}`
      : `/api/billing-rates/matters/${props.entityId}`

    const response = await $fetch<BillingRates>(endpoint)
    rates.value = response
  } catch (error) {
    console.error('Failed to fetch billing rates:', error)
    rates.value = null
  } finally {
    loading.value = false
  }
}

// Fetch users (for displaying names)
async function fetchUsers() {
  try {
    const response = await $fetch<{ users: Array<{ id: string; firstName: string; lastName: string }> }>('/api/users', {
      query: { role: 'LAWYER,ADMIN,STAFF' }
    })
    users.value = response.users || []
  } catch (error) {
    console.error('Failed to fetch users:', error)
    users.value = []
  }
}

// Handle saved
function handleSaved() {
  showEditModal.value = false
  fetchRates()
  emit('updated')
}

// Helpers
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function formatDate(date: Date | string | null): string {
  if (!date) return '-'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Initial fetch
onMounted(() => {
  fetchRates()
  fetchUsers()
})
</script>
