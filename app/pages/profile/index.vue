<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Profile</h1>
      <p class="text-gray-600 mt-1">Manage your account information and preferences</p>
    </div>

    <!-- Personal Information -->
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

    <!-- Change Password -->
    <UiCard v-if="showPasswordSection" title="Change Password">
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

    <!-- Stored Signature -->
    <UiCard title="E-Signature">
      <template #header-actions>
        <span class="text-sm text-gray-500">For signing documents</span>
      </template>
      <SignatureSignatureImageManager @updated="handleSignatureUpdated" />
    </UiCard>

    <!-- Notification Settings -->
    <UiCard title="Notification Settings">
      <div class="space-y-4">
        <div class="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <h3 class="font-medium text-gray-900">Email Notifications</h3>
            <p class="text-sm text-gray-500">Receive email updates about your account</p>
          </div>
          <UiToggle v-model="preferences.emailNotifications" />
        </div>
        <div class="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <h3 class="font-medium text-gray-900">SMS Notifications</h3>
            <p class="text-sm text-gray-500">Receive text message reminders</p>
          </div>
          <UiToggle v-model="preferences.smsNotifications" />
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
        <UiSelect v-model="preferences.timezone" label="Time Zone">
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
        </UiSelect>
        <UiSelect v-model="preferences.language" label="Language">
          <option value="en">English</option>
          <option value="es">Spanish</option>
        </UiSelect>
        <div class="flex justify-end">
          <UiButton @click="savePreferences" :is-loading="savingPreferences">
            Save Preferences
          </UiButton>
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
                <UiBadge v-if="calendar.is_primary" variant="primary" size="sm">Primary</UiBadge>
                <UiBadge v-if="!calendar.is_active" variant="default" size="sm">Inactive</UiBadge>
              </div>
              <p class="text-sm text-gray-500 mt-1">{{ calendar.calendar_email }}</p>
              <p class="text-xs text-gray-400 mt-1">Timezone: {{ calendar.timezone }}</p>
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
import { Calendar } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { data: sessionData } = await useFetch('/api/auth/session')
const currentUser = computed(() => sessionData.value?.user)

// Check if user is a firm member (can manage calendars)
const isFirmMember = computed(() => {
  const role = currentUser.value?.role
  return ['ADMIN', 'LAWYER', 'STAFF'].includes(role)
})

const profile = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const preferences = ref({
  emailNotifications: true,
  smsNotifications: false,
  timezone: 'America/New_York',
  language: 'en'
})

const calendars = ref<any[]>([])
const calendarForm = ref({
  calendarName: '',
  calendarId: '',
  calendarEmail: '',
  timezone: 'America/New_York',
  isPrimary: false,
})

const saving = ref(false)
const changingPassword = ref(false)
const savingPreferences = ref(false)
const showPasswordSection = ref(false)
const showAddCalendarModal = ref(false)
const addingCalendar = ref(false)

onMounted(async () => {
  // Set password section visibility after hydration to avoid SSR mismatch
  showPasswordSection.value = !!sessionData.value?.user?.hasPassword

  if (sessionData.value?.user) {
    const user = sessionData.value.user
    profile.value = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: ''
    }
  }

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
    alert('Profile updated successfully')
  } catch (error) {
    alert('Failed to update profile')
  } finally {
    saving.value = false
  }
}

const handlePasswordChange = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    alert('Passwords do not match')
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
    alert('Password updated successfully')
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    alert('Failed to update password')
  } finally {
    changingPassword.value = false
  }
}

const savePreferences = async () => {
  savingPreferences.value = true
  try {
    // TODO: Implement preferences API
    await new Promise(resolve => setTimeout(resolve, 500))
    alert('Preferences saved successfully')
  } catch (error) {
    alert('Failed to save preferences')
  } finally {
    savingPreferences.value = false
  }
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
    alert('Failed to add calendar. Please try again.')
  } finally {
    addingCalendar.value = false
  }
}

const setPrimaryCalendar = async (calendarId: string) => {
  // TODO: Implement API call
  alert('Set primary functionality coming soon')
}

const toggleCalendarActive = async (calendarId: string, isActive: boolean) => {
  // TODO: Implement API call
  alert('Toggle active functionality coming soon')
}

const deleteCalendar = async (calendarId: string) => {
  if (!confirm('Are you sure you want to delete this calendar?')) return
  // TODO: Implement API call
  alert('Delete functionality coming soon')
}

// Signature updated handler
const handleSignatureUpdated = (hasSignature: boolean) => {
  console.log('Signature updated:', hasSignature)
}
</script>
