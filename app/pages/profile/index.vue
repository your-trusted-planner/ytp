<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        Profile
      </h1>
      <p class="text-gray-600 mt-1">
        Manage your account information and preferences
      </p>
    </div>

    <!-- Personal Information -->
    <ClientOnly>
      <UiCard title="Personal Information">
        <form
          class="space-y-4"
          @submit.prevent="handleSave"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiInput
              v-model="profile.firstName"
              label="First Name"
              autocomplete="given-name"
              required
            />
            <UiInput
              v-model="profile.lastName"
              label="Last Name"
              autocomplete="family-name"
              required
            />
          </div>
          <UiInput
            v-model="profile.email"
            label="Email"
            type="email"
            autocomplete="email"
            disabled
          />
          <UiPhoneInput
            v-model="profile.phone"
            label="Phone"
          />
          <div class="flex justify-end space-x-3">
            <UiButton
              variant="outline"
              type="button"
              @click="resetProfile"
            >
              Cancel
            </UiButton>
            <UiButton
              type="submit"
              :is-loading="saving"
            >
              Save Changes
            </UiButton>
          </div>
        </form>
      </UiCard>
    </ClientOnly>

    <!-- Change Password (client-only to avoid hydration mismatch) -->
    <ClientOnly>
      <UiCard
        v-if="hasPassword"
        title="Change Password"
      >
        <form
          class="space-y-4"
          @submit.prevent="handlePasswordChange"
        >
          <UiInput
            v-model="passwordForm.currentPassword"
            label="Current Password"
            type="password"
            autocomplete="current-password"
            required
          />
          <UiInput
            v-model="passwordForm.newPassword"
            label="New Password"
            type="password"
            autocomplete="new-password"
            required
          />
          <UiInput
            v-model="passwordForm.confirmPassword"
            label="Confirm New Password"
            type="password"
            autocomplete="new-password"
            required
          />
          <div class="flex justify-end">
            <UiButton
              type="submit"
              :is-loading="changingPassword"
            >
              Update Password
            </UiButton>
          </div>
        </form>
      </UiCard>
    </ClientOnly>

    <!-- Stored Signature -->
    <UiCard title="E-Signature">
      <template #header-actions>
        <span class="text-sm text-gray-500">For signing documents</span>
      </template>
      <SignatureImageManager @updated="handleSignatureUpdated" />
    </UiCard>

    <!-- API Token (firm only) -->
    <ClientOnly v-if="authStore.isFirmUser">
      <UiCard title="API Token">
        <template #header-actions>
          <span class="text-sm text-gray-500">For programmatic access</span>
        </template>

        <div
          v-if="apiToken.revealed"
          class="space-y-3"
        >
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p class="text-sm font-medium text-amber-800">
              This token will only be shown once. Copy it now.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <code class="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all select-all">{{ apiToken.plaintext }}</code>
            <UiButton
              variant="outline"
              size="sm"
              :title="apiToken.copied ? 'Copied' : 'Copy'"
              @click="copyToken"
            >
              <Check
                v-if="apiToken.copied"
                class="w-4 h-4 text-green-600"
              />
              <Copy
                v-else
                class="w-4 h-4"
              />
            </UiButton>
          </div>
        </div>

        <div
          v-else
          class="space-y-3"
        >
          <div
            v-if="apiToken.hasToken"
            class="flex items-center justify-between"
          >
            <div>
              <p class="text-sm text-gray-700">
                Active token created {{ formatTokenDate(apiToken.createdAt) }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <UiButton
                variant="outline"
                size="sm"
                :is-loading="apiToken.loading"
                title="Regenerate token"
                @click="generateToken"
              >
                <RefreshCw class="w-4 h-4" />
              </UiButton>
              <UiButton
                variant="danger"
                size="sm"
                :is-loading="apiToken.revoking"
                title="Revoke token"
                @click="revokeToken"
              >
                <Trash2 class="w-4 h-4" />
              </UiButton>
            </div>
          </div>
          <div
            v-else
            class="flex items-center justify-between"
          >
            <p class="text-sm text-gray-500">
              No API token configured
            </p>
            <UiButton
              size="sm"
              :is-loading="apiToken.loading"
              title="Generate token"
              @click="generateToken"
            >
              <Plus class="w-4 h-4" />
            </UiButton>
          </div>
        </div>
      </UiCard>
    </ClientOnly>

    <!-- Notification Settings -->
    <UiCard title="Notification Settings">
      <template #header-actions>
        <span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
          <Construction class="w-3 h-3" />
          Placeholder
        </span>
      </template>
      <div class="space-y-4 opacity-60 pointer-events-none">
        <div class="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <h3 class="font-medium text-gray-900">
              Email Notifications
            </h3>
            <p class="text-sm text-gray-500">
              Receive email updates about your account
            </p>
          </div>
          <UiToggle v-model="accountPreferences.emailNotifications" />
        </div>
        <div class="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <h3 class="font-medium text-gray-900">
              SMS Notifications
            </h3>
            <p class="text-sm text-gray-500">
              Receive text message reminders
            </p>
          </div>
          <UiToggle v-model="accountPreferences.smsNotifications" />
        </div>
        <div class="flex items-center justify-between py-3">
          <div>
            <h3 class="font-medium text-gray-900">
              Two-Factor Authentication
            </h3>
            <p class="text-sm text-gray-500">
              Add an extra layer of security
            </p>
          </div>
          <UiButton
            variant="outline"
            size="sm"
            disabled
          >
            Coming Soon
          </UiButton>
        </div>
      </div>
    </UiCard>

    <!-- Preferences -->
    <UiCard title="Preferences">
      <div class="space-y-4">
        <!-- UI Preferences (stored locally - firm only) -->
        <div
          v-if="authStore.isFirmUser"
          class="pb-4 border-b border-gray-200"
        >
          <div class="flex items-center gap-2 mb-3">
            <h4 class="text-sm font-medium text-gray-700">
              Display Preferences
            </h4>
            <Transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="opacity-0 translate-x-1"
              enter-to-class="opacity-100 translate-x-0"
              leave-active-class="transition ease-in duration-150"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <span
                v-if="prefSaved"
                class="text-xs text-green-600 font-medium"
              >
                Saved
              </span>
            </Transition>
          </div>
          <ClientOnly>
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-gray-600 mb-1">Default Document View</label>
                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="documentView"
                      value="local"
                      :checked="localDocumentView === 'local'"
                      class="text-burgundy-600 focus:ring-burgundy-500"
                      @change="setDocumentView('local')"
                    >
                    <span class="text-sm text-gray-700">System Documents</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="documentView"
                      value="drive"
                      :checked="localDocumentView === 'drive'"
                      class="text-burgundy-600 focus:ring-burgundy-500"
                      @change="setDocumentView('drive')"
                    >
                    <span class="text-sm text-gray-700">Google Drive</span>
                  </label>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  Choose which view to show by default on the Matter Documents tab
                </p>
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Week Starts On</label>
                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="weekStart"
                      :value="0"
                      :checked="preferencesStore.weekStart === 0"
                      class="text-burgundy-600 focus:ring-burgundy-500"
                      @change="setWeekStart(0)"
                    >
                    <span class="text-sm text-gray-700">Sunday</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="weekStart"
                      :value="1"
                      :checked="preferencesStore.weekStart === 1"
                      class="text-burgundy-600 focus:ring-burgundy-500"
                      @change="setWeekStart(1)"
                    >
                    <span class="text-sm text-gray-700">Monday</span>
                  </label>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  Applies to date pickers and calendar views
                </p>
              </div>
            </div>
            <template #fallback>
              <div class="text-sm text-gray-500">
                Loading preferences...
              </div>
            </template>
          </ClientOnly>
        </div>

        <!-- Account Preferences (stored on server) - PLACEHOLDER -->
        <div>
          <div class="flex items-center gap-2 mb-3">
            <h4 class="text-sm font-medium text-gray-700">
              Account Preferences
            </h4>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
              <Construction class="w-3 h-3" />
              Placeholder
            </span>
          </div>
          <div class="space-y-4 opacity-60 pointer-events-none">
            <UiSelect
              v-model="accountPreferences.timezone"
              label="Time Zone"
            >
              <option value="America/New_York">
                Eastern Time
              </option>
              <option value="America/Chicago">
                Central Time
              </option>
              <option value="America/Denver">
                Mountain Time
              </option>
              <option value="America/Los_Angeles">
                Pacific Time
              </option>
            </UiSelect>
            <UiSelect
              v-model="accountPreferences.language"
              label="Language"
            >
              <option value="en">
                English
              </option>
              <option value="es">
                Spanish
              </option>
            </UiSelect>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Video Meetings (for firm members) -->
    <ClientOnly>
      <UiCard
        v-if="authStore.isFirmUser"
        title="Video Meetings"
      >
        <template #header-actions>
          <span class="text-sm text-gray-500">Connect your video meeting account</span>
        </template>

        <div
          v-if="videoConnectionsLoading"
          class="text-sm text-gray-500"
        >
          Loading...
        </div>
        <div
          v-else
          class="space-y-4"
        >
          <!-- Zoom Connection -->
          <div class="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Video class="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 class="font-medium text-gray-900">
                  Zoom
                </h3>
                <p
                  v-if="activeZoomConnection"
                  class="text-sm text-green-600"
                >
                  Connected as {{ activeZoomConnection.providerEmail }}
                </p>
                <p
                  v-else
                  class="text-sm text-gray-500"
                >
                  Not connected
                </p>
              </div>
            </div>
            <div>
              <UiButton
                v-if="activeZoomConnection"
                variant="outline"
                size="sm"
                :is-loading="disconnectingZoom"
                @click="disconnectZoom"
              >
                Disconnect
              </UiButton>
              <UiButton
                v-else
                size="sm"
                :disabled="!zoomConfigured"
                :title="zoomConfigured ? 'Connect your Zoom account' : 'Zoom is not configured. Ask an administrator to set it up in Settings > Video Providers.'"
                @click="connectZoom"
              >
                Connect Zoom
              </UiButton>
            </div>
          </div>

          <!-- Google Meet (coming soon) -->
          <div class="flex items-center justify-between py-3 opacity-60">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Video class="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 class="font-medium text-gray-900">
                  Google Meet
                </h3>
                <p class="text-sm text-gray-500">
                  Coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
      </UiCard>
    </ClientOnly>

    <!-- My Calendars (for firm members, only when Google service account is configured) -->
    <ClientOnly>
      <UiCard v-if="authStore.isFirmUser && appConfig.isGoogleConfigured">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">
              My Calendars
            </h3>
            <UiButton
              size="sm"
              @click="showAddCalendarModal = true"
            >
              Add Calendar
            </UiButton>
          </div>
        </template>

        <div
          v-if="calendars.length > 0"
          class="divide-y divide-gray-200"
        >
          <div
            v-for="calendar in calendars"
            :key="calendar.id"
            class="py-4 first:pt-0 last:pb-0"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <h3 class="font-medium text-gray-900">
                    {{ calendar.calendar_name }}
                  </h3>
                  <UiBadge
                    v-if="calendar.is_primary"
                    variant="info"
                    size="sm"
                  >
                    Primary
                  </UiBadge>
                  <UiBadge
                    v-if="!calendar.is_active"
                    variant="default"
                    size="sm"
                  >
                    Inactive
                  </UiBadge>
                </div>
                <p class="text-sm text-gray-500 mt-1">
                  {{ calendar.calendar_email }}
                </p>
                <p class="text-xs text-gray-400 mt-1">
                  Timezone: {{ calendar.timezone }}
                </p>
              </div>
              <div class="flex items-center space-x-2">
                <UiButton
                  v-if="!calendar.is_primary"
                  variant="outline"
                  size="sm"
                  @click="setPrimaryCalendar(calendar.id)"
                >
                  Set Primary
                </UiButton>
                <UiButton
                  variant="outline"
                  size="sm"
                  @click="toggleCalendarActive(calendar.id, !calendar.is_active)"
                >
                  {{ calendar.is_active ? 'Deactivate' : 'Activate' }}
                </UiButton>
                <UiButton
                  variant="danger"
                  size="sm"
                  @click="deleteCalendar(calendar.id)"
                >
                  Delete
                </UiButton>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="text-center py-8"
        >
          <Calendar class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900">
            No calendars configured
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            Add a calendar to enable appointment booking.
          </p>
        </div>
      </UiCard>
    </ClientOnly>

    <!-- Add Calendar Modal -->
    <UiModal
      v-model="showAddCalendarModal"
      title="Add Google Calendar"
      size="md"
    >
      <form
        class="space-y-4"
        @submit.prevent="addCalendar"
      >
        <UiInput
          v-model="calendarForm.calendarName"
          label="Calendar Name"
          placeholder="e.g., Work Calendar"
          required
        />
        <UiInput
          v-model="calendarForm.calendarId"
          label="Calendar ID"
          placeholder="primary or email@gmail.com"
          required
        />
        <p class="text-xs text-gray-500 -mt-2">
          Usually "primary" or your Google Calendar email
        </p>
        <UiInput
          v-model="calendarForm.calendarEmail"
          label="Calendar Email"
          type="email"
          placeholder="your-email@gmail.com"
          required
        />
        <UiSelect
          v-model="calendarForm.timezone"
          label="Timezone"
        >
          <option value="America/New_York">
            Eastern Time
          </option>
          <option value="America/Chicago">
            Central Time
          </option>
          <option value="America/Denver">
            Mountain Time
          </option>
          <option value="America/Los_Angeles">
            Pacific Time
          </option>
        </UiSelect>
        <div class="flex items-center">
          <input
            id="isPrimary"
            v-model="calendarForm.isPrimary"
            type="checkbox"
            class="rounded border-gray-300 text-burgundy-600 focus:ring-burgundy-500"
          >
          <label
            for="isPrimary"
            class="ml-2 text-sm text-gray-700"
          >
            Set as primary calendar for bookings
          </label>
        </div>
      </form>

      <template #footer>
        <UiButton
          variant="outline"
          @click="showAddCalendarModal = false"
        >
          Cancel
        </UiButton>
        <UiButton
          :is-loading="addingCalendar"
          @click="addCalendar"
        >
          Add Calendar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Calendar, Construction, Copy, Check, RefreshCw, Trash2, Plus, Video } from 'lucide-vue-next'
