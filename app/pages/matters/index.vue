<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Client Matters</h1>
        <p class="text-gray-600 mt-1">Manage client engagements and matters</p>
      </div>
      <UiButton @click="showAddModal = true">
        Add New Matter
      </UiButton>
    </div>

    <!-- Filters -->
    <UiCard>
      <div class="flex flex-wrap gap-4 items-end">
        <!-- Search -->
        <div class="flex-1 min-w-[200px]">
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by title, matter #, or client..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>

        <!-- Status Filter -->
        <div class="w-40">
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            v-model="statusFilter"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="PENDING">Pending</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <!-- Client Filter -->
        <div class="w-48">
          <label class="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <select
            v-model="clientFilter"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          >
            <option value="">All Clients</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ client.firstName }} {{ client.lastName }}
            </option>
          </select>
        </div>

        <!-- Clear Filters -->
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          Clear filters
        </button>
      </div>
    </UiCard>

    <!-- Matters List -->
    <UiCard>
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading matters...</p>
      </div>
      <div v-else-if="filteredMatters.length === 0" class="text-center py-12">
        <p class="text-gray-500">
          {{ matters.length === 0 ? 'No matters found' : 'No matters match your filters' }}
        </p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matter Title</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="matter in filteredMatters"
              :key="matter.id"
              class="hover:bg-gray-50 cursor-pointer transition-colors"
              @click="viewMatter(matter.id)"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ matter.title }}</div>
                <div class="text-xs text-gray-500">{{ matter.matterNumber || 'No # assigned' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ getClientName(matter.clientId) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UiBadge :variant="getStatusVariant(matter.status)">
                  {{ matter.status }}
                </UiBadge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">
                  {{ matter.contractDate ? formatDate(matter.contractDate) : '-' }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click.stop="editMatter(matter)"
                  class="text-burgundy-600 hover:text-burgundy-900"
                >
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <!-- Add/Edit Matter Modal -->
    <MatterFormModal
      v-model="showAddModal"
      :editing-matter="editingMatter"
      :clients="clients"
      :lawyers="lawyers"
      :engagement-journeys="engagementJourneys"
      :catalog="catalog"
      :default-client-id="defaultClientId"
      @save="handleMatterSaved"
      @cancel="closeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatCurrency } from '~/utils/format'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const router = useRouter()

const matters = ref<any[]>([])
const clients = ref<any[]>([])
const catalog = ref<any[]>([])
const loading = ref(true)
const showAddModal = ref(false)
const editingMatter = ref<any>(null)
const defaultClientId = ref('')

// Filter state
const searchQuery = ref('')
const statusFilter = ref('')
const clientFilter = ref('')

// Refs for dropdowns
const lawyers = ref<any[]>([])
const engagementJourneys = ref<any[]>([])

// Computed: Check if any filters are active
const hasActiveFilters = computed(() => {
  return searchQuery.value || statusFilter.value || clientFilter.value
})

// Computed: Filter matters based on search and filters
const filteredMatters = computed(() => {
  let result = matters.value

  // Filter by status
  if (statusFilter.value) {
    result = result.filter(m => m.status === statusFilter.value)
  }

  // Filter by client
  if (clientFilter.value) {
    result = result.filter(m => m.clientId === clientFilter.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(m => {
      const clientName = getClientName(m.clientId).toLowerCase()
      const title = (m.title || '').toLowerCase()
      const matterNumber = (m.matterNumber || m.matter_number || '').toLowerCase()
      return title.includes(query) || matterNumber.includes(query) || clientName.includes(query)
    })
  }

  return result
})

// Clear all filters
const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  clientFilter.value = ''
}

const fetchMatters = async () => {
  loading.value = true
  try {
    const response = await $fetch<{ matters: any[] }>('/api/matters')
    matters.value = response.matters || response // Handle both wrapped and unwrapped responses
  } catch (error) {
    console.error('Failed to fetch matters:', error)
  } finally {
    loading.value = false
  }
}

const fetchClients = async () => {
  try {
    const response = await $fetch<{ clients: any[] }>('/api/clients')
    clients.value = response.clients || response
  } catch (error) {
    console.error('Failed to fetch clients:', error)
  }
}

const fetchCatalog = async () => {
  try {
    const response = await $fetch<any>('/api/catalog')
    catalog.value = response.services || response || []
  } catch (error) {
    console.error('Failed to fetch catalog:', error)
  }
}

// Navigate to matter detail page
const viewMatter = (matterId: string) => {
  router.push(`/matters/${matterId}`)
}

const getClientName = (clientId: string) => {
    const client = clients.value.find(c => c.id === clientId)
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client'
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'OPEN': return 'success'
    case 'PENDING': return 'warning'
    case 'CLOSED': return 'default'
    default: return 'default'
  }
}

const formatDate = (dateInput: string | Date | number) => {
  // Handle Unix timestamp (number), ISO string, or Date object
  const date = typeof dateInput === 'number'
    ? new Date(dateInput * 1000)  // Convert Unix timestamp to ms
    : new Date(dateInput)
  return date.toLocaleDateString()
}


const editMatter = async (matter: any) => {
  editingMatter.value = matter
  showAddModal.value = true
}

const handleMatterSaved = async (matterId?: string) => {
  await fetchMatters()
  closeModal()
}

const closeModal = () => {
  showAddModal.value = false
  editingMatter.value = null
  defaultClientId.value = ''
}

// NEW: Fetch lawyers for lead attorney dropdown
const fetchLawyers = async () => {
  try {
    const response = await $api<{ lawyers: any[] }>('/api/matters/lawyers')
    lawyers.value = response.lawyers || []
  } catch (error) {
    console.error('Failed to fetch lawyers:', error)
  }
}

// NEW: Fetch engagement journey templates
const fetchEngagementJourneys = async () => {
  try {
    const response = await $fetch<{ engagementJourneys: any[] }>('/api/journeys/engagement-templates')
    engagementJourneys.value = response.engagementJourneys || []
  } catch (error) {
    console.error('Failed to fetch engagement journeys:', error)
  }
}

onMounted(async () => {
  await Promise.all([
    fetchMatters(),
    fetchClients(),
    fetchCatalog(),
    fetchLawyers(),
    fetchEngagementJourneys()
  ])

  // Check if we should auto-open the modal with a pre-filled client
  const route = useRoute()
  if (route.query.createNew === 'true' && route.query.clientId) {
    defaultClientId.value = route.query.clientId as string
    showAddModal.value = true
  }
})
</script>


