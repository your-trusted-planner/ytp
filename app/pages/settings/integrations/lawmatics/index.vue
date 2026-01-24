<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <NuxtLink
        to="/settings/integrations"
        class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <ArrowLeft class="w-5 h-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Lawmatics Integration</h1>
        <p class="text-gray-600 mt-1">Configure API connection and manage data imports</p>
      </div>
    </div>

    <!-- Connection Status Card -->
    <UiCard title="Connection Settings">
      <div class="space-y-6">
        <!-- Status Indicator -->
        <div class="flex items-center gap-3">
          <div
            :class="[
              'w-3 h-3 rounded-full',
              integration?.status === 'CONNECTED' ? 'bg-green-500' :
              integration?.status === 'ERROR' ? 'bg-red-500' : 'bg-gray-300'
            ]"
          />
          <span class="text-sm font-medium text-gray-700">
            {{ statusText }}
          </span>
          <span v-if="integration?.lastTestedAt" class="text-xs text-gray-500">
            (Last tested: {{ formatDate(integration.lastTestedAt) }})
          </span>
        </div>

        <!-- API Key Input -->
        <div class="max-w-md">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <div class="flex gap-2">
            <input
              v-model="apiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="Enter your Lawmatics API key"
              class="flex-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 sm:text-sm"
            />
            <button
              type="button"
              @click="showApiKey = !showApiKey"
              class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <Eye v-if="!showApiKey" class="w-5 h-5" />
              <EyeOff v-else class="w-5 h-5" />
            </button>
          </div>
          <p class="mt-1 text-xs text-gray-500">
            Find your API key in Lawmatics under Settings &rarr; Integrations &rarr; API
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3">
          <UiButton
            @click="saveCredentials"
            :is-loading="saving"
            :disabled="!apiKey"
          >
            Save Credentials
          </UiButton>
          <UiButton
            variant="outline"
            @click="testConnection"
            :is-loading="testing"
            :disabled="!integration?.id"
          >
            Test Connection
          </UiButton>
        </div>

        <!-- Test Result -->
        <div v-if="testResult" :class="[
          'p-4 rounded-lg',
          testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        ]">
          <div class="flex items-start gap-3">
            <CheckCircle v-if="testResult.success" class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <XCircle v-else class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p :class="testResult.success ? 'text-green-800' : 'text-red-800'" class="font-medium">
                {{ testResult.success ? 'Connection successful!' : 'Connection failed' }}
              </p>
              <p v-if="testResult.error" class="text-sm text-red-700 mt-1">
                {{ testResult.error }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Data Migration Card -->
    <UiCard v-if="integration?.status === 'CONNECTED'">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Data Migration</h3>
            <p class="text-sm text-gray-600 mt-1">Import data from Lawmatics into the system</p>
          </div>
          <NuxtLink to="/settings/integrations/lawmatics/migrate">
            <UiButton>
              <Upload class="w-4 h-4 mr-2" />
              Start Migration
            </UiButton>
          </NuxtLink>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div v-for="entity in entityStats" :key="entity.type" class="p-4 bg-gray-50 rounded-lg">
            <p class="text-2xl font-bold text-gray-900">{{ entity.count }}</p>
            <p class="text-sm text-gray-600">{{ entity.label }}</p>
          </div>
        </div>
        <p class="text-xs text-gray-500 text-center">
          Total records imported from Lawmatics
        </p>
      </div>
    </UiCard>

    <!-- Danger Zone -->
    <UiCard v-if="integration?.id" class="border-red-200">
      <template #header>
        <h3 class="text-lg font-semibold text-red-700">Danger Zone</h3>
      </template>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-700">Remove this integration</p>
          <p class="text-xs text-gray-500">This will delete the stored credentials. Imported data will not be affected.</p>
        </div>
        <UiButton variant="danger" @click="deleteIntegration" :is-loading="deleting">
          Delete Integration
        </UiButton>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Eye, EyeOff, CheckCircle, XCircle, Upload } from 'lucide-vue-next'

const toast = useToast()

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

interface Integration {
  id: string
  type: string
  name: string
  status: 'CONFIGURED' | 'CONNECTED' | 'ERROR'
  lastTestedAt: string | null
  lastSyncTimestamps: Record<string, string> | null
}

const integration = ref<Integration | null>(null)
const apiKey = ref('')
const showApiKey = ref(false)
const saving = ref(false)
const testing = ref(false)
const deleting = ref(false)
const testResult = ref<{ success: boolean; error?: string } | null>(null)

const entityStats = ref([
  { type: 'users', label: 'Users', count: 0 },
  { type: 'clients', label: 'Clients', count: 0 },
  { type: 'matters', label: 'Matters', count: 0 },
  { type: 'notes', label: 'Notes', count: 0 },
  { type: 'activities', label: 'Activities', count: 0 }
])

const statusText = computed(() => {
  if (!integration.value) return 'Not configured'
  switch (integration.value.status) {
    case 'CONNECTED': return 'Connected'
    case 'CONFIGURED': return 'Credentials saved (not tested)'
    case 'ERROR': return 'Connection error'
    default: return 'Pending configuration'
  }
})

// Fetch existing integration
onMounted(async () => {
  await loadIntegration()
})

async function loadIntegration() {
  try {
    const { integrations } = await $fetch<{ integrations: Integration[] }>('/api/admin/integrations')
    integration.value = integrations.find(i => i.type === 'LAWMATICS') || null

    // Don't show the actual key, just indicate one is set
    // If integration exists, credentials are stored in KV
    if (integration.value?.id) {
      apiKey.value = '••••••••••••••••'
    }
  } catch {
    // Integration not found or no access
  }
}

async function saveCredentials() {
  if (!apiKey.value || apiKey.value.startsWith('•')) return

  saving.value = true
  testResult.value = null

  try {
    if (integration.value?.id) {
      // Update existing
      await $fetch(`/api/admin/integrations/${integration.value.id}`, {
        method: 'PUT',
        body: { accessToken: apiKey.value }
      })
    } else {
      // Create new
      const result = await $fetch<{ integration: Integration }>('/api/admin/integrations', {
        method: 'POST',
        body: {
          type: 'LAWMATICS',
          name: 'Lawmatics',
          accessToken: apiKey.value
        }
      })
      integration.value = result.integration
    }

    apiKey.value = '••••••••••••••••'
    await loadIntegration()
    toast.success('Credentials saved successfully')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to save credentials')
    testResult.value = {
      success: false,
      error: error.data?.message || 'Failed to save credentials'
    }
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  if (!integration.value?.id) return

  testing.value = true
  testResult.value = null

  try {
    const result = await $fetch<{ success: boolean; error?: string }>(
      `/api/admin/integrations/${integration.value.id}/test`,
      { method: 'POST' }
    )
    testResult.value = result
    await loadIntegration()
    if (result.success) {
      toast.success('Connection test successful!')
    } else {
      toast.error(result.error || 'Connection test failed')
    }
  } catch (error: any) {
    toast.error(error.data?.message || 'Test failed')
    testResult.value = {
      success: false,
      error: error.data?.message || 'Test failed'
    }
  } finally {
    testing.value = false
  }
}

async function deleteIntegration() {
  if (!integration.value?.id) return
  if (!confirm('Are you sure you want to delete this integration? This cannot be undone.')) return

  deleting.value = true
  try {
    await $fetch(`/api/admin/integrations/${integration.value.id}`, {
      method: 'DELETE'
    })
    integration.value = null
    apiKey.value = ''
    toast.success('Integration deleted')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to delete integration')
  } finally {
    deleting.value = false
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
</script>