import { usePreferencesStore } from '~/stores/usePreferencesStore'
import type { DocumentViewPreference } from '~/stores/usePreferencesStore'
import { useAppConfigStore } from '~/stores/appConfig'

const toast = useToast()

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const authStore = useAuthStore()
const { data: sessionData } = await useFetch('/api/auth/session')
const preferencesStore = usePreferencesStore()
const appConfig = useAppConfigStore()

// Computed for password section - derived from session data (stable)
const hasPassword = computed(() => !!sessionData.value?.user?.hasPassword)

// Initialize profile from session data (available on both server and client)
const profile = ref({
  firstName: sessionData.value?.user?.firstName || '',
  lastName: sessionData.value?.user?.lastName || '',
  email: sessionData.value?.user?.email || '',
  phone: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Account preferences (server-stored)
const accountPreferences = ref({
  emailNotifications: true,
  smsNotifications: false,
  timezone: 'America/New_York',
  language: 'en'
})

// Local document view preference (client-only, backed by localStorage)
const localDocumentView = ref<DocumentViewPreference>('local')
const prefSaved = ref(false)
let prefSavedTimer: ReturnType<typeof setTimeout> | null = null

function flashPrefSaved() {
  prefSaved.value = true
  if (prefSavedTimer) clearTimeout(prefSavedTimer)
  prefSavedTimer = setTimeout(() => { prefSaved.value = false }, 2000)
}

const setDocumentView = (view: DocumentViewPreference) => {
  localDocumentView.value = view
  preferencesStore.setDocumentsDefaultView(view)
  flashPrefSaved()
}

const setWeekStart = (day: 0 | 1) => {
  preferencesStore.setWeekStartDay(day)
  flashPrefSaved()
}

const calendars = ref<any[]>([])
const calendarForm = ref({
  calendarName: 'Main',
  calendarId: sessionData.value?.user?.email,
  calendarEmail: sessionData.value?.user?.email,
  timezone: 'America/Denver',
  isPrimary: false
})

// API Token state
const apiToken = ref({
  hasToken: false,
  createdAt: null as string | null,
  loading: false,
  revoking: false,
  revealed: false,
  plaintext: '',
  copied: false
})

const saving = ref(false)
const changingPassword = ref(false)
const savingPreferences = ref(false)
const showAddCalendarModal = ref(false)
const addingCalendar = ref(false)

// Video meeting connections
const videoConnections = ref<Array<{
  id: string
  provider: string
  providerEmail: string | null
  status: string
}>>([])
const videoConnectionsLoading = ref(false)
const disconnectingZoom = ref(false)
const zoomConfigured = ref(false)

const activeZoomConnection = computed(() =>
  videoConnections.value.find(c => c.provider === 'zoom' && c.status === 'ACTIVE')
)

onMounted(async () => {
  // Hydrate preferences from localStorage on client
  preferencesStore.hydrateFromStorage()
  // Sync local state with store after hydration
  localDocumentView.value = preferencesStore.documentsDefaultView

  // Load API token status
  await loadApiTokenStatus()

  // Load calendars and video connections for firm members
  if (authStore.isFirmUser) {
    await loadCalendars()
    await loadVideoConnections()
  }

  // Check for Zoom connection result via query param
  const route = useRoute()
  if (route.query.zoom === 'connected') {
    toast.success('Zoom connected successfully')
    await loadVideoConnections()
  }
  else if (route.query.zoom === 'error') {
    const reason = route.query.reason as string || 'Unknown error'
    toast.error(`Zoom connection failed: ${reason}`)
  }
})

const resetProfile = () => {
  if (sessionData.value?.user) {
    const user = sessionData.value.user
    profile.value = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: ''
    }
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    await $fetch('/api/profile', {
      method: 'PUT',
      body: profile.value
    })
    toast.success('Profile updated successfully')
  }
  catch (error) {
    toast.error('Failed to update profile')
  }
  finally {
    saving.value = false
  }
}

const handlePasswordChange = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.warning('Passwords do not match')
    return
  }

  changingPassword.value = true
  try {
    await $fetch('/api/settings/password', {
      method: 'POST',
      body: {
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword
      }
    })
    toast.success('Password updated successfully')
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  }
  catch (error) {
    toast.error('Failed to update password')
  }
  finally {
    changingPassword.value = false
  }
}

