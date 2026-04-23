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
        <h1 class="text-2xl font-bold text-gray-900">
          Apollo Integration
        </h1>
        <p class="text-gray-600 mt-1">
          Sync contacts and marketing preferences with Apollo.io
        </p>
      </div>
    </div>

    <!-- Sync Status Card -->
    <UiCard v-if="integration?.status === 'CONNECTED'">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900">
          Sync Status
        </h3>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="p-3 bg-gray-50 rounded-lg text-center">
            <p class="text-sm font-medium text-gray-700">
              Last Contact Sync
            </p>
            <p class="text-sm text-gray-500 mt-1">
              {{ syncStatus?.lastContactSync ? formatDate(syncStatus.lastContactSync) : 'Never' }}
            </p>
          </div>
          <div class="p-3 bg-gray-50 rounded-lg text-center">
            <p class="text-sm font-medium text-gray-700">
              Last Opt-Out Check
            </p>
            <p class="text-sm text-gray-500 mt-1">
              {{ syncStatus?.lastOptOutSync ? formatDate(syncStatus.lastOptOutSync) : 'Never' }}
            </p>
          </div>
        </div>

        <!-- Sync Results -->
        <div
          v-if="lastSyncResult"
          :class="[
            'p-4 rounded-lg',
            lastSyncResult.errors?.length ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'
          ]"
        >
          <p
            class="font-medium"
            :class="lastSyncResult.errors?.length ? 'text-amber-800' : 'text-green-800'"
          >
            {{ lastSyncResult.type === 'contacts' ? 'Contact Sync' : 'Opt-Out Sync' }} Complete
          </p>
          <div
            class="mt-2 text-sm"
            :class="lastSyncResult.errors?.length ? 'text-amber-700' : 'text-green-700'"
          >
            <template v-if="lastSyncResult.type === 'contacts'">
              <span>{{ lastSyncResult.created }} created, {{ lastSyncResult.updated }} updated, {{ lastSyncResult.skipped }} skipped</span>
            </template>
            <template v-else>
              <span>{{ lastSyncResult.checked }} checked, {{ lastSyncResult.newUnsubscribes }} new unsubscribes</span>
            </template>
            <span
              v-if="lastSyncResult.errors?.length"
              class="block mt-1"
            >
              {{ lastSyncResult.errors.length }} error(s)
            </span>
          </div>
        </div>

        <!-- Sync Buttons -->
        <div class="flex gap-3">
          <UiButton
            :is-loading="syncingContacts"
            @click="runContactSync"
          >
            <RefreshCw class="w-4 h-4 mr-2" />
            Sync Contacts to Apollo
          </UiButton>
          <UiButton
            variant="outline"
            :is-loading="syncingOptOuts"
            @click="runOptOutSync"
          >
            <Download class="w-4 h-4 mr-2" />
            Check Opt-Outs
          </UiButton>
        </div>

        <!-- Sync Scope -->
        <div class="flex items-center gap-2">
          <input
            id="clients-only"
            v-model="syncClientsOnly"
            type="checkbox"
            class="rounded border-gray-300 text-accent-600 focus:ring-accent-500"
          >
          <label
            for="clients-only"
            class="text-sm text-gray-700"
          >
            Only sync clients (skip other people records)
          </label>
        </div>
      </div>
    </UiCard>

    <!-- Connection Settings Card -->
    <UiCard title="Connection Settings">
      <div class="space-y-6">
        <!-- Status Indicator -->
        <div class="flex items-center gap-3">
          <div
            :class="[
              'w-3 h-3 rounded-full',
              integration?.status === 'CONNECTED' ? 'bg-green-500'
              : integration?.status === 'ERROR' ? 'bg-red-500' : 'bg-gray-300'
            ]"
          />
          <span class="text-sm font-medium text-gray-700">
            {{ statusText }}
          </span>
          <span
            v-if="integration?.lastTestedAt"
            class="text-xs text-gray-500"
          >
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
              placeholder="Enter your Apollo API key"
              class="flex-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 sm:text-sm"
            >
            <button
              type="button"
              class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              @click="showApiKey = !showApiKey"
            >
              <Eye
                v-if="!showApiKey"
                class="w-5 h-5"
              />
              <EyeOff
                v-else
                class="w-5 h-5"
              />
            </button>
          </div>
          <p class="mt-1 text-xs text-gray-500">
            Find your API key in Apollo under Settings &rarr; Integrations &rarr; API Access
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3">
          <UiButton
            :is-loading="saving"
            :disabled="!apiKey"
            @click="saveCredentials"
          >
            Save Credentials
          </UiButton>
          <UiButton
            variant="outline"
            :is-loading="testing"
            :disabled="!integration?.id"
            @click="testConnection"
          >
            Test Connection
          </UiButton>
        </div>

        <!-- Test Result -->
        <div
          v-if="testResult"
          :class="[
            'p-4 rounded-lg',
            testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          ]"
        >
          <div class="flex items-start gap-3">
            <CheckCircle
              v-if="testResult.success"
              class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
            />
            <XCircle
              v-else
              class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
            />
            <div>
              <p
                :class="testResult.success ? 'text-green-800' : 'text-red-800'"
                class="font-medium"
              >
                {{ testResult.success ? 'Connection successful!' : 'Connection failed' }}
              </p>
              <p
                v-if="testResult.error"
                class="text-sm text-red-700 mt-1"
              >
                {{ testResult.error }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Danger Zone -->
    <UiCard
      v-if="integration?.id"
      class="border-red-200"
    >
      <template #header>
        <h3 class="text-lg font-semibold text-red-700">
          Danger Zone
        </h3>
      </template>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-700">
            Remove this integration
          </p>
          <p class="text-xs text-gray-500">
            This will delete the stored credentials.
          </p>
        </div>
        <UiButton
          variant="danger"
          :is-loading="deleting"
          @click="showDeleteDialog = true"
        >
          Delete Integration
        </UiButton>
      </div>
    </UiCard>
  </div>

  <UiConfirmDialog
    v-model="showDeleteDialog"
    title="Delete Integration"
    message="Are you sure you want to delete this integration? This cannot be undone."
    confirm-text="Delete"
    variant="danger"
    :loading="deleting"
    @confirm="deleteIntegration"
    @cancel="showDeleteDialog = false"
  />
</template>

<script setup lang="ts">
import { ArrowLeft, Eye, EyeOff, CheckCircle, XCircle, RefreshCw, Download } from 'lucide-vue-next'

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
  settings?: Record<string, any> | null
}

