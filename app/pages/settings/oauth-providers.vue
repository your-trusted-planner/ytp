<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">OAuth Providers</h1>
        <p class="text-gray-600 mt-1">Enable authentication providers for user sign-in</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading providers...</p>
    </div>

    <template v-else>
      <!-- Well-Known Providers Section -->
      <UiCard>
        <template #header>
          <h2 class="text-lg font-semibold text-gray-900">Standard Providers</h2>
          <p class="text-sm text-gray-600 mt-1">
            Toggle providers on or off. Make sure each provider is configured in your
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-burgundy-600 hover:text-burgundy-800 underline"
            >Firebase Console</a>
            before enabling.
          </p>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="providerId in wellKnownProviderIds"
            :key="providerId"
            class="border rounded-lg p-4 transition-all"
            :class="isProviderEnabled(providerId) ? 'border-burgundy-200 bg-burgundy-50' : 'border-gray-200 bg-white'"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-white border border-gray-200">
                  <img
                    :src="getPreset(providerId).logoUrl"
                    :alt="getPreset(providerId).name"
                    class="h-6 w-6 object-contain"
                  />
                </div>
                <div>
                  <h3 class="font-medium text-gray-900">{{ getPreset(providerId).name }}</h3>
                  <p class="text-xs text-gray-500">{{ providerId }}</p>
                </div>
              </div>
              <UiToggle
                :model-value="isProviderEnabled(providerId)"
                @update:model-value="toggleProvider(providerId, $event)"
                :disabled="togglingProvider === providerId"
              />
            </div>
            <p class="mt-3 text-sm text-gray-600">{{ getPreset(providerId).description }}</p>
            <div v-if="isProviderEnabled(providerId)" class="mt-3 pt-3 border-t border-gray-200">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">Display Order</span>
                <div class="flex items-center space-x-2">
                  <button
                    @click="changeDisplayOrder(providerId, -1)"
                    class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    :disabled="getProviderDisplayOrder(providerId) <= 0"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <span class="w-6 text-center font-medium">{{ getProviderDisplayOrder(providerId) }}</span>
                  <button
                    @click="changeDisplayOrder(providerId, 1)"
                    class="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Custom Providers Section -->
      <UiCard>
        <template #header>
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Custom Providers</h2>
              <p class="text-sm text-gray-600 mt-1">
                Add custom OIDC or SAML providers not listed above
              </p>
            </div>
            <UiButton size="sm" @click="openCreateModal">
              Add Custom Provider
            </UiButton>
          </div>
        </template>

        <div v-if="customProviders.length === 0" class="text-center py-8">
          <p class="text-gray-500">No custom providers configured</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="provider in customProviders" :key="provider.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div v-if="provider.logoUrl" class="flex-shrink-0 h-8 w-8 mr-3">
                      <img :src="provider.logoUrl" :alt="provider.name" class="h-8 w-8 object-contain" />
                    </div>
                    <div
                      v-else
                      class="flex-shrink-0 h-8 w-8 mr-3 rounded flex items-center justify-center text-white text-sm font-bold"
                      :style="{ backgroundColor: provider.buttonColor }"
                    >
                      {{ provider.name.charAt(0) }}
                    </div>
                    <div class="text-sm font-medium text-gray-900">{{ provider.name }}</div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-600 font-mono">{{ provider.providerId }}</div>
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
    </template>

    <!-- Create/Edit Custom Provider Modal -->
    <UiModal v-model="showEditModal" :title="editingProvider ? 'Edit Custom Provider' : 'Add Custom Provider'" size="lg">
      <form @submit.prevent="handleSaveProvider" class="space-y-4">
        <UiInput
          v-model="providerForm.providerId"
          label="Provider ID"
          placeholder="e.g., oidc.example-idp"
          required
          :disabled="!!editingProvider"
        />
        <p class="text-sm text-gray-600 -mt-2">
          The provider identifier from your identity provider. For OIDC providers, use "oidc." prefix.
          <a
            href="https://firebase.google.com/docs/auth/configure-oauth-rest-api#add-idp"
            target="_blank"
            rel="noopener noreferrer"
            class="text-burgundy-600 hover:text-burgundy-800 underline"
          >
            View supported providers
          </a>
        </p>

        <UiInput
          v-model="providerForm.name"
          label="Display Name"
          placeholder="e.g., Corporate SSO"
          required
        />

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Logo URL (optional)</label>
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
            <strong>Note:</strong> Custom OIDC/SAML providers must be configured in your Firebase Console before enabling here.
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
import { OAUTH_PROVIDER_PRESETS, WELL_KNOWN_PROVIDER_IDS, isWellKnownProvider } from '@@/shared/oauth-providers'
import type { OAuthProviderPreset } from '@@/shared/oauth-providers'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

