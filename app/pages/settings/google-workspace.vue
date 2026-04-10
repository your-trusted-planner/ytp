<template>
  <div class="space-y-6">
    <!-- Back link -->
    <NuxtLink
      to="/settings"
      class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
    >
      <ArrowLeft class="w-4 h-4 mr-1" />
      Back to Settings
    </NuxtLink>

    <div class="flex items-start gap-4">
      <div class="p-3 bg-blue-50 rounded-lg">
        <Building2 class="w-8 h-8 text-blue-600" />
      </div>
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          Google Workspace
        </h1>
        <p class="text-gray-600 mt-1">
          Service account, Drive sync, and Calendar integration
        </p>
      </div>
    </div>

    <!-- Status Overview -->
    <div class="grid grid-cols-3 gap-4">
      <div
        class="p-4 border rounded-lg"
        :class="status?.serviceAccount?.configured ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'"
      >
        <div class="flex items-center gap-2 mb-1">
          <KeyRound
            class="w-4 h-4"
            :class="status?.serviceAccount?.configured ? 'text-green-600' : 'text-yellow-600'"
          />
          <span
            class="text-sm font-medium"
            :class="status?.serviceAccount?.configured ? 'text-green-800' : 'text-yellow-800'"
          >
            Service Account
          </span>
        </div>
        <p
          class="text-xs"
          :class="status?.serviceAccount?.configured ? 'text-green-600' : 'text-yellow-600'"
        >
          {{ status?.serviceAccount?.configured ? 'Configured' : 'Not configured' }}
        </p>
      </div>
      <div
        class="p-4 border rounded-lg"
        :class="status?.drive?.configured ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'"
      >
        <div class="flex items-center gap-2 mb-1">
          <HardDrive
            class="w-4 h-4"
            :class="status?.drive?.configured ? 'text-green-600' : 'text-gray-400'"
          />
          <span
            class="text-sm font-medium"
            :class="status?.drive?.configured ? 'text-green-800' : 'text-gray-600'"
          >
            Drive
          </span>
        </div>
        <p
          class="text-xs"
          :class="status?.drive?.configured ? 'text-green-600' : 'text-gray-500'"
        >
          {{ status?.drive?.enabled ? 'Enabled' : status?.drive?.configured ? 'Configured (disabled)' : 'Not configured' }}
        </p>
      </div>
      <div
        class="p-4 border rounded-lg"
        :class="status?.calendar?.configured ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'"
      >
        <div class="flex items-center gap-2 mb-1">
          <Calendar
            class="w-4 h-4"
            :class="status?.calendar?.configured ? 'text-green-600' : 'text-gray-400'"
          />
          <span
            class="text-sm font-medium"
            :class="status?.calendar?.configured ? 'text-green-800' : 'text-gray-600'"
          >
            Calendar
          </span>
        </div>
        <p
          class="text-xs"
          :class="status?.calendar?.configured ? 'text-green-600' : 'text-gray-500'"
        >
          {{ status?.calendar?.activeCalendars ? `${status.calendar.activeCalendars} active calendar(s)` : 'No calendars' }}
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-6">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="py-3 px-1 border-b-2 text-sm font-medium transition-colors"
          :class="activeTab === tab.id
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          @click="activeTab = tab.id"
        >
          <component
            :is="tab.icon"
            class="w-4 h-4 inline mr-1.5"
          />
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Tab: Service Account -->
    <div v-if="activeTab === 'service-account'">
      <UiCard>
        <template #header>
          <h2 class="text-lg font-semibold text-gray-900">
            Service Account Credentials
          </h2>
          <p class="text-sm text-gray-600 mt-1">
            These credentials are shared by Drive and Calendar integrations.
            Configure domain-wide delegation in Google Workspace Admin.
          </p>
        </template>

        <div
          v-if="loadingConfig"
          class="text-center py-8"
        >
          <p class="text-gray-500">
            Loading...
          </p>
        </div>

        <form
          v-else
          class="space-y-4"
          @submit.prevent="saveServiceAccount"
        >
          <UiInput
            v-model="saForm.serviceAccountEmail"
            label="Service Account Email"
            placeholder="service-account@project.iam.gserviceaccount.com"
            required
          />

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Private Key
            </label>
            <textarea
              v-model="saForm.serviceAccountPrivateKey"
              rows="4"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
            />
            <p class="text-sm text-gray-500 mt-1">
              <template v-if="driveConfig?.hasPrivateKey">
                Key is configured. Leave empty to keep existing key.
              </template>
              <template v-else>
                Paste the private key from your service account JSON file.
              </template>
            </p>
          </div>

          <div class="flex items-center justify-between pt-4 border-t">
            <UiButton
              variant="outline"
              :disabled="testingSA"
              @click="testServiceAccount"
            >
              <RefreshCw class="w-4 h-4 mr-1" />
              {{ testingSA ? 'Testing...' : 'Test Connection' }}
            </UiButton>
            <UiButton
              type="submit"
              :disabled="savingSA"
            >
              {{ savingSA ? 'Saving...' : 'Save Credentials' }}
            </UiButton>
          </div>
        </form>

        <div
          v-if="saTestResult"
          class="mt-4 p-3 rounded-lg"
          :class="saTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'"
        >
          <p
            :class="saTestResult.success ? 'text-green-800' : 'text-red-800'"
            class="text-sm"
          >
            {{ saTestResult.success ? 'Connection successful.' : saTestResult.error }}
          </p>
        </div>
      </UiCard>

      <!-- Setup Instructions -->
      <UiCard class="mt-6">
        <template #header>
          <h2 class="text-lg font-semibold text-gray-900">
            Setup Instructions
          </h2>
        </template>
        <ol class="space-y-2 text-sm text-gray-600 list-decimal list-inside">
          <li>Create a Service Account in Google Cloud Console</li>
          <li>Enable the Google Drive API and Google Calendar API</li>
          <li>Download the JSON key file</li>
          <li>Enable domain-wide delegation for the service account</li>
          <li>
            In Google Workspace Admin, authorize the service account with scopes:
            <code class="text-xs bg-gray-100 px-1 rounded">https://www.googleapis.com/auth/calendar</code> and
            <code class="text-xs bg-gray-100 px-1 rounded">https://www.googleapis.com/auth/drive</code>
          </li>
          <li>Paste the email and private key above</li>
        </ol>
      </UiCard>
    </div>

    <!-- Tab: Drive -->
    <div v-if="activeTab === 'drive'">
      <div
        v-if="!status?.serviceAccount?.configured"
        class="p-6 border-2 border-dashed border-yellow-300 rounded-lg bg-yellow-50 text-center"
      >
        <KeyRound class="w-8 h-8 text-yellow-500 mx-auto mb-2" />
        <p class="text-yellow-800 font-medium">
          Service account required
        </p>
        <p class="text-sm text-yellow-600 mt-1">
          Configure the service account credentials first.
        </p>
        <UiButton
          size="sm"
          variant="outline"
          class="mt-3"
          @click="activeTab = 'service-account'"
        >
          Go to Service Account
        </UiButton>
      </div>

      <template v-else>
        <!-- Embed the existing google-drive config UI inline -->
        <NuxtLink
          to="/settings/google-drive"
          class="block"
        >
          <UiCard class="hover:shadow-md transition-shadow cursor-pointer">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-gray-900">Google Drive Configuration</h3>
                <p class="text-sm text-gray-500 mt-1">
                  Shared Drive, sync settings, and folder structure
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UiBadge :variant="status?.drive?.enabled ? 'success' : 'default'">
                  {{ status?.drive?.enabled ? 'Enabled' : 'Disabled' }}
                </UiBadge>
                <ArrowRight class="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </UiCard>
        </NuxtLink>
      </template>
    </div>

    <!-- Tab: Calendars -->
    <div v-if="activeTab === 'calendars'">
      <div
        v-if="!status?.serviceAccount?.configured"
        class="p-6 border-2 border-dashed border-yellow-300 rounded-lg bg-yellow-50 text-center"
      >
        <KeyRound class="w-8 h-8 text-yellow-500 mx-auto mb-2" />
        <p class="text-yellow-800 font-medium">
          Service account required
        </p>
        <p class="text-sm text-yellow-600 mt-1">
          Configure the service account credentials before adding calendars.
        </p>
        <UiButton
          size="sm"
          variant="outline"
          class="mt-3"
          @click="activeTab = 'service-account'"
        >
          Go to Service Account
        </UiButton>
      </div>

      <template v-else>
        <!-- Calendar List -->
        <UiCard v-if="calendars.length === 0">
          <div class="text-center py-8">
            <Calendar class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-4 text-lg font-medium text-gray-900">
              No calendars configured
            </h3>
            <p class="mt-2 text-sm text-gray-500">
              Staff members can add their Google Calendar from their
              <NuxtLink
                to="/profile"
                class="text-blue-600 hover:text-blue-700 underline"
              >Profile page</NuxtLink>.
            </p>
          </div>
        </UiCard>

        <UiCard v-else>
          <template #header>
            <h2 class="text-lg font-semibold text-gray-900">
              Staff Calendars
            </h2>
          </template>

          <div class="divide-y divide-gray-200">
            <div
              v-for="cal in calendars"
              :key="cal.id"
              class="py-4 flex items-center justify-between"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                  :class="cal.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'"
                >
                  {{ cal.attorneyName?.charAt(0) || '?' }}
                </div>
                <div>
                  <div class="font-medium text-gray-900">
                    {{ cal.attorneyName }}
                    <UiBadge
                      v-if="cal.isPrimary"
                      variant="info"
                      size="sm"
                      class="ml-2"
                    >
                      Primary
                    </UiBadge>
                    <UiBadge
                      v-if="!cal.isActive"
                      variant="danger"
                      size="sm"
                      class="ml-2"
                    >
                      Inactive
                    </UiBadge>
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ cal.calendarEmail }}
                  </div>
                  <div class="text-xs text-gray-400">
                    {{ cal.calendarName }} &middot; {{ cal.timezone }}
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  :disabled="testingCalId === cal.id"
                  class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                  @click="testCalendar(cal)"
                >
                  {{ testingCalId === cal.id ? 'Testing...' : 'Test' }}
                </button>
                <button
                  v-if="cal.isActive"
                  class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                  @click="toggleCalActive(cal.id, false)"
                >
                  Deactivate
                </button>
                <button
                  v-else
                  class="px-3 py-1.5 text-xs border border-green-200 rounded-lg hover:bg-green-50 text-green-600"
                  @click="toggleCalActive(cal.id, true)"
                >
                  Activate
                </button>
              </div>
            </div>
          </div>
        </UiCard>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, markRaw } from 'vue'
