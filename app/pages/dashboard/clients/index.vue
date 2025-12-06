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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="client in clients" :key="client.id" class="hover:bg-gray-50">
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
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const clients = ref<any[]>([])
const loading = ref(true)
const showAddModal = ref(false)
const saving = ref(false)

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
    clients.value = await $fetch('/api/clients')
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

onMounted(() => {
  fetchClients()
})
</script>

