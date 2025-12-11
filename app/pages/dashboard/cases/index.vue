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
const loading = ref(true)
const showAddModal = ref(false)
const saving = ref(false)
const editingMatter = ref<any>(null)

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

const editMatter = (matter: any) => {
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
  await Promise.all([fetchMatters(), fetchClients()])
})
</script>
