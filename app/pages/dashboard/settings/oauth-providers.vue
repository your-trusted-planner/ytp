<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">OAuth Providers</h1>
        <p class="text-gray-600 mt-1">Manage authentication providers for user sign-in</p>
      </div>
      <UiButton @click="openCreateModal">
        Add Provider
      </UiButton>
    </div>

    <!-- Providers List -->
    <UiCard>
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading providers...</p>
      </div>
      <div v-else-if="providers.length === 0" class="text-center py-12">
        <p class="text-gray-500">No providers configured</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Button Color</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="provider in providers" :key="provider.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div v-if="provider.logoUrl" class="flex-shrink-0 h-8 w-8 mr-3">
                    <img :src="provider.logoUrl" :alt="provider.name" class="h-8 w-8 object-contain" />
                  </div>
                  <div class="text-sm font-medium text-gray-900">{{ provider.name }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600 font-mono">{{ provider.providerId }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div
                    class="w-6 h-6 rounded border border-gray-300 mr-2"
                    :style="{ backgroundColor: provider.buttonColor }"
                  ></div>
                  <span class="text-sm text-gray-600 font-mono">{{ provider.buttonColor }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UiBadge :variant="provider.isEnabled ? 'success' : 'default'">
                  {{ provider.isEnabled ? 'Enabled' : 'Disabled' }}
                </UiBadge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ provider.displayOrder }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                <button
                  @click="editProvider(provider)"
                  class="text-burgundy-600 hover:text-burgundy-900"
                >
                  Edit
                </button>
                <button
                  @click="confirmDelete(provider)"
                  class="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <!-- Create/Edit Provider Modal -->
    <UiModal v-model="showEditModal" :title="editingProvider ? 'Edit Provider' : 'Add Provider'" size="lg">
      <form @submit.prevent="handleSaveProvider" class="space-y-4">
        <UiInput
          v-model="providerForm.providerId"
          label="Provider ID"
          placeholder="e.g., google.com, facebook.com"
          required
          :disabled="!!editingProvider"
        />
        <p class="text-sm text-gray-600 -mt-2">
          Firebase provider ID from Identity Platform.
          <a
            href="https://firebase.google.com/docs/auth/configure-oauth-rest-api#add-idp"
            target="_blank"
            rel="noopener noreferrer"
            class="text-burgundy-600 hover:text-burgundy-800 underline"
          >
            View supported providers →
          </a>
        </p>

        <UiInput
          v-model="providerForm.name"
          label="Display Name"
          placeholder="e.g., Google, Facebook"
          required
        />

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
          <UiInput
            v-model="providerForm.logoUrl"
            placeholder="https://... or data:image/..."
          />
          <p class="text-sm text-gray-600 mt-1">
            Image URL or data URI for the provider logo
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Button Color</label>
          <div class="flex items-center space-x-3">
            <input
              v-model="providerForm.buttonColor"
              type="color"
              class="h-10 w-20 rounded border border-gray-300 cursor-pointer"
            />
            <UiInput
              v-model="providerForm.buttonColor"
              placeholder="#4285F4"
              class="flex-1"
            />
          </div>
        </div>

        <UiInput
          v-model.number="providerForm.displayOrder"
          label="Display Order"
          type="number"
          required
        />

        <div class="flex items-center">
          <UiToggle
            v-model="providerForm.isEnabled"
            label="Enable this provider"
            description="Users will see this option on the login page"
          />
        </div>

        <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-800">
            <strong>Note:</strong> Make sure the provider is configured in your Firebase Console before enabling it here.
          </p>
        </div>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="showEditModal = false">
          Cancel
        </UiButton>
        <UiButton @click="handleSaveProvider" :is-loading="saving">
          {{ editingProvider ? 'Save Changes' : 'Add Provider' }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Delete Confirmation Modal -->
    <UiModal v-model="showDeleteModal" title="Delete Provider" size="sm">
      <div class="space-y-4">
        <p class="text-gray-700">
          Are you sure you want to delete <strong>{{ deletingProvider?.name }}</strong>?
        </p>
        <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-800">
            <strong>Warning:</strong> Users will no longer be able to sign in with this provider.
          </p>
        </div>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="showDeleteModal = false">
          Cancel
        </UiButton>
        <UiButton variant="danger" @click="handleDeleteProvider" :is-loading="deleting">
          Delete Provider
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const providers = ref<any[]>([])
const loading = ref(true)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const saving = ref(false)
const deleting = ref(false)
const editingProvider = ref<any>(null)
const deletingProvider = ref<any>(null)

const providerForm = ref({
  providerId: '',
  name: '',
  logoUrl: '',
  buttonColor: '#4285F4',
  isEnabled: false,
  displayOrder: 0
})

async function fetchProviders() {
  loading.value = true
  try {
    const response = await $fetch<{ providers: any[] }>('/api/oauth-providers')
    providers.value = response.providers || []
  } catch (error) {
    console.error('Failed to fetch providers:', error)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingProvider.value = null
  providerForm.value = {
    providerId: '',
    name: '',
    logoUrl: '',
    buttonColor: '#4285F4',
    isEnabled: false,
    displayOrder: providers.value.length
  }
  showEditModal.value = true
}

function editProvider(provider: any) {
  editingProvider.value = provider
  providerForm.value = {
    providerId: provider.providerId,
    name: provider.name,
    logoUrl: provider.logoUrl || '',
    buttonColor: provider.buttonColor,
    isEnabled: provider.isEnabled,
    displayOrder: provider.displayOrder
  }
  showEditModal.value = true
}

async function handleSaveProvider() {
  saving.value = true
  try {
    if (editingProvider.value) {
      // Update existing provider
      await $fetch(`/api/oauth-providers/${editingProvider.value.id}`, {
        method: 'PUT',
        body: providerForm.value
      })
    } else {
      // Create new provider
      await $fetch('/api/oauth-providers', {
        method: 'POST',
        body: providerForm.value
      })
    }

    showEditModal.value = false
    await fetchProviders()
  } catch (error: any) {
    console.error('Failed to save provider:', error)
    alert(error.data?.message || 'Failed to save provider')
  } finally {
    saving.value = false
  }
}

function confirmDelete(provider: any) {
  deletingProvider.value = provider
  showDeleteModal.value = true
}

async function handleDeleteProvider() {
  if (!deletingProvider.value) return

  deleting.value = true
  try {
    await $fetch(`/api/oauth-providers/${deletingProvider.value.id}`, {
      method: 'DELETE'
    })

    showDeleteModal.value = false
    await fetchProviders()
  } catch (error: any) {
    console.error('Failed to delete provider:', error)
    alert(error.data?.message || 'Failed to delete provider')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchProviders()
})
</script>
