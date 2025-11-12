<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Schedule</h1>
      <p class="text-gray-600 mt-1">View your calendar and manage appointments</p>
    </div>

    <UiCard title="Calendar View">
      <div class="text-center py-12">
        <Calendar class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p class="text-gray-500 mb-4">Calendar integration coming soon</p>
        <p class="text-sm text-gray-400">Google Calendar will be integrated here to show available times</p>
      </div>
    </UiCard>

    <UiCard title="Upcoming Appointments">
      <div v-if="loading" class="text-center py-8">
        <p class="text-gray-500">Loading appointments...</p>
      </div>
      <div v-else-if="appointments.length === 0" class="text-center py-8">
        <p class="text-gray-500">No upcoming appointments</p>
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="appointment in appointments"
          :key="appointment.id"
          class="p-4 border border-gray-200 rounded-lg"
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold text-gray-900">{{ appointment.title }}</h3>
              <p v-if="appointment.description" class="text-sm text-gray-600 mt-1">
                {{ appointment.description }}
              </p>
              <p class="text-sm text-gray-500 mt-2">
                {{ formatDateTime(appointment.startTime) }}
              </p>
            </div>
            <UiBadge
              :variant="
                appointment.status === 'CONFIRMED' ? 'success' :
                appointment.status === 'PENDING' ? 'warning' : 'default'
              "
            >
              {{ appointment.status }}
            </UiBadge>
          </div>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Calendar } from 'lucide-vue-next'
import { formatDateTime } from '~/utils/format'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const appointments = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    appointments.value = await $fetch('/api/appointments')
  } catch (error) {
    console.error('Failed to fetch appointments:', error)
  } finally {
    loading.value = false
  }
})
</script>