const savePreferences = async () => {
  savingPreferences.value = true
  try {
    // TODO: Implement preferences API
    await new Promise(resolve => setTimeout(resolve, 500))
    toast.success('Preferences saved successfully')
  }
  catch (error) {
    toast.error('Failed to save preferences')
  }
  finally {
    savingPreferences.value = false
  }
}

// API Token functions
const loadApiTokenStatus = async () => {
  try {
    const data = await $fetch('/api/profile/api-token')
    apiToken.value.hasToken = data.hasToken
    apiToken.value.createdAt = data.createdAt
  }
  catch (error) {
    console.error('Failed to load API token status:', error)
  }
}

const generateToken = async () => {
  if (apiToken.value.hasToken && !confirm('This will replace your existing API token. The old token will stop working immediately. Continue?')) {
    return
  }
  apiToken.value.loading = true
  try {
    const data = await $fetch('/api/profile/api-token', { method: 'POST' })
    apiToken.value.plaintext = data.token
    apiToken.value.revealed = true
    apiToken.value.hasToken = true
    apiToken.value.createdAt = new Date().toISOString()
    apiToken.value.copied = false
    toast.success('API token generated')
  }
  catch (error) {
    toast.error('Failed to generate API token')
  }
  finally {
    apiToken.value.loading = false
  }
}

