<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-3xl font-bold text-gray-900">Clients</h1>
          <UiHelpLink topic="managing-clients" title="Learn about managing clients" />
        </div>
        <p class="text-gray-600 mt-1">Manage your client list</p>
      </div>
      <UiButton @click="showAddModal = true">
        Add Client
      </UiButton>
    </div>

    <!-- Status Filter -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">Status:</span>
        <div class="flex gap-1">
          <button
            @click="setStatusFilter(null)"
            class="px-3 py-1 text-sm rounded-full transition-colors"
            :class="!statusFilter ? 'bg-burgundy-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          >
            All
          </button>
          <button
            v-for="status in availableStatuses"
            :key="status"
            @click="setStatusFilter(status)"
            class="px-3 py-1 text-sm rounded-full transition-colors"
            :class="statusFilter === status ? 'bg-burgundy-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          >
            {{ status }}
          </button>
        </div>
      </div>
      <div v-if="statusFilter" class="text-sm text-gray-500">
        Showing {{ clients.length }} {{ statusFilter.toLowerCase() }} client{{ clients.length !== 1 ? 's' : '' }}
      </div>
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
            class="text-sm text-green-600 hover:text-green-800 underline mt-1 inline-block"
          >
            Open in Google Drive
          </a>
          <p v-if="!driveStatus.success" class="text-sm text-yellow-700 mt-1">
            You can manually create the folder later from the client's profile or Settings &rarr; Google Drive.
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

    <!-- Clients List -->
    <UiCard>
      <UiDataTable
        :data="clients"
        :columns="columns"
        :loading="loading"
        :pagination="pagination ?? undefined"
        loading-text="Loading clients..."
        empty-text="No clients yet"
        default-sort-key="createdAt"
        default-sort-direction="desc"
        @row-click="navigateToClient"
        @sort="handleSort"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <!-- Name column with custom rendering -->
        <template #cell-name="{ row }">
          <div class="text-sm font-medium text-gray-900">
            {{ row.firstName }} {{ row.lastName }}
          </div>
        </template>

        <!-- Status column with badge -->
        <template #cell-status="{ row }">
          <UiBadge
            :variant="row.status === 'ACTIVE' ? 'success' : row.status === 'PENDING_APPROVAL' ? 'warning' : 'default'"
          >
            {{ row.status }}
          </UiBadge>
        </template>

        <!-- Actions column -->
        <template #cell-actions="{ row }">
          <NuxtLink
            :to="`/clients/${row.id}`"
            class="text-accent-600 hover:text-accent-900"
          >
            View Details
          </NuxtLink>
        </template>
      </UiDataTable>
    </UiCard>

    <!-- Add Client Modal -->
    <UiModal v-model="showAddModal" title="Add New Client">
      <form @submit.prevent="handleAddClient" class="space-y-4">
        <UiInput
          v-model="newClient.firstName"
          label="First Name"
          required
        />
        <UiInput
          v-model="newClient.lastName"
          label="Last Name"
          required
        />
        <UiInput
          v-model="newClient.email"
          label="Email"
          type="email"
          required
        />
        <UiInput
          v-model="newClient.phone"
          label="Phone"
        />
        <UiInput
          v-model="newClient.password"
          label="Temporary Password"
          type="password"
          required
          hint="Client will use this to log in initially"
        />
      </form>
      <template #footer>
        <UiButton variant="outline" @click="showAddModal = false">
          Cancel
        </UiButton>
        <UiButton @click="handleAddClient" :is-loading="saving">
          Add Client
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { CheckCircle, AlertTriangle, X } from 'lucide-vue-next'
import type { Column, PaginationMeta } from '~/components/ui/DataTable.vue'

const toast = useToast()

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const router = useRouter()
const route = useRoute()
const clients = ref<any[]>([])
const loading = ref(true)
const showAddModal = ref(false)
const saving = ref(false)
const pagination = ref<PaginationMeta | null>(null)
const currentPage = ref(1)
const currentLimit = ref(25)
const sortBy = ref<string>('createdAt')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Status filter
const availableStatuses = ['ACTIVE', 'PROSPECT', 'LEAD', 'INACTIVE']
const statusFilter = ref<string | null>(null)

