<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Profile</h1>
      <p class="text-gray-600 mt-1">Manage your account information and preferences</p>
    </div>

    <!-- Personal Information -->
    <ClientOnly>
      <UiCard title="Personal Information">
        <form @submit.prevent="handleSave" class="space-y-4">
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
          <UiInput
            v-model="profile.phone"
            label="Phone"
            autocomplete="tel"
          />
          <div class="flex justify-end space-x-3">
            <UiButton variant="outline" type="button" @click="resetProfile">
              Cancel
            </UiButton>
            <UiButton type="submit" :is-loading="saving">
              Save Changes
            </UiButton>
          </div>
        </form>
      </UiCard>
    </ClientOnly>

    <!-- Change Password (client-only to avoid hydration mismatch) -->
    <ClientOnly>
      <UiCard v-if="hasPassword" title="Change Password">
        <form @submit.prevent="handlePasswordChange" class="space-y-4">
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
            <UiButton type="submit" :is-loading="changingPassword">
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

    <!-- API Token -->
    <ClientOnly>
      <UiCard title="API Token">
        <template #header-actions>
          <span class="text-sm text-gray-500">For programmatic access</span>
        </template>

        <div v-if="apiToken.revealed" class="space-y-3">
          <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p class="text-sm font-medium text-amber-800">This token will only be shown once. Copy it now.</p>
          </div>
          <div class="flex items-center gap-2">
            <code class="flex-1 px-3 py-2 bg-gray-100 rounded text-sm font-mono break-all select-all">{{ apiToken.plaintext }}</code>
            <UiButton variant="outline" size="sm" @click="copyToken" :title="apiToken.copied ? 'Copied' : 'Copy'">
              <Check v-if="apiToken.copied" class="w-4 h-4 text-green-600" />
              <Copy v-else class="w-4 h-4" />
            </UiButton>
          </div>
        </div>

        <div v-else class="space-y-3">
          <div v-if="apiToken.hasToken" class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-700">Active token created {{ formatTokenDate(apiToken.createdAt) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UiButton variant="outline" size="sm" :is-loading="apiToken.loading" @click="generateToken" title="Regenerate token">
                <RefreshCw class="w-4 h-4" />
              </UiButton>
              <UiButton variant="danger" size="sm" :is-loading="apiToken.revoking" @click="revokeToken" title="Revoke token">
                <Trash2 class="w-4 h-4" />
              </UiButton>
            </div>
          </div>
          <div v-else class="flex items-center justify-between">
            <p class="text-sm text-gray-500">No API token configured</p>
            <UiButton size="sm" :is-loading="apiToken.loading" @click="generateToken" title="Generate token">
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
            <h3 class="font-medium text-gray-900">Email Notifications</h3>
            <p class="text-sm text-gray-500">Receive email updates about your account</p>
          </div>
          <UiToggle v-model="accountPreferences.emailNotifications" />
        </div>
        <div class="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <h3 class="font-medium text-gray-900">SMS Notifications</h3>
            <p class="text-sm text-gray-500">Receive text message reminders</p>
          </div>
          <UiToggle v-model="accountPreferences.smsNotifications" />
        </div>
        <div class="flex items-center justify-between py-3">
          <div>
            <h3 class="font-medium text-gray-900">Two-Factor Authentication</h3>
            <p class="text-sm text-gray-500">Add an extra layer of security</p>
          </div>
          <UiButton variant="outline" size="sm" disabled>
            Coming Soon
          </UiButton>
        </div>
      </div>
    </UiCard>

    <!-- Preferences -->
    <UiCard title="Preferences">
      <div class="space-y-4">
        <!-- UI Preferences (stored locally - client only) -->
        <div class="pb-4 border-b border-gray-200">
          <h4 class="text-sm font-medium text-gray-700 mb-3">Display Preferences</h4>
          <ClientOnly>
            <div class="space-y-3">
              <div>
                <label class="block text-sm text-gray-600 mb-1">Default Document View</label>
                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="documentView"
                      value="local"
                      :checked="localDocumentView === 'local'"
                      @change="setDocumentView('local')"
                      class="text-burgundy-600 focus:ring-burgundy-500"
                    />
                    <span class="text-sm text-gray-700">System Documents</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="documentView"
                      value="drive"
                      :checked="localDocumentView === 'drive'"
                      @change="setDocumentView('drive')"
                      class="text-burgundy-600 focus:ring-burgundy-500"
                    />
                    <span class="text-sm text-gray-700">Google Drive</span>
                  </label>
                </div>
                <p class="text-xs text-gray-500 mt-1">Choose which view to show by default on the Matter Documents tab</p>
              </div>
            </div>
            <template #fallback>
              <div class="text-sm text-gray-500">Loading preferences...</div>
            </template>
          </ClientOnly>
        </div>

        <!-- Account Preferences (stored on server) - PLACEHOLDER -->
        <div>
          <div class="flex items-center gap-2 mb-3">
            <h4 class="text-sm font-medium text-gray-700">Account Preferences</h4>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
              <Construction class="w-3 h-3" />
              Placeholder
            </span>
          </div>
          <div class="space-y-4 opacity-60 pointer-events-none">
            <UiSelect v-model="accountPreferences.timezone" label="Time Zone">
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </UiSelect>
            <UiSelect v-model="accountPreferences.language" label="Language">
              <option value="en">English</option>
              <option value="es">Spanish</option>
            </UiSelect>
            <div class="flex justify-end">
              <UiButton disabled>
                Save Preferences
              </UiButton>
            </div>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- My Calendars (for firm members) -->
    <UiCard v-if="isFirmMember" title="My Calendars">
      <template #header-actions>
        <UiButton size="sm" @click="showAddCalendarModal = true">
          Add Calendar
        </UiButton>
      </template>

      <div v-if="calendars.length > 0" class="divide-y divide-gray-200">
        <div
          v-for="calendar in calendars"
          :key="calendar.id"
          class="py-4 first:pt-0 last:pb-0"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <h3 class="font-medium text-gray-900">{{ calendar.calendar_name }}</h3>
                <UiBadge v-if="calendar.is_primary" variant="info" size="sm">Primary</UiBadge>
                <UiBadge v-if="!calendar.is_active" variant="default" size="sm">Inactive</UiBadge>
              </div>
              <p class="text-sm text-gray-500 mt-1">{{ calendar.calendar_email }}</p>
              <p class="text-xs text-gray-400 mt-1">Timezone: {{ calendar.timezone }}</p>
            </div>
            <div class="flex items-center space-x-2 opacity-50">
              <UiButton
                v-if="!calendar.is_primary"
                variant="outline"
                size="sm"
                disabled
                title="Not yet implemented"
              >
                Set Primary
              </UiButton>
              <UiButton
                variant="outline"
                size="sm"
                disabled
                title="Not yet implemented"
              >
                {{ calendar.is_active ? 'Deactivate' : 'Activate' }}
              </UiButton>
              <UiButton
                variant="danger"
                size="sm"
                disabled
                title="Not yet implemented"
              >
                Delete
              </UiButton>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <Calendar class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">No calendars configured</h3>
        <p class="mt-1 text-sm text-gray-500">Add a calendar to enable appointment booking.</p>
      </div>
    </UiCard>

    <!-- Add Calendar Modal -->
    <UiModal v-model="showAddCalendarModal" title="Add Google Calendar" size="md">
      <form @submit.prevent="addCalendar" class="space-y-4">
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
        <p class="text-xs text-gray-500 -mt-2">Usually "primary" or your Google Calendar email</p>
        <UiInput
          v-model="calendarForm.calendarEmail"
          label="Calendar Email"
          type="email"
          placeholder="your-email@gmail.com"
          required
        />
        <UiSelect v-model="calendarForm.timezone" label="Timezone">
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
        </UiSelect>
        <div class="flex items-center">
          <input
            v-model="calendarForm.isPrimary"
            type="checkbox"
            id="isPrimary"
            class="rounded border-gray-300 text-burgundy-600 focus:ring-burgundy-500"
          />
          <label for="isPrimary" class="ml-2 text-sm text-gray-700">
            Set as primary calendar for bookings
          </label>
        </div>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="showAddCalendarModal = false">
          Cancel
        </UiButton>
        <UiButton @click="addCalendar" :is-loading="addingCalendar">
          Add Calendar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Calendar, Construction, Copy, Check, RefreshCw, Trash2, Plus } from 'lucide-vue-next'
