<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Estate Plans</h1>
        <p class="text-gray-600 mt-1">Manage client estate plans, trusts, and wills</p>
      </div>
      <div class="flex gap-3">
        <NuxtLink
          to="/settings/integrations/wealthcounsel"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-burgundy-600 hover:text-burgundy-700 hover:bg-burgundy-50 rounded-lg transition-colors"
        >
          <Upload class="w-4 h-4 mr-2" />
          Import from WealthCounsel
        </NuxtLink>
        <UiButton @click="showCreateModal = true">
          <Plus class="w-4 h-4 mr-2" />
          New Plan
        </UiButton>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 items-center">
      <div class="flex-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search plans by name or client..."
          class="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
        />
      </div>
      <div class="flex gap-2">
        <button
          v-for="statusFilter in statusFilters"
          :key="statusFilter.value"
          @click="selectedStatus = statusFilter.value"
          :class="[
            'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
            selectedStatus === statusFilter.value
              ? 'bg-burgundy-100 text-burgundy-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          {{ statusFilter.label }}
          <span v-if="statusFilter.count" class="ml-1 text-xs">
            ({{ statusFilter.count }})
          </span>
        </button>
      </div>
    </div>

    <!-- Plans List -->
    <UiCard>
      <div v-if="loading" class="p-8 text-center text-gray-500">
        <div class="animate-spin w-8 h-8 border-4 border-burgundy-500 border-t-transparent rounded-full mx-auto mb-4" />
        Loading estate plans...
      </div>

      <div v-else-if="filteredPlans.length === 0" class="p-8 text-center text-gray-500">
        <FileText class="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p class="text-lg font-medium">No estate plans found</p>
        <p class="text-sm mt-2">
          {{ searchQuery ? 'Try adjusting your search' : 'Import from WealthCounsel or create a new plan to get started' }}
        </p>
      </div>

      <div v-else class="divide-y divide-gray-200">
        <NuxtLink
          v-for="plan in filteredPlans"
          :key="plan.id"
          :to="`/estate-plans/${plan.id}`"
          class="block p-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <!-- Plan Type Icon -->
              <div
                :class="[
                  'w-12 h-12 rounded-lg flex items-center justify-center',
                  plan.planType === 'TRUST_BASED' ? 'bg-blue-100' : 'bg-purple-100'
                ]"
              >
                <component
                  :is="plan.planType === 'TRUST_BASED' ? Landmark : FileText"
                  :class="[
                    'w-6 h-6',
                    plan.planType === 'TRUST_BASED' ? 'text-blue-600' : 'text-purple-600'
                  ]"
                />
              </div>

              <!-- Plan Info -->
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold text-gray-900">{{ plan.planName }}</h3>
                  <EstatePlanStatusBadge :status="plan.status" />
                </div>
                <div class="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span v-if="plan.primaryPerson">
                    <User class="w-4 h-4 inline mr-1" />
                    {{ plan.primaryPerson.fullName }}
                    <span v-if="plan.secondaryPerson">
                      & {{ plan.secondaryPerson.fullName }}
                    </span>
                  </span>
                  <span v-if="plan.effectiveDate">
                    <Calendar class="w-4 h-4 inline mr-1" />
                    {{ formatDate(plan.effectiveDate) }}
                  </span>
                  <span>
                    v{{ plan.currentVersion }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="hidden md:flex items-center gap-6 text-sm text-gray-500">
              <div class="text-center">
                <p class="font-semibold text-gray-900">{{ countRoles(plan, 'FIDUCIARY') }}</p>
                <p>Fiduciaries</p>
              </div>
              <div class="text-center">
                <p class="font-semibold text-gray-900">{{ countRoles(plan, 'BENEFICIARY') }}</p>
                <p>Beneficiaries</p>
              </div>
              <ChevronRight class="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </NuxtLink>
      </div>
    </UiCard>

    <!-- Create Plan Modal (placeholder) -->
    <UiModal v-model="showCreateModal" title="Create New Estate Plan">
      <p class="text-gray-600">
        Manual plan creation will be available in a future update.
        For now, please import plans from WealthCounsel.
      </p>
      <template #footer>
        <UiButton variant="outline" @click="showCreateModal = false">
          Close
        </UiButton>
        <NuxtLink to="/settings/integrations/wealthcounsel">
          <UiButton>
            <Upload class="w-4 h-4 mr-2" />
            Import from WealthCounsel
          </UiButton>
        </NuxtLink>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Upload, FileText, Landmark, User, Calendar, ChevronRight } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

// API response types
interface EstatePlanListItem {
  id: string
  planType: 'TRUST_BASED' | 'WILL_BASED'
  planName: string
  currentVersion: number
  status: string
  effectiveDate: string | null
  lastAmendedAt: string | null
  createdAt: string
  updatedAt: string
  primaryPerson: {
    id: string
    fullName: string
    firstName: string
    lastName: string
    email: string | null
  } | null
  secondaryPerson: {
    id: string
    fullName: string
    firstName: string
    lastName: string
    email: string | null
  } | null
  roleCounts: Record<string, number>
}

interface EstatePlansResponse {
  plans: EstatePlanListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const searchQuery = ref('')
const selectedStatus = ref<string>('all')
const showCreateModal = ref(false)

// Fetch plans from API
const { data, pending: loading, refresh } = useFetch<EstatePlansResponse>('/api/estate-plans', {
  query: computed(() => ({
    status: selectedStatus.value !== 'all' ? selectedStatus.value : undefined,
    search: searchQuery.value || undefined,
    limit: 100
  })),
  watch: false // We'll manually control when to refetch
})

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => refresh(), 300)
})

// Immediate refetch on status change
watch(selectedStatus, () => refresh())

const plans = computed(() => data.value?.plans || [])
const pagination = computed(() => data.value?.pagination)

const statusFilters = computed(() => [
  { value: 'all', label: 'All Plans', count: pagination.value?.total || plans.value.length },
  { value: 'ACTIVE', label: 'Active', count: null },
  { value: 'AMENDED', label: 'Amended', count: null },
  { value: 'ADMINISTERED', label: 'In Administration', count: null },
  { value: 'DRAFT', label: 'Draft', count: null }
])

// Plans are already filtered by API, so just return them
const filteredPlans = computed(() => plans.value)

function countRoles(plan: EstatePlanListItem, category: string): number {
  return plan.roleCounts[category] || 0
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