// Initialize status filter from URL query param
if (route.query.status && typeof route.query.status === 'string') {
  const urlStatus = route.query.status.toUpperCase()
  if (availableStatuses.includes(urlStatus)) {
    statusFilter.value = urlStatus
  }
}

// Update URL when filter changes
const setStatusFilter = (status: string | null) => {
  statusFilter.value = status
  currentPage.value = 1 // Reset to first page

  // Update URL query param
  const query = { ...route.query }
  if (status) {
    query.status = status
  } else {
    delete query.status
  }
  router.replace({ query })

  fetchClients()
}

const newClient = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: ''
})

// Column definitions
const columns: Column[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    sortFn: (a, b, dir) => {
      const aName = `${a.firstName} ${a.lastName}`.toLowerCase()
      const bName = `${b.firstName} ${b.lastName}`.toLowerCase()
      const cmp = aName.localeCompare(bName)
      return dir === 'asc' ? cmp : -cmp
    }
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
    textClass: 'text-sm text-gray-500'
  },
  {
    key: 'phone',
    label: 'Phone',
    sortable: true,
    textClass: 'text-sm text-gray-500',
    format: (val) => val || 'N/A'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true
  },
  {
    key: 'createdAt',
    label: 'Created On',
    sortable: true,
    textClass: 'text-sm text-gray-500',
    format: (val) => formatDate(val)
  },
  {
    key: 'updatedAt',
    label: 'Updated On',
    sortable: true,
    textClass: 'text-sm text-gray-500',
    format: (val) => formatDate(val)
  },
  {
    key: 'actions',
    label: 'Actions',
    stopPropagation: true
  }
]

// Google Drive feedback after client creation
const driveStatus = ref<{
  show: boolean
  success: boolean
  message: string
  folderUrl?: string
}>({ show: false, success: false, message: '' })

const fetchClients = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: currentLimit.value,
      sortBy: sortBy.value,
      sortDirection: sortDirection.value
    }
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    const response = await $fetch<{ clients: any[], pagination?: PaginationMeta }>('/api/clients', {
      params
    })
    clients.value = response.clients
    pagination.value = response.pagination || null
  } catch (error) {
    console.error('Failed to fetch clients:', error)
  } finally {
    loading.value = false
  }
}

// Pagination handlers
const handlePageChange = async (page: number) => {
  currentPage.value = page
  await fetchClients()
}

const handlePageSizeChange = async (limit: number) => {
  currentLimit.value = limit
  currentPage.value = 1 // Reset to first page
  await fetchClients()
}

const handleSort = async (key: string, direction: 'asc' | 'desc') => {
  sortBy.value = key
  sortDirection.value = direction
  currentPage.value = 1 // Reset to first page
  await fetchClients()
}

const handleAddClient = async () => {
  saving.value = true
  driveStatus.value = { show: false, success: false, message: '' }

  try {
    const response = await $fetch<{
      success: boolean
      userId: string
      googleDrive: {
        enabled: boolean
        success: boolean
        folderUrl?: string
        error?: string
      }
    }>('/api/clients', {
      method: 'POST',
      body: newClient.value
    })

    showAddModal.value = false
    newClient.value = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: ''
    }
    await fetchClients()

    // Show Google Drive status if integration is enabled
    if (response.googleDrive?.enabled) {
      if (response.googleDrive.success) {
        driveStatus.value = {
          show: true,
          success: true,
          message: 'Client created successfully. Google Drive folder created.',
          folderUrl: response.googleDrive.folderUrl
        }
      } else {
        driveStatus.value = {
          show: true,
          success: false,
          message: `Client created, but Google Drive folder creation failed: ${response.googleDrive.error || 'Unknown error'}`
        }
      }
      // Auto-hide success message after 10 seconds
      if (response.googleDrive.success) {
        setTimeout(() => {
          driveStatus.value.show = false
        }, 10000)
      }
    }
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to add client')
  } finally {
    saving.value = false
  }
}

// Navigate to client details
const navigateToClient = (client: any) => {
  router.push(`/clients/${client.id}`)
}

// Format date for display
const formatDate = (timestamp: number) => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

onMounted(() => {
  fetchClients()
})
</script>