const revokeToken = async () => {
  if (!confirm('Revoke your API token? Any scripts using it will stop working.')) return
  apiToken.value.revoking = true
  try {
    await $fetch('/api/profile/api-token', { method: 'DELETE' })
    apiToken.value.hasToken = false
    apiToken.value.createdAt = null
    apiToken.value.revealed = false
    apiToken.value.plaintext = ''
    toast.success('API token revoked')
  }
  catch (error) {
    toast.error('Failed to revoke API token')
  }
  finally {
    apiToken.value.revoking = false
  }
}

const copyToken = async () => {
  try {
    await navigator.clipboard.writeText(apiToken.value.plaintext)
    apiToken.value.copied = true
    setTimeout(() => { apiToken.value.copied = false }, 2000)
  }
  catch {
    toast.error('Failed to copy to clipboard')
  }
}

const formatTokenDate = (date: string | null) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Video connection functions
const loadVideoConnections = async () => {
  videoConnectionsLoading.value = true
  try {
    videoConnections.value = await $fetch('/api/profile/video-connections')
  }
  catch {
    // May not have video connections feature
  }
  // Check if Zoom is configured via a lightweight preflight
  try {
    const providers = await $fetch<Array<{ id: string, configured: boolean }>>('/api/admin/video-providers')
    const zoom = providers.find(p => p.id === 'zoom')
    zoomConfigured.value = !!zoom?.configured
  }
  catch {
    // Non-admins can't access admin endpoint — fall back to optimistic (let authorize endpoint handle it)
    zoomConfigured.value = true
  }
  finally {
    videoConnectionsLoading.value = false
  }
}

