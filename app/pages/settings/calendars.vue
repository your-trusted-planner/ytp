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

    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          Calendar Administration
        </h1>
        <p class="text-gray-600 mt-1">
          Manage Google Calendar connections for all staff
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="text-center py-12"
    >
      <p class="text-gray-500">
        Loading calendars...
      </p>
    </div>

    <!-- Calendar List -->
    <template v-else>
      <UiCard v-if="calendars.length === 0">
        <div class="text-center py-12">
          <CalendarIcon class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-4 text-lg font-medium text-gray-900">
            No calendars configured
          </h3>
          <p class="mt-2 text-sm text-gray-500">
            Staff members can add their Google Calendar from their profile page.
          </p>
        </div>
      </UiCard>

      <UiCard
        v-else
        title="Staff Calendars"
      >
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
                :disabled="testing === cal.id"
                class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                @click="testConnection(cal)"
              >
                {{ testing === cal.id ? 'Testing...' : 'Test' }}
              </button>
              <button
                v-if="cal.isActive"
                class="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                @click="toggleActive(cal.id, false)"
              >
                Deactivate
              </button>
              <button
                v-else
                class="px-3 py-1.5 text-xs border border-green-200 rounded-lg hover:bg-green-50 text-green-600"
                @click="toggleActive(cal.id, true)"
              >
                Activate
              </button>
            </div>
          </div>
        </div>
      </UiCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const toast = useToast()
const calendars = ref<any[]>([])
const loading = ref(true)
const testing = ref<string | null>(null)

onMounted(async () => {
  await loadCalendars()
})

async function loadCalendars() {
  loading.value = true
  try {
    calendars.value = await $fetch('/api/admin/calendars')
  }
  catch (error) {
    console.error('Failed to load calendars:', error)
  }
  finally {
    loading.value = false
  }
}

async function toggleActive(id: string, isActive: boolean) {
  try {
    if (isActive) {
      await $fetch(`/api/admin/calendars/${id}`, {
        method: 'PUT',
        body: { isActive: true }
      })
      toast.success('Calendar activated')
    }
    else {
      await $fetch(`/api/admin/calendars/${id}`, {
        method: 'DELETE'
      })
      toast.success('Calendar deactivated')
    }
    await loadCalendars()
  }
  catch (err: any) {
    toast.error('Failed to update calendar')
  }
}

async function testConnection(cal: any) {
  testing.value = cal.id
  try {
    // Test by fetching events for today
    const now = new Date()
    const dayEnd = new Date(now)
    dayEnd.setHours(23, 59, 59)

    await $fetch(`/api/calendar/events?timeMin=${now.toISOString()}&timeMax=${dayEnd.toISOString()}&attorneyIds=${cal.attorneyId}&view=individual`)
    toast.success(`Connection to ${cal.calendarEmail} is working`)
  }
  catch (err: any) {
    toast.error(`Connection failed: ${err.data?.message || 'Check service account configuration'}`)
  }
  finally {
    testing.value = null
  }
}
</script>
