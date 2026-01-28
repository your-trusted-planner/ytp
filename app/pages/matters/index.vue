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

    <!-- Google Drive Status Alert -->
    <div
      v-if="driveStatus.show"
      class="rounded-lg p-4 flex items-start justify-between"
      :class="driveStatus.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'"
    >
      <div class="flex items-start space-x-3">
        <CheckCircle v-if="driveStatus.success" class="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <AlertTriangle v-else class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div>
          <p :class="driveStatus.success ? 'text-green-800' : 'text-yellow-800'">
            {{ driveStatus.message }}
          </p>
          <a
            v-if="driveStatus.folderUrl"
            :href="driveStatus.folderUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-green-600 hover:text-green-800 underline mt-1 inline-flex items-center gap-1"
          >
            <IconsGoogleDrive :size="14" />
            Open in Google Drive
          </a>
          <p v-if="!driveStatus.success" class="text-sm text-yellow-700 mt-1">
            You can manually create the folder later from the matter details page or Settings &rarr; Google Drive.
          </p>
        </div>
      </div>
      <button
        @click="driveStatus.show = false"
        class="flex-shrink-0 ml-4"
        :class="driveStatus.success ? 'text-green-600 hover:text-green-800' : 'text-yellow-600 hover:text-yellow-800'"
      >
        <X class="w-5 h-5" />
      </button>
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
                <div class="text-xs text-gray-500">{{ matter.matter_number || 'No # assigned' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ getClientName(matter.client_id) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UiBadge :variant="getStatusVariant(matter.status)">
                  {{ matter.status }}
                </UiBadge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">
                  {{ matter.contract_date ? formatDate(matter.contract_date) : '-' }}
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

      <!-- Pagination Controls -->
      <div v-if="pagination && !hasActiveFilters" class="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <!-- Page info -->
        <div class="text-sm text-gray-700">
          Showing {{ paginationStartItem }}-{{ paginationEndItem }} of {{ pagination.totalCount }}
        </div>

        <div class="flex items-center gap-4">
          <!-- Page size selector -->
          <div class="flex items-center gap-2">
            <label for="page-size" class="text-sm text-gray-700">Per page:</label>
            <select
              id="page-size"
              :value="currentLimit"
              class="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
              @change="setPageSize(Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="size in pageSizeOptions" :key="size" :value="size">
                {{ size }}
              </option>
            </select>
          </div>

          <!-- Page navigation -->
          <div class="flex items-center gap-2">
            <button
              :disabled="!pagination.hasPrevPage"
              class="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="goToPage(pagination.page - 1)"
            >
              <ChevronLeft class="w-5 h-5" />
            </button>

            <span class="text-sm text-gray-700">
              Page {{ pagination.page }} of {{ pagination.totalPages }}
            </span>

            <button
              :disabled="!pagination.hasNextPage"
              class="p-1 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="goToPage(pagination.page + 1)"
            >
              <ChevronRight class="w-5 h-5" />
            </button>
          </div>
        </div>
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
import { CheckCircle, AlertTriangle, X, ChevronLeft, ChevronRight } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

interface PaginationMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

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

// Pagination state
const pagination = ref<PaginationMeta | null>(null)
const currentPage = ref(1)
const currentLimit = ref(25)
const pageSizeOptions = [10, 25, 50, 100]

// Refs for dropdowns
const lawyers = ref<any[]>([])
const engagementJourneys = ref<any[]>([])

// Google Drive feedback after matter creation
const driveStatus = ref<{
  show: boolean
  success: boolean
  message: string
  folderUrl?: string
}>({ show: false, success: false, message: '' })

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
    result = result.filter(m => m.client_id === clientFilter.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(m => {
      const clientName = getClientName(m.client_id).toLowerCase()
      const title = (m.title || '').toLowerCase()
      const matterNumber = (m.matter_number || '').toLowerCase()
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
    const response = await $fetch<any>('/api/matters', {
      params: {
        page: currentPage.value,
        limit: currentLimit.value
      }
    })
    // Handle both paginated and non-paginated responses
    if (response.matters) {
      matters.value = response.matters
      pagination.value = response.pagination || null
    } else if (Array.isArray(response)) {
      matters.value = response
      pagination.value = null
    }
  } catch (error) {
    console.error('Failed to fetch matters:', error)
  } finally {
    loading.value = false
  }
}

// Pagination handlers
function goToPage(page: number) {
  if (pagination.value) {
    if (page < 1) page = 1
    if (page > pagination.value.totalPages) page = pagination.value.totalPages
  }
  currentPage.value = page
  fetchMatters()
}

function setPageSize(limit: number) {
  currentLimit.value = limit
  currentPage.value = 1
  fetchMatters()
}

// Computed for pagination display
const paginationStartItem = computed(() => {
  if (!pagination.value) return 0
  return (pagination.value.page - 1) * pagination.value.limit + 1
})

const paginationEndItem = computed(() => {
  if (!pagination.value) return 0
  const end = pagination.value.page * pagination.value.limit
  return Math.min(end, pagination.value.totalCount)
})

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
  // Transform to camelCase for the modal
  editingMatter.value = {
    id: matter.id,
    title: matter.title,
    clientId: matter.client_id,
    description: matter.description,
    status: matter.status,
    leadAttorneyId: matter.lead_attorney_id,
    engagementJourneyId: matter.engagement_journey_id
  }
  showAddModal.value = true
}

interface GoogleDriveStatus {
  enabled: boolean
  success: boolean
  folderUrl?: string
  error?: string
  clientHasFolder?: boolean
}

const handleMatterSaved = async (matterId?: string, googleDrive?: GoogleDriveStatus) => {
  driveStatus.value = { show: false, success: false, message: '' }

  await fetchMatters()
  closeModal()

  // Show Google Drive status if integration is enabled
  if (googleDrive?.enabled) {
    if (googleDrive.success) {
      driveStatus.value = {
        show: true,
        success: true,
        message: 'Matter created successfully. Google Drive folder created.',
        folderUrl: googleDrive.folderUrl
      }
      // Auto-hide success message after 10 seconds
      setTimeout(() => {
        driveStatus.value.show = false
      }, 10000)
    } else if (!googleDrive.clientHasFolder) {
      driveStatus.value = {
        show: true,
        success: false,
        message: 'Matter created, but Google Drive folder was not created because the client does not have a Drive folder yet. Create the client folder first.'
      }
    } else {
      driveStatus.value = {
        show: true,
        success: false,
        message: `Matter created, but Google Drive folder creation failed: ${googleDrive.error || 'Unknown error'}`
      }
    }
  }
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