import { ArrowLeft, ArrowRight, KeyRound, HardDrive, Calendar, Building2, RefreshCw } from 'lucide-vue-next'
import { useAppConfigStore } from '~/stores/appConfig'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const toast = useToast()
const appConfig = useAppConfigStore()

const activeTab = ref('service-account')
const tabs = [
  { id: 'service-account', label: 'Service Account', icon: markRaw(KeyRound) },
  { id: 'drive', label: 'Drive', icon: markRaw(HardDrive) },
  { id: 'calendars', label: 'Calendars', icon: markRaw(Calendar) }
]

// Status
const status = ref<any>(null)
const loadingConfig = ref(true)
const driveConfig = ref<any>(null)

// Service Account form
const saForm = ref({ serviceAccountEmail: '', serviceAccountPrivateKey: '' })
const savingSA = ref(false)
const testingSA = ref(false)
const saTestResult = ref<{ success: boolean, error?: string } | null>(null)

// Calendar state
const calendars = ref<any[]>([])
const testingCalId = ref<string | null>(null)

onMounted(async () => {
  await Promise.all([loadStatus(), loadDriveConfig(), loadCalendars()])
  loadingConfig.value = false
})

async function loadStatus() {
  try {
    status.value = await $fetch('/api/google-workspace/status')
  }
  catch {}
}