interface SyncStatusData {
  configured: boolean
  status: string | null
  lastTestedAt: string | null
  lastContactSync: string | null
  lastOptOutSync: string | null
}

const integration = ref<Integration | null>(null)
const apiKey = ref('')
const showApiKey = ref(false)
const saving = ref(false)
const testing = ref(false)
const deleting = ref(false)
const showDeleteDialog = ref(false)
const testResult = ref<{ success: boolean, error?: string } | null>(null)

// Sync state
const syncStatus = ref<SyncStatusData | null>(null)
const syncingContacts = ref(false)
const syncingOptOuts = ref(false)
const syncClientsOnly = ref(false)
const lastSyncResult = ref<{
  type: 'contacts' | 'optouts'
  created?: number
  updated?: number
  skipped?: number
  checked?: number
  newUnsubscribes?: number
  errors?: Array<{ personId: string, error: string }>
} | null>(null)

const statusText = computed(() => {
  if (!integration.value) return 'Not configured'
  switch (integration.value.status) {
    case 'CONNECTED': return 'Connected'
    case 'CONFIGURED': return 'Credentials saved (not tested)'
    case 'ERROR': return 'Connection error'
    default: return 'Pending configuration'
  }
})

onMounted(async () => {
  await loadIntegration()
  await loadSyncStatus()
})

