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

    <!-- Clients List -->
    <UiCard>
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading clients...</p>
      </div>
      <div v-else-if="clients.length === 0" class="text-center py-12">
        <p class="text-gray-500">No clients yet</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                @click="sortBy('name')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-2">
                  Name
                  <IconChevronUp v-if="sortColumn === 'name' && sortDirection === 'asc'" class="w-4 h-4" />
                  <IconChevronDown v-else-if="sortColumn === 'name' && sortDirection === 'desc'" class="w-4 h-4" />
                  <IconChevronsUpDown v-else class="w-4 h-4 opacity-30" />
                </div>
              </th>
              <th
                @click="sortBy('email')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-2">
                  Email
                  <IconChevronUp v-if="sortColumn === 'email' && sortDirection === 'asc'" class="w-4 h-4" />
                  <IconChevronDown v-else-if="sortColumn === 'email' && sortDirection === 'desc'" class="w-4 h-4" />
                  <IconChevronsUpDown v-else class="w-4 h-4 opacity-30" />
                </div>
              </th>
              <th
                @click="sortBy('phone')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-2">
                  Phone
                  <IconChevronUp v-if="sortColumn === 'phone' && sortDirection === 'asc'" class="w-4 h-4" />
                  <IconChevronDown v-else-if="sortColumn === 'phone' && sortDirection === 'desc'" class="w-4 h-4" />
                  <IconChevronsUpDown v-else class="w-4 h-4 opacity-30" />
                </div>
              </th>
              <th
                @click="sortBy('status')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-2">
                  Status
                  <IconChevronUp v-if="sortColumn === 'status' && sortDirection === 'asc'" class="w-4 h-4" />
                  <IconChevronDown v-else-if="sortColumn === 'status' && sortDirection === 'desc'" class="w-4 h-4" />
                  <IconChevronsUpDown v-else class="w-4 h-4 opacity-30" />
                </div>
              </th>
              <th
                @click="sortBy('createdAt')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-2">
                  Created On
                  <IconChevronUp v-if="sortColumn === 'createdAt' && sortDirection === 'asc'" class="w-4 h-4" />
                  <IconChevronDown v-else-if="sortColumn === 'createdAt' && sortDirection === 'desc'" class="w-4 h-4" />
                  <IconChevronsUpDown v-else class="w-4 h-4 opacity-30" />
                </div>
              </th>
              <th
                @click="sortBy('updatedAt')"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
              >
                <div class="flex items-center gap-2">
                  Updated On
                  <IconChevronUp v-if="sortColumn === 'updatedAt' && sortDirection === 'asc'" class="w-4 h-4" />
                  <IconChevronDown v-else-if="sortColumn === 'updatedAt' && sortDirection === 'desc'" class="w-4 h-4" />
                  <IconChevronsUpDown v-else class="w-4 h-4 opacity-30" />
                </div>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="client in sortedClients"
              :key="client.id"
              @click="navigateToClient(client.id)"
              class="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ client.firstName }} {{ client.lastName }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">{{ client.email }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">{{ client.phone || 'N/A' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UiBadge
                  :variant="client.status === 'ACTIVE' ? 'success' : client.status === 'PENDING_APPROVAL' ? 'warning' : 'default'"
                >
                  {{ client.status }}
                </UiBadge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">{{ formatDate(client.createdAt) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">{{ formatDate(client.updatedAt) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" @click.stop>
                <NuxtLink
                  :to="`/dashboard/clients/${client.id}`"
                  class="text-accent-600 hover:text-accent-900"
                >
                  View Details
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
import { ref, onMounted, computed } from 'vue'
import { ChevronUp as IconChevronUp, ChevronDown as IconChevronDown, ChevronsUpDown as IconChevronsUpDown } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const router = useRouter()
const clients = ref<any[]>([])
const loading = ref(true)
const showAddModal = ref(false)
const saving = ref(false)
const sortColumn = ref<string>('createdAt')
const sortDirection = ref<'asc' | 'desc'>('desc')

const newClient = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: ''
})

const fetchClients = async () => {
  loading.value = true
  try {
    const response = await $fetch<{ clients: any[] }>('/api/clients')
    clients.value = response.clients
  } catch (error) {
    console.error('Failed to fetch clients:', error)
  } finally {
    loading.value = false
  }
}

const handleAddClient = async () => {
  saving.value = true
  try {
    await $fetch('/api/clients', {
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
  } catch (error: any) {
    alert(error.data?.message || 'Failed to add client')
  } finally {
    saving.value = false
  }
}

// Sorting functionality
const sortBy = (column: string) => {
  if (sortColumn.value === column) {
    // Toggle direction if clicking the same column
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // Set new column and default to ascending
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

const sortedClients = computed(() => {
  const sorted = [...clients.value].sort((a, b) => {
    let aVal: any
    let bVal: any

    switch (sortColumn.value) {
      case 'name':
        aVal = `${a.firstName} ${a.lastName}`.toLowerCase()
        bVal = `${b.firstName} ${b.lastName}`.toLowerCase()
        break
      case 'email':
        aVal = a.email?.toLowerCase() || ''
        bVal = b.email?.toLowerCase() || ''
        break
      case 'phone':
        aVal = a.phone?.toLowerCase() || ''
        bVal = b.phone?.toLowerCase() || ''
        break
      case 'status':
        aVal = a.status || ''
        bVal = b.status || ''
        break
      case 'createdAt':
      case 'updatedAt':
        aVal = a[sortColumn.value] || 0
        bVal = b[sortColumn.value] || 0
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })

  return sorted
})

// Navigate to client details
const navigateToClient = (clientId: string) => {
  router.push(`/dashboard/clients/${clientId}`)
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
