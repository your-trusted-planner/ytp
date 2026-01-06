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

    <!-- Matters List -->
    <UiCard>
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading matters...</p>
      </div>
      <div v-else-if="matters.length === 0" class="text-center py-12">
        <p class="text-gray-500">No matters found</p>
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
              v-for="matter in matters"
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
    <UiModal
      v-model="showAddModal"
      :title="editingMatter ? 'Edit Matter' : 'Add New Matter'"
      size="lg"
    >
      <form @submit.prevent="handleSaveMatter" class="space-y-4">
        <!-- Matter Details -->
        <UiInput
          v-model="matterForm.title"
          label="Matter Title"
          placeholder="e.g., Smith Family Trust 2024"
          required
        />

        <UiSelect
            v-model="matterForm.clientId"
            label="Client"
            required
        >
            <option value="">Select Client</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.firstName }} {{ client.lastName }}
            </option>
        </UiSelect>

        <UiTextarea
          v-model="matterForm.description"
          label="Description"
          placeholder="Brief description of the matter..."
          :rows="3"
        />

        <div class="grid grid-cols-2 gap-4">
          <UiSelect
            v-model="matterForm.status"
            label="Status"
            required
          >
            <option value="PENDING">Pending</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </UiSelect>

          <UiInput
            v-model="matterForm.contractDate"
            label="Engagement Letter Date (Optional)"
            type="date"
            placeholder="Date letter was signed"
          />
        </div>

        <!-- Services Section -->
        <div class="border-t pt-4 mt-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium text-gray-900">Services</h3>
                <span v-if="!editingMatter" class="text-sm text-gray-500">(Optional)</span>
            </div>

            <!-- For NEW matters: Multi-select from catalog -->
            <div v-if="!editingMatter">
                <label class="block text-sm font-medium text-gray-700 mb-2">Select Services to Engage</label>
                <div class="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    <label
                        v-for="item in catalog"
                        :key="item.id"
                        class="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                        <input
                            type="checkbox"
                            :value="item.id"
                            v-model="selectedServices"
                            class="mt-1 h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
                        />
                        <div class="flex-1">
                            <div class="text-sm font-medium text-gray-900">{{ item.name }}</div>
                            <div class="text-xs text-gray-500">{{ formatPrice(item.price) }}</div>
                        </div>
                    </label>
                </div>
                <p v-if="selectedServices.length > 0" class="text-sm text-gray-600 mt-2">
                    {{ selectedServices.length }} service(s) selected
                </p>
            </div>

            <!-- For EXISTING matters: Show engaged services with add button -->
            <div v-else>
                <div class="flex justify-end mb-3">
                    <UiButton
                        size="sm"
                        variant="secondary"
                        @click="showAddService = true"
                        type="button"
                    >
                        Add Service
                    </UiButton>
                </div>

            <div v-if="loadingServices" class="text-center py-4">
                <p class="text-sm text-gray-500">Loading services...</p>
            </div>
            <div v-else-if="services.length === 0" class="text-center py-4 bg-gray-50 rounded-lg">
                <p class="text-sm text-gray-500">No services associated with this matter</p>
            </div>
            <div v-else class="space-y-3">
                <div v-for="service in services" :key="`${service.matterId}-${service.catalogId}`" class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                        <div class="font-medium text-gray-900">{{ service.name }}</div>
                        <div class="text-xs text-gray-500">{{ formatPrice(service.price) }} • {{ service.status }}</div>
                    </div>
                </div>
            </div>

            <!-- Add Service Inline Form -->
            <div v-if="showAddService" class="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 class="text-sm font-medium text-gray-900 mb-3">Add New Service</h4>
                <div class="space-y-3">
                    <UiSelect v-model="newServiceForm.catalogId" label="Select Service" required>
                        <option value="">Choose a service...</option>
                        <option v-for="item in catalog" :key="item.id" :value="item.id">
                            {{ item.name }} ({{ formatPrice(item.price) }})
                        </option>
                    </UiSelect>

                    <div class="flex justify-end space-x-2">
                        <UiButton size="sm" variant="ghost" @click="showAddService = false">Cancel</UiButton>
                        <UiButton size="sm" @click="handleAddService" :is-loading="addingService">Add</UiButton>
                    </div>
                </div>
            </div>
            </div><!-- Close "For EXISTING matters" div -->
        </div><!-- Close "Services Section" div -->
      </form>
      
      <template #footer>
        <UiButton variant="outline" @click="closeModal">
          Cancel
        </UiButton>
        <UiButton @click="handleSaveMatter" :is-loading="saving">
          {{ editingMatter ? 'Update' : 'Create' }} Matter
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const router = useRouter()

