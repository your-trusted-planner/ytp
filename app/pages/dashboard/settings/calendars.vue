<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-slate-900">Google Calendar Integration</h1>
      <p class="text-slate-600 mt-2">Manage your calendars for appointment booking</p>
    </div>

    <!-- Calendars List -->
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
      <div class="border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <h2 class="text-lg font-semibold text-slate-900">Your Calendars</h2>
        <button
          @click="showAddModal = true"
          class="px-4 py-2 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors"
        >
          + Add Calendar
        </button>
      </div>

      <div v-if="calendars.length > 0" class="divide-y divide-slate-200">
        <div
          v-for="calendar in calendars"
          :key="calendar.id"
          class="p-6 hover:bg-slate-50 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <h3 class="text-lg font-medium text-slate-900">{{ calendar.calendar_name }}</h3>
                <span
                  v-if="calendar.is_primary"
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#C41E3A] text-white"
                >
                  Primary
                </span>
                <span
                  v-if="!calendar.is_active"
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-600"
                >
                  Inactive
                </span>
              </div>
              <p class="text-sm text-slate-600 mt-1">{{ calendar.calendar_email }}</p>
              <div class="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                <span>ID: {{ calendar.calendar_id }}</span>
                <span>Timezone: {{ calendar.timezone }}</span>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                v-if="!calendar.is_primary"
                @click="setPrimary(calendar.id)"
                class="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Set as Primary
              </button>
              <button
                @click="toggleActive(calendar.id, !calendar.is_active)"
                class="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                {{ calendar.is_active ? 'Deactivate' : 'Activate' }}
              </button>
              <button
                @click="deleteCalendar(calendar.id)"
                class="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Delete"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-slate-900">No calendars configured</h3>
        <p class="mt-1 text-sm text-slate-500">Get started by adding your first calendar.</p>
      </div>
    </div>

    <!-- Setup Instructions -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 class="text-sm font-semibold text-blue-900 mb-3">📖 Setup Instructions</h3>
      <div class="text-sm text-blue-800 space-y-2">
        <p><strong>1.</strong> Create a Google Cloud Project and enable Google Calendar API</p>
        <p><strong>2.</strong> Create a Service Account and download the JSON key</p>
        <p><strong>3.</strong> Share your Google Calendar with the service account email</p>
        <p><strong>4.</strong> Add environment variables and restart your server</p>
        <p><strong>5.</strong> Return here to add your calendar</p>
        <p class="mt-3">
          <a href="/docs/google-calendar-setup" class="text-blue-600 underline hover:text-blue-700">
            View detailed setup guide →
          </a>
        </p>
      </div>
    </div>

    <!-- Add Calendar Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div class="border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h3 class="text-xl font-semibold text-slate-900">Add Google Calendar</h3>
          <button @click="closeModal" class="text-slate-400 hover:text-slate-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form @submit.prevent="addCalendar" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Calendar Name *</label>
            <input
              v-model="calendarForm.calendarName"
              type="text"
              required
              placeholder="e.g., Work Calendar"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Calendar ID *</label>
            <input
              v-model="calendarForm.calendarId"
              type="text"
              required
              placeholder="primary or email@gmail.com"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
            />
            <p class="text-xs text-slate-500 mt-1">
              Usually "primary" or your Google Calendar email
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Calendar Email *</label>
            <input
              v-model="calendarForm.calendarEmail"
              type="email"
              required
              placeholder="your-email@gmail.com"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
            <select
              v-model="calendarForm.timezone"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>

          <div class="flex items-center">
            <input
              v-model="calendarForm.isPrimary"
              type="checkbox"
              id="isPrimary"
              class="text-[#C41E3A] focus:ring-[#C41E3A] rounded"
            />
            <label for="isPrimary" class="ml-2 text-sm text-slate-700">
              Set as primary calendar for bookings
            </label>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="closeModal"
              class="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-6 py-2 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50"
            >
              {{ saving ? 'Adding...' : 'Add Calendar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
})

const showAddModal = ref(false)
const saving = ref(false)
const calendars = ref<any[]>([])

const calendarForm = ref({
  calendarName: '',
  calendarId: '',
  calendarEmail: '',
  timezone: 'America/New_York',
  isPrimary: false,
})

onMounted(async () => {
  await loadCalendars()
})

const loadCalendars = async () => {
  try {
    const response = await $fetch('/api/attorney/calendars')
    calendars.value = response.calendars || []
  } catch (error) {
    console.error('Failed to load calendars:', error)
  }
}

const addCalendar = async () => {
  saving.value = true
  try {
    await $fetch('/api/attorney/calendars', {
      method: 'POST',
      body: calendarForm.value,
    })
    await loadCalendars()
    closeModal()
  } catch (error) {
    console.error('Failed to add calendar:', error)
    alert('Failed to add calendar. Please try again.')
  } finally {
    saving.value = false
  }
}

const closeModal = () => {
  showAddModal.value = false
  calendarForm.value = {
    calendarName: '',
    calendarId: '',
    calendarEmail: '',
    timezone: 'America/New_York',
    isPrimary: false,
  }
}

const setPrimary = async (calendarId: string) => {
  // TODO: Implement API call
  alert('Set primary functionality coming soon')
}

const toggleActive = async (calendarId: string, isActive: boolean) => {
  // TODO: Implement API call
  alert('Toggle active functionality coming soon')
}

const deleteCalendar = async (calendarId: string) => {
  if (!confirm('Are you sure you want to delete this calendar?')) return
  // TODO: Implement API call
  alert('Delete functionality coming soon')
}
</script>