const connectZoom = () => {
  window.location.href = '/api/auth/zoom/authorize'
}

const disconnectZoom = async () => {
  const connection = activeZoomConnection.value
  if (!connection) return
  if (!confirm('Disconnect Zoom? Existing meeting links will still work, but new Zoom meetings cannot be created.')) return

  disconnectingZoom.value = true
  try {
    await $fetch(`/api/profile/video-connections/${connection.id}`, { method: 'DELETE' })
    toast.success('Zoom disconnected')
    await loadVideoConnections()
  }
  catch {
    toast.error('Failed to disconnect Zoom')
  }
  finally {
    disconnectingZoom.value = false
  }
}

// Calendar functions
const loadCalendars = async () => {
  try {
    const response = await $fetch('/api/attorney/calendars')
    calendars.value = response.calendars || []
  }
  catch (error) {
    console.error('Failed to load calendars:', error)
  }
}

const addCalendar = async () => {
  addingCalendar.value = true
  try {
    await $fetch('/api/attorney/calendars', {
      method: 'POST',
      body: calendarForm.value
    })
    await loadCalendars()
    showAddCalendarModal.value = false
    calendarForm.value = {
      calendarName: 'Main',
      calendarId: sessionData.value?.user?.email,
      calendarEmail: sessionData.value?.user?.email,
      timezone: 'America/Denver',
      isPrimary: false
    }
  }
  catch (error) {
    console.error('Failed to add calendar:', error)
    toast.error('Failed to add calendar. Please try again.')
  }
  finally {
    addingCalendar.value = false
  }
}