interface OAuthProvider {
  id: string
  providerId: string
  name: string
  logoUrl: string | null
  buttonColor: string
  isEnabled: boolean
  displayOrder: number
}

const providers = ref<OAuthProvider[]>([])
const loading = ref(true)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const saving = ref(false)
const deleting = ref(false)
const togglingProvider = ref<string | null>(null)
const editingProvider = ref<OAuthProvider | null>(null)
const deletingProvider = ref<OAuthProvider | null>(null)

// Well-known provider IDs for display
const wellKnownProviderIds = WELL_KNOWN_PROVIDER_IDS

// Get preset for a well-known provider
function getPreset(providerId: string): OAuthProviderPreset {
  return OAUTH_PROVIDER_PRESETS[providerId]
}

// Get provider from database by providerId
function getProviderByProviderId(providerId: string): OAuthProvider | undefined {
  return providers.value.find(p => p.providerId === providerId)
}

// Check if a provider is enabled
function isProviderEnabled(providerId: string): boolean {
  const provider = getProviderByProviderId(providerId)
  return provider?.isEnabled ?? false
}

// Get display order for a provider
function getProviderDisplayOrder(providerId: string): number {
  const provider = getProviderByProviderId(providerId)
  return provider?.displayOrder ?? 0
}

// Custom providers (not in well-known list)
const customProviders = computed(() => {
  return providers.value.filter(p => !isWellKnownProvider(p.providerId))
})

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
    const response = await $fetch<{ providers: OAuthProvider[] }>('/api/oauth-providers')
    providers.value = response.providers || []
  } catch (error) {
    console.error('Failed to fetch providers:', error)
  } finally {
    loading.value = false
  }
}

// Toggle a well-known provider on/off
async function toggleProvider(providerId: string, enabled: boolean) {
  const existingProvider = getProviderByProviderId(providerId)
  togglingProvider.value = providerId

  try {
    if (existingProvider) {
      // Update existing provider
      await $fetch(`/api/oauth-providers/${existingProvider.id}`, {
        method: 'PUT',
        body: { isEnabled: enabled }
      })
    } else if (enabled) {
      // Create new provider with preset values
      const preset = getPreset(providerId)
      const maxOrder = Math.max(0, ...providers.value.map(p => p.displayOrder))
      await $fetch('/api/oauth-providers', {
        method: 'POST',
        body: {
          providerId: preset.providerId,
          name: preset.name,
          logoUrl: preset.logoUrl,
          buttonColor: preset.buttonColor,
          isEnabled: true,
          displayOrder: maxOrder + 1
        }
      })
    }
    await fetchProviders()
  } catch (error: any) {
    console.error('Failed to toggle provider:', error)
    alert(error.data?.message || 'Failed to toggle provider')
  } finally {
    togglingProvider.value = null
  }
}

// Change display order for a provider
async function changeDisplayOrder(providerId: string, delta: number) {
  const provider = getProviderByProviderId(providerId)
  if (!provider) return

  const newOrder = Math.max(0, provider.displayOrder + delta)

  try {
    await $fetch(`/api/oauth-providers/${provider.id}`, {
      method: 'PUT',
      body: { displayOrder: newOrder }
    })
    await fetchProviders()
  } catch (error: any) {
    console.error('Failed to update display order:', error)
  }
}

function openCreateModal() {
  editingProvider.value = null
  const maxOrder = Math.max(0, ...providers.value.map(p => p.displayOrder))
  providerForm.value = {
    providerId: '',
    name: '',
    logoUrl: '',
    buttonColor: '#4285F4',
    isEnabled: false,
    displayOrder: maxOrder + 1
  }
  showEditModal.value = true
}

function editProvider(provider: OAuthProvider) {
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
  // Prevent adding well-known providers through custom form
  if (!editingProvider.value && isWellKnownProvider(providerForm.value.providerId)) {
    alert('This is a standard provider. Please use the toggle above instead.')
    return
  }

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

function confirmDelete(provider: OAuthProvider) {
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
