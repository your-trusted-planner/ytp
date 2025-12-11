<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Matters</h1>
        <p class="text-gray-600 mt-1">Manage client cases and projects</p>
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
            <tr v-for="matter in matters" :key="matter.id" class="hover:bg-gray-50">
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
                  @click="editMatter(matter)"
                  class="text-accent-600 hover:text-accent-900 mr-4"
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
    <UiModal v-model="showAddModal" :title="editingMatter ? 'Edit Matter' : 'Add New Matter'" size="lg">
      <form @submit.prevent="handleSaveMatter" class="space-y-4">
        <UiInput
          v-model="matterForm.title"
          label="Matter Title"
          placeholder="e.g., Smith Family Trust 2024"
          required
        />
        
        <div class="grid grid-cols-2 gap-4">
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

            <UiInput
                v-model="matterForm.matterNumber"
                label="Matter Number (Optional)"
                placeholder="e.g., 2024-001"
            />
        </div>

        <UiTextarea
          v-model="matterForm.description"
          label="Description"
          placeholder="Brief description of the matter..."
          rows="3"
        />
        
        <div class="grid grid-cols-2 gap-4">
          <UiSelect
            v-model="matterForm.status"
            label="Status"
            required
          >
            <option value="OPEN">Open</option>
            <option value="PENDING">Pending</option>
            <option value="CLOSED">Closed</option>
          </UiSelect>
          
          <UiInput
            v-model="matterForm.contractDate"
            label="Contract Date"
            type="date"
          />
        </div>

        <!-- Services Section (Only when editing) -->
        <div v-if="editingMatter" class="border-t pt-4 mt-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium text-gray-900">Associated Services</h3>
                <UiButton size="sm" variant="secondary" @click="showAddService = true" type="button">
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
                <div v-for="service in services" :key="service.id" class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                        <div class="font-medium text-gray-900">{{ service.name }}</div>
                        <div class="text-xs text-gray-500">{{ formatPrice(service.fee) }} • {{ service.status }}</div>
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
        </div>
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
const newServiceForm = ref({
    catalogId: ''
})

const matterForm = ref({
  title: '',
  clientId: '',
  matterNumber: '',
  description: '',
  status: 'OPEN',
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
    const response = await $fetch<any[]>('/api/catalog')
    catalog.value = response
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
    if (!newServiceForm.value.catalogId || !editingMatter.value) return
    
    addingService.value = true
    try {
        await $fetch(`/api/matters/${editingMatter.value.id}/services`, {
            method: 'POST',
            body: { catalogId: newServiceForm.value.catalogId }
        })
        await fetchMatterServices(editingMatter.value.id)
        showAddService.value = false
        newServiceForm.value.catalogId = ''
    } catch (error) {
        console.error('Failed to add service:', error)
        alert('Failed to add service')
    } finally {
        addingService.value = false
    }
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
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
    matterNumber: matter.matterNumber || '',
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
      await $fetch(`/api/matters/${editingMatter.value.id}`, {
        method: 'PUT',
        body: payload
      })
    } else {
      await $fetch('/api/matters', {
        method: 'POST',
        body: payload
      })
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
  matterForm.value = {
    title: '',
    clientId: '',
    matterNumber: '',
    description: '',
    status: 'OPEN',
    contractDate: ''
  }
}

onMounted(async () => {
  await Promise.all([fetchMatters(), fetchClients(), fetchCatalog()])
})
</script>