const setPrimaryCalendar = async (calendarId: string) => {
  try {
    await $fetch(`/api/attorney/calendars/${calendarId}`, {
      method: 'PUT',
      body: { isPrimary: true }
    })
    toast.success('Primary calendar updated')
    await loadCalendars()
  }
  catch {
    toast.error('Failed to set primary calendar')
  }
}

const toggleCalendarActive = async (calendarId: string, activate: boolean) => {
  try {
    if (activate) {
      await $fetch(`/api/attorney/calendars/${calendarId}`, {
        method: 'PUT',
        body: { isActive: true } // Re-use PUT to reactivate
      })
    }
    else {
      await $fetch(`/api/attorney/calendars/${calendarId}`, {
        method: 'DELETE'
      })
    }
    toast.success(activate ? 'Calendar activated' : 'Calendar deactivated')
    await loadCalendars()
  }
  catch {
    toast.error('Failed to update calendar')
  }
}

const deleteCalendar = async (calendarId: string) => {
  if (!confirm('Are you sure you want to remove this calendar?')) return
  try {
    await $fetch(`/api/attorney/calendars/${calendarId}`, {
      method: 'DELETE'
    })
    toast.success('Calendar removed')
    await loadCalendars()
  }
  catch {
    toast.error('Failed to remove calendar')
  }
}

// Signature updated handler
const handleSignatureUpdated = (hasSignature: boolean) => {
  console.log('Signature updated:', hasSignature)
}
</script>
