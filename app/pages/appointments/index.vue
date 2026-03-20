<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          Appointments
        </h1>
        <p class="text-gray-600 mt-1">
          View and manage your appointments
        </p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/schedule">
          <UiButton variant="outline">
            <Calendar class="w-4 h-4 mr-1" />
            Calendar View
          </UiButton>
        </NuxtLink>
        <UiButton
          v-if="isLawyer"
          @click="showAddModal = true"
        >
          Schedule Appointment
        </UiButton>
      </div>
    </div>

    <UiCard>
      <div
        v-if="loading"
        class="text-center py-12"
      >
        <p class="text-gray-500">
          Loading appointments...
        </p>
      </div>
      <div
        v-else-if="appointments.length === 0"
        class="text-center py-12"
      >
        <p class="text-gray-500">
          No appointments scheduled
        </p>
      </div>
      <div
        v-else
        class="space-y-4"
      >
        <div
          v-for="appointment in appointments"
          :key="appointment.id"
          class="p-4 border border-gray-200 rounded-lg"
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold text-gray-900">
                {{ appointment.title }}
              </h3>
              <p
                v-if="appointment.description"
                class="text-sm text-gray-600 mt-1"
              >
                {{ appointment.description }}
              </p>
              <p class="text-sm text-gray-500 mt-2">
                {{ formatDateTime(appointment.startTime) }}
              </p>
              <p
                v-if="appointment.location"
                class="text-sm text-gray-500"
              >
                {{ appointment.location }}
              </p>
            </div>
            <UiBadge
              :variant="
                appointment.status === 'CONFIRMED' ? 'success'
                : appointment.status === 'PENDING' ? 'warning'
                  : appointment.status === 'COMPLETED' ? 'info' : 'default'
              "
            >
              {{ appointment.status }}
            </UiBadge>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Appointment Modal -->
    <CalendarAppointmentModal
      v-model="showAddModal"
      @submit="handleCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Calendar } from 'lucide-vue-next'
import { useCalendarStore } from '~/stores/useCalendarStore'
import { formatDateTime } from '~/utils/format'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const toast = useToast()
const calendar = useCalendarStore()
const { data: sessionData } = await useFetch('/api/auth/session')
const isLawyer = computed(() => {
  const role = sessionData.value?.user?.role
  return role === 'LAWYER' || role === 'ADMIN'
})

const appointments = ref<any[]>([])
const loading = ref(true)
const showAddModal = ref(false)

onMounted(async () => {
  try {
    const raw = await $fetch<any[]>('/api/appointments')
    // Map snake_case API response to camelCase for template
    appointments.value = raw.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      startTime: a.start_time,
      endTime: a.end_time,
      status: a.status,
      location: a.location
    }))
  }
  catch (error) {
    console.error('Failed to fetch appointments:', error)
  }
  finally {
    loading.value = false
  }
})

async function handleCreate(data: Record<string, any>) {
  try {
    await calendar.createAppointment(data)
    toast.success('Appointment created')
    const raw = await $fetch<any[]>('/api/appointments')
    appointments.value = raw.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      startTime: a.start_time,
      endTime: a.end_time,
      status: a.status,
      location: a.location
    }))
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to create appointment')
  }
}
</script>
