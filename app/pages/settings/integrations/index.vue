<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Integrations</h1>
      <p class="text-gray-600 mt-1">Manage external service integrations and data imports</p>
    </div>

    <div class="grid gap-6">
      <!-- Lawmatics Integration Card -->
      <UiCard>
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Lawmatics</h3>
              <p class="text-sm text-gray-600 mt-1">
                Import clients, matters, notes, and activities from Lawmatics CRM
              </p>
              <div class="flex items-center gap-4 mt-3">
                <UiBadge v-if="lawmaticsStatus === 'connected'" variant="success">
                  Connected
                </UiBadge>
                <UiBadge v-else-if="lawmaticsStatus === 'error'" variant="danger">
                  Connection Error
                </UiBadge>
                <UiBadge v-else variant="default">
                  Not Configured
                </UiBadge>
                <span v-if="lawmaticsLastSync" class="text-xs text-gray-500">
                  Last sync: {{ formatDate(lawmaticsLastSync) }}
                </span>
              </div>
            </div>
          </div>
          <NuxtLink
            to="/settings/integrations/lawmatics"
            class="px-4 py-2 text-sm font-medium text-burgundy-600 hover:text-burgundy-700 hover:bg-burgundy-50 rounded-lg transition-colors"
          >
            Manage
          </NuxtLink>
        </div>
      </UiCard>

      <!-- Resend Integration Card -->
      <UiCard>
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Mail class="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Resend</h3>
              <p class="text-sm text-gray-600 mt-1">
                Email delivery service for password resets and notifications
              </p>
              <div class="flex items-center gap-4 mt-3">
                <UiBadge v-if="resendStatus === 'connected'" variant="success">
                  Connected
                </UiBadge>
                <UiBadge v-else-if="resendStatus === 'error'" variant="danger">
                  Connection Error
                </UiBadge>
                <UiBadge v-else variant="default">
                  Not Configured
                </UiBadge>
                <span v-if="resendLastTested" class="text-xs text-gray-500">
                  Last tested: {{ formatDate(resendLastTested) }}
                </span>
              </div>
            </div>
          </div>
          <button
            @click="showResendModal = true"
            class="px-4 py-2 text-sm font-medium text-burgundy-600 hover:text-burgundy-700 hover:bg-burgundy-50 rounded-lg transition-colors"
          >
            Configure
          </button>
        </div>
      </UiCard>

      <!-- Placeholder for future integrations -->
      <UiCard class="opacity-60">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Cloud class="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-500">More Integrations</h3>
              <p class="text-sm text-gray-400 mt-1">
                Additional integrations coming soon
              </p>
            </div>
          </div>
          <span class="px-3 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full">
            Coming Soon
          </span>
        </div>
      </UiCard>
    </div>

    <!-- Resend Configuration Modal -->
    <UiModal v-model="showResendModal" title="Configure Resend">
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Enter your Resend API key to enable email delivery. Get your API key from
          <a href="https://resend.com/api-keys" target="_blank" class="text-burgundy-600 hover:underline">resend.com/api-keys</a>.
        </p>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <div class="flex gap-2">
            <input
              v-model="resendApiKey"
              :type="showResendApiKey ? 'text' : 'password'"
              placeholder="re_..."
              class="flex-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 sm:text-sm"
            />
            <button
              type="button"
              @click="showResendApiKey = !showResendApiKey"
              class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <Eye v-if="!showResendApiKey" class="w-5 h-5" />
              <EyeOff v-else class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Test Result -->
        <div v-if="resendTestResult" :class="[
          'p-4 rounded-lg',
          resendTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        ]">
          <div class="flex items-start gap-3">
            <CheckCircle v-if="resendTestResult.success" class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <XCircle v-else class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p :class="resendTestResult.success ? 'text-green-800' : 'text-red-800'" class="font-medium">
                {{ resendTestResult.success ? 'Connection successful!' : 'Connection failed' }}
              </p>
              <p v-if="resendTestResult.error" class="text-sm text-red-700 mt-1">
                {{ resendTestResult.error }}
              </p>
              <p v-if="resendTestResult.details?.domainCount !== undefined" class="text-sm text-green-700 mt-1">
                {{ resendTestResult.details.domainCount }} domain(s) configured
              </p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <UiButton
            v-if="resendIntegration?.id"
            variant="danger"
            @click="deleteResendIntegration"
            :is-loading="resendDeleting"
          >
            Delete
          </UiButton>
          <div v-else></div>
          <div class="flex gap-3">
            <UiButton variant="outline" @click="showResendModal = false">
              Cancel
            </UiButton>
            <UiButton
              v-if="resendIntegration?.id"
              variant="outline"
              @click="testResendConnection"
              :is-loading="resendTesting"
            >
              Test
            </UiButton>
            <UiButton
              @click="saveResendCredentials"
              :is-loading="resendSaving"
              :disabled="!resendApiKey || resendApiKey.startsWith('•')"
            >
              Save
            </UiButton>
          </div>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { Database, Cloud, Mail, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-vue-next'

const toast = useToast()

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

interface Integration {
  id: string
  type: string
  status: 'CONFIGURED' | 'CONNECTED' | 'ERROR'
  lastTestedAt: string | null
  lastSyncTimestamps: string | null
}

// Lawmatics state
const lawmaticsStatus = ref<'connected' | 'error' | 'not_configured'>('not_configured')
const lawmaticsLastSync = ref<string | null>(null)

// Resend state
const resendStatus = ref<'connected' | 'error' | 'not_configured'>('not_configured')
const resendLastTested = ref<string | null>(null)
const resendIntegration = ref<Integration | null>(null)
const showResendModal = ref(false)
const resendApiKey = ref('')
const showResendApiKey = ref(false)
const resendSaving = ref(false)
const resendTesting = ref(false)
const resendDeleting = ref(false)
const resendTestResult = ref<{ success: boolean; error?: string; details?: { domainCount?: number } } | null>(null)

// Fetch integration status
onMounted(async () => {
  await loadIntegrations()
})

async function loadIntegrations() {
  try {
    const { integrations } = await $fetch<{ integrations: Integration[] }>('/api/admin/integrations')

    // Lawmatics
    const lawmatics = integrations.find(i => i.type === 'LAWMATICS')
    if (lawmatics) {
      lawmaticsStatus.value = lawmatics.status === 'CONNECTED' ? 'connected' :
                              lawmatics.status === 'ERROR' ? 'error' : 'not_configured'
      if (lawmatics.lastSyncTimestamps) {
        const timestamps = JSON.parse(lawmatics.lastSyncTimestamps)
        const latest = Object.values(timestamps).sort().pop() as string | undefined
        lawmaticsLastSync.value = latest || null
      }
    }

    // Resend
    const resend = integrations.find(i => i.type === 'RESEND')
    if (resend) {
      resendIntegration.value = resend
      resendStatus.value = resend.status === 'CONNECTED' ? 'connected' :
                           resend.status === 'ERROR' ? 'error' : 'not_configured'
      resendLastTested.value = resend.lastTestedAt
      resendApiKey.value = '••••••••••••••••'
    }
  } catch {
    // User may not have access or integrations not set up
  }
}

async function saveResendCredentials() {
  if (!resendApiKey.value || resendApiKey.value.startsWith('•')) return

  resendSaving.value = true
  resendTestResult.value = null

  try {
    if (resendIntegration.value?.id) {
      // Update existing
      await $fetch(`/api/admin/integrations/${resendIntegration.value.id}`, {
        method: 'PUT',
        body: { accessToken: resendApiKey.value }
      })
    } else {
      // Create new
      const result = await $fetch<{ integration: Integration }>('/api/admin/integrations', {
        method: 'POST',
        body: {
          type: 'RESEND',
          name: 'Resend',
          accessToken: resendApiKey.value
        }
      })
      resendIntegration.value = result.integration
    }

    resendApiKey.value = '••••••••••••••••'
    await loadIntegrations()
    toast.success('Resend credentials saved')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to save credentials')
    resendTestResult.value = {
      success: false,
      error: error.data?.message || 'Failed to save credentials'
    }
  } finally {
    resendSaving.value = false
  }
}

async function testResendConnection() {
  if (!resendIntegration.value?.id) return

  resendTesting.value = true
  resendTestResult.value = null

  try {
    const result = await $fetch<{ success: boolean; error?: string; details?: { domainCount?: number } }>(
      `/api/admin/integrations/${resendIntegration.value.id}/test`,
      { method: 'POST' }
    )
    resendTestResult.value = result
    await loadIntegrations()
    if (result.success) {
      toast.success('Resend connection verified!')
    } else {
      toast.error(result.error || 'Connection test failed')
    }
  } catch (error: any) {
    toast.error(error.data?.message || 'Test failed')
    resendTestResult.value = {
      success: false,
      error: error.data?.message || 'Test failed'
    }
  } finally {
    resendTesting.value = false
  }
}

async function deleteResendIntegration() {
  if (!resendIntegration.value?.id) return
  if (!confirm('Are you sure you want to delete this integration?')) return

  resendDeleting.value = true
  try {
    await $fetch(`/api/admin/integrations/${resendIntegration.value.id}`, {
      method: 'DELETE'
    })
    resendIntegration.value = null
    resendApiKey.value = ''
    resendStatus.value = 'not_configured'
    resendLastTested.value = null
    resendTestResult.value = null
    showResendModal.value = false
    toast.success('Integration deleted')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to delete integration')
  } finally {
    resendDeleting.value = false
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