const matters = ref<any[]>([])
const clients = ref<any[]>([])
const catalog = ref<any[]>([])
const services = ref<any[]>([])
const loading = ref(true)
const showAddModal = ref(false)
const saving = ref(false)
const editingMatter = ref<any>(null)

// Services management
const loadingServices = ref(false)
const showAddService = ref(false)
const addingService = ref(false)
const selectedServices = ref<string[]>([])  // Store selected catalog IDs for new matters
const newServiceForm = ref({
    catalogId: ''
})

const matterForm = ref({
  title: '',
  clientId: '',
  description: '',
  status: 'PENDING',
  contractDate: ''
})

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

const fetchMatterServices = async (matterId: string) => {
    loadingServices.value = true
    try {
        const response = await $fetch<{ services: any[] }>(`/api/matters/${matterId}/services`)
        services.value = response.services
    } catch (error) {
        console.error('Failed to fetch services:', error)
    } finally {
        loadingServices.value = false
    }
}

const handleAddService = async () => {
    const matterId = editingMatter.value?.id || currentMatterId.value
    if (!newServiceForm.value.catalogId || !matterId) return

    addingService.value = true
    try {
        const response = await $fetch(`/api/matters/${matterId}/services`, {
            method: 'POST',
            body: { catalogId: newServiceForm.value.catalogId }
        })

        // Refresh services list
        await fetchMatterServices(matterId)

        // Reset form
        showAddService.value = false
        newServiceForm.value.catalogId = ''

        console.log('Service engaged successfully:', response.engagement)
    } catch (error: any) {
        console.error('Failed to add service:', error)

        // Handle specific error cases
        if (error.statusCode === 409) {
            alert('This service is already engaged for this matter')
        } else if (error.statusCode === 404) {
            alert('Service not found in catalog')
        } else {
            alert(error.data?.message || 'Failed to add service')
        }
    } finally {
        addingService.value = false
    }
}

// Navigate to matter detail page
const viewMatter = (matterId: string) => {
  router.push(`/dashboard/matters/${matterId}`)
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

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

const editMatter = async (matter: any) => {
  editingMatter.value = matter
  matterForm.value = {
    title: matter.title,
    clientId: matter.clientId,
    description: matter.description || '',
    status: matter.status,
    contractDate: matter.contractDate ? new Date(matter.contractDate).toISOString().split('T')[0] : ''
  }
  showAddModal.value = true

  // Load services for this matter
  await fetchMatterServices(matter.id)
}

const handleSaveMatter = async () => {
  saving.value = true
  try {
    const payload = { ...matterForm.value }

    if (editingMatter.value) {
      // Updating existing matter
      await $fetch(`/api/matters/${editingMatter.value.id}`, {
        method: 'PUT',
        body: payload
      })
    } else {
      // Creating new matter
      const response = await $fetch<{ matter: any }>('/api/matters', {
        method: 'POST',
        body: payload
      })

      const newMatter = response.matter || response

      // Add selected services to the newly created matter
      if (selectedServices.value.length > 0) {
        await Promise.all(
          selectedServices.value.map(catalogId =>
            $fetch(`/api/matters/${newMatter.id}/services`, {
              method: 'POST',
              body: { catalogId }
            }).catch(error => {
              console.error(`Failed to add service ${catalogId}:`, error)
              // Don't throw - we want to add as many as possible
            })
          )
        )
      }
    }

    closeModal()
    await fetchMatters()
  } catch (error: any) {
    alert(error.data?.message || 'Failed to save matter')
  } finally {
    saving.value = false
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingMatter.value = null
  services.value = []
  showAddService.value = false
  selectedServices.value = []
  newServiceForm.value.catalogId = ''
  matterForm.value = {
    title: '',
    clientId: '',
    description: '',
    status: 'PENDING',
    contractDate: ''
  }
}

onMounted(async () => {
  await Promise.all([fetchMatters(), fetchClients(), fetchCatalog()])

  // Check if we should auto-open the modal with a pre-filled client
  const route = useRoute()
  if (route.query.createNew === 'true' && route.query.clientId) {
    matterForm.value.clientId = route.query.clientId as string
    showAddModal.value = true
  }
})
</script>