async function loadDriveConfig() {
  try {
    const res = await $fetch<any>('/api/admin/google-drive/config')
    driveConfig.value = res.config
    if (res.config) {
      saForm.value.serviceAccountEmail = res.config.serviceAccountEmail || ''
    }
  }
  catch {}
}

async function loadCalendars() {
  try {
    calendars.value = await $fetch('/api/admin/calendars')
  }
  catch {}
}

async function saveServiceAccount() {
  savingSA.value = true
  try {
    // Save via the Drive config endpoint (it holds the shared credentials)
    const body: Record<string, any> = {
      serviceAccountEmail: saForm.value.serviceAccountEmail
    }
    if (saForm.value.serviceAccountPrivateKey) {
      body.serviceAccountPrivateKey = saForm.value.serviceAccountPrivateKey
    }

    await $fetch('/api/admin/google-drive/configure', { method: 'POST', body })
    saForm.value.serviceAccountPrivateKey = ''
    toast.success('Service account credentials saved')

    await Promise.all([loadStatus(), loadDriveConfig()])
    await appConfig.refetch()
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to save credentials')
  }
  finally {
    savingSA.value = false
  }
}

async function testServiceAccount() {
  testingSA.value = true
  saTestResult.value = null
  try {
    const authStore = useAuthStore()
    const body: Record<string, any> = {}
    if (saForm.value.serviceAccountEmail) {
      body.serviceAccountEmail = saForm.value.serviceAccountEmail
    }
    if (saForm.value.serviceAccountPrivateKey) {
      body.serviceAccountPrivateKey = saForm.value.serviceAccountPrivateKey
    }
    // Also test domain-wide delegation by impersonating the current user
    if (authStore.user?.email) {
      body.impersonateEmail = authStore.user.email
    }
    const res = await $fetch<any>('/api/admin/google-workspace/test-credentials', { method: 'POST', body })
    saTestResult.value = res
  }
  catch (err: any) {
    saTestResult.value = { success: false, error: err.data?.message || 'Connection failed' }
  }
  finally {
    testingSA.value = false
  }
}

async function testCalendar(cal: any) {
  testingCalId.value = cal.id
  try {
    const now = new Date()
    const end = new Date(now)
    end.setHours(23, 59, 59)
    await $fetch(`/api/calendar/events?timeMin=${now.toISOString()}&timeMax=${end.toISOString()}&attorneyIds=${cal.attorneyId}&view=individual`)
    toast.success(`Connection to ${cal.calendarEmail} is working`)
  }
  catch (err: any) {
    toast.error(`Failed: ${err.data?.message || 'Check service account configuration'}`)
  }
  finally {
    testingCalId.value = null
  }
}

async function toggleCalActive(id: string, activate: boolean) {
  try {
    if (activate) {
      await $fetch(`/api/admin/calendars/${id}`, { method: 'PUT', body: { isActive: true } })
    }
    else {
      await $fetch(`/api/admin/calendars/${id}`, { method: 'DELETE' })
    }
    await loadCalendars()
    await loadStatus()
    toast.success(activate ? 'Calendar activated' : 'Calendar deactivated')
  }
  catch {
    toast.error('Failed to update calendar')
  }
}
</script>