import { usePreferencesStore } from '~/stores/usePreferencesStore'
import type { DocumentViewPreference } from '~/stores/usePreferencesStore'

const toast = useToast()

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { data: sessionData } = await useFetch('/api/auth/session')
const currentUser = computed(() => sessionData.value?.user)
const preferencesStore = usePreferencesStore()

// Check if user is a firm member (can manage calendars)
const isFirmMember = computed(() => {
  const role = currentUser.value?.role
  return ['ADMIN', 'LAWYER', 'STAFF'].includes(role)
})

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

const setDocumentView = (view: DocumentViewPreference) => {
  localDocumentView.value = view
  preferencesStore.setDocumentsDefaultView(view)
}

const calendars = ref<any[]>([])
const calendarForm = ref({
  calendarName: '',
  calendarId: '',
  calendarEmail: '',
  timezone: 'America/New_York',
  isPrimary: false,
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

onMounted(async () => {
  // Hydrate preferences from localStorage on client
  preferencesStore.hydrateFromStorage()
  // Sync local state with store after hydration
  localDocumentView.value = preferencesStore.documentsDefaultView

  // Load API token status
  await loadApiTokenStatus()

  // Load calendars for firm members
  if (isFirmMember.value) {
    await loadCalendars()
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
  } catch (error) {
    toast.error('Failed to update profile')
  } finally {
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
  } catch (error) {
    toast.error('Failed to update password')
  } finally {
    changingPassword.value = false
  }
}

const savePreferences = async () => {
  savingPreferences.value = true
  try {
    // TODO: Implement preferences API
    await new Promise(resolve => setTimeout(resolve, 500))
    toast.success('Preferences saved successfully')
  } catch (error) {
    toast.error('Failed to save preferences')
  } finally {
    savingPreferences.value = false
  }
}

// API Token functions
const loadApiTokenStatus = async () => {
  try {
    const data = await $fetch('/api/profile/api-token')
    apiToken.value.hasToken = data.hasToken
    apiToken.value.createdAt = data.createdAt
  } catch (error) {
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
  } catch (error) {
    toast.error('Failed to generate API token')
  } finally {
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
  } catch (error) {
    toast.error('Failed to revoke API token')
  } finally {
    apiToken.value.revoking = false
  }
}

const copyToken = async () => {
  try {
    await navigator.clipboard.writeText(apiToken.value.plaintext)
    apiToken.value.copied = true
    setTimeout(() => { apiToken.value.copied = false }, 2000)
  } catch {
    toast.error('Failed to copy to clipboard')
  }
}

const formatTokenDate = (date: string | null) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Calendar functions
const loadCalendars = async () => {
  try {
    const response = await $fetch('/api/attorney/calendars')
    calendars.value = response.calendars || []
  } catch (error) {
    console.error('Failed to load calendars:', error)
  }
}

const addCalendar = async () => {
  addingCalendar.value = true
  try {
    await $fetch('/api/attorney/calendars', {
      method: 'POST',
      body: calendarForm.value,
    })
    await loadCalendars()
    showAddCalendarModal.value = false
    calendarForm.value = {
      calendarName: '',
      calendarId: '',
      calendarEmail: '',
      timezone: 'America/New_York',
      isPrimary: false,
    }
  } catch (error) {
    console.error('Failed to add calendar:', error)
    toast.error('Failed to add calendar. Please try again.')
  } finally {
    addingCalendar.value = false
  }
}

const setPrimaryCalendar = async (calendarId: string) => {
  // TODO: Implement API call
  toast.info('Set primary functionality coming soon')
}

const toggleCalendarActive = async (calendarId: string, isActive: boolean) => {
  // TODO: Implement API call
  toast.info('Toggle active functionality coming soon')
}

const deleteCalendar = async (calendarId: string) => {
  if (!confirm('Are you sure you want to delete this calendar?')) return
  // TODO: Implement API call
  toast.info('Delete functionality coming soon')
}

// Signature updated handler
const handleSignatureUpdated = (hasSignature: boolean) => {
  console.log('Signature updated:', hasSignature)
}
</script>