async function loadIntegration() {
  try {
    const { integrations } = await $fetch<{ integrations: Integration[] }>('/api/admin/integrations')
    integration.value = integrations.find(i => i.type === 'APOLLO') || null

    if (integration.value?.id) {
      apiKey.value = '••••••••••••••••'
    }
  }
  catch {
    // Integration not found or no access
  }
}

async function loadSyncStatus() {
  try {
    syncStatus.value = await $fetch<SyncStatusData>('/api/admin/integrations/apollo/sync-status')
  }
  catch {
    // Status not available
  }
}

async function saveCredentials() {
  if (!apiKey.value || apiKey.value.startsWith('•')) return

  saving.value = true
  testResult.value = null

  try {
    if (integration.value?.id) {
      await $fetch(`/api/admin/integrations/${integration.value.id}`, {
        method: 'PUT',
        body: { accessToken: apiKey.value }
      })
    }
    else {
      const result = await $fetch<{ integration: Integration }>('/api/admin/integrations', {
        method: 'POST',
        body: {
          type: 'APOLLO',
          name: 'Apollo',
          accessToken: apiKey.value
        }
      })
      integration.value = result.integration
    }

    apiKey.value = '••••••••••••••••'
    await loadIntegration()
    toast.success('Credentials saved successfully')
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Failed to save credentials')
    testResult.value = {
      success: false,
      error: error.data?.message || 'Failed to save credentials'
    }
  }
  finally {
    saving.value = false
  }
}

async function testConnection() {
  if (!integration.value?.id) return

  testing.value = true
  testResult.value = null

  try {
    const result = await $fetch<{ success: boolean, error?: string }>(
      `/api/admin/integrations/${integration.value.id}/test`,
      { method: 'POST' }
    )
    testResult.value = result
    await loadIntegration()
    if (result.success) {
      toast.success('Connection test successful!')
    }
    else {
      toast.error(result.error || 'Connection test failed')
    }
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Test failed')
    testResult.value = {
      success: false,
      error: error.data?.message || 'Test failed'
    }
  }
  finally {
    testing.value = false
  }
}

async function runContactSync() {
  syncingContacts.value = true
  lastSyncResult.value = null

  try {
    const result = await $fetch<{
      success: boolean
      created: number
      updated: number
      skipped: number
      errors: Array<{ personId: string, error: string }>
    }>('/api/admin/integrations/apollo/sync-contacts', {
      method: 'POST',
      body: { clientsOnly: syncClientsOnly.value }
    })

    lastSyncResult.value = {
      type: 'contacts',
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors
    }

    await loadSyncStatus()

    if (result.errors.length === 0) {
      toast.success(`Synced ${result.created + result.updated} contacts to Apollo`)
    }
    else {
      toast.warning(`Synced with ${result.errors.length} error(s)`)
    }
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Contact sync failed')
  }
  finally {
    syncingContacts.value = false
  }
}

async function runOptOutSync() {
  syncingOptOuts.value = true
  lastSyncResult.value = null

  try {
    const result = await $fetch<{
      success: boolean
      checked: number
      newUnsubscribes: number
      errors: Array<{ personId: string, error: string }>
    }>('/api/admin/integrations/apollo/sync-optouts', {
      method: 'POST'
    })

    lastSyncResult.value = {
      type: 'optouts',
      checked: result.checked,
      newUnsubscribes: result.newUnsubscribes,
      errors: result.errors
    }

    await loadSyncStatus()

    if (result.newUnsubscribes > 0) {
      toast.info(`${result.newUnsubscribes} new opt-out(s) applied`)
    }
    else {
      toast.success('No new opt-outs found')
    }
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Opt-out sync failed')
  }
  finally {
    syncingOptOuts.value = false
  }
}

async function deleteIntegration() {
  if (!integration.value?.id) return

  deleting.value = true
  try {
    await $fetch(`/api/admin/integrations/${integration.value.id}`, {
      method: 'DELETE'
    })
    integration.value = null
    apiKey.value = ''
    showDeleteDialog.value = false
    toast.success('Integration deleted')
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Failed to delete integration')
  }
  finally {
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
