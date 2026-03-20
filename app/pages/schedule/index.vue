<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        Schedule
      </h1>
      <p class="text-gray-600 mt-1">
        Team calendar with Google Calendar integration
      </p>
    </div>

    <!-- Toolbar -->
    <CalendarToolbar
      :date-label="dateLabel"
      :view-mode="viewMode"
      :view-type="viewType"
      @today="calendar.goToday"
      @back="calendar.goBack"
      @forward="calendar.goForward"
      @update:view-mode="viewMode = $event"
      @update:view-type="(val) => { viewType = val; calendar.fetchEvents(true) }"
      @new-appointment="showModal = true"
    />

    <!-- Loading State -->
    <div
      v-if="loading"
      class="text-center py-12"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      <p class="text-gray-500 mt-3">
        Loading calendar...
      </p>
    </div>

    <!-- Calendar Views -->
    <template v-else>
      <CalendarGrid
        v-if="viewMode === 'week' || viewMode === 'month'"
        :view-mode="viewMode"
        :week-days="weekDays"
        :current-date="currentDate"
        :get-events-for-day="(day: Date) => calendar.getEventsForDay(day)"
        :get-events-for-hour="(day: Date, hour: number) => calendar.getEventsForHour(day, hour)"
        @slot-click="handleSlotClick"
        @event-click="handleEventClick"
      />

      <CalendarAgenda
        v-else
        :events="events"
        @event-click="handleEventClick"
      />
    </template>

    <!-- Appointment Modal -->
    <CalendarAppointmentModal
      v-model="showModal"
      :initial-data="selectedEvent"
      :editing="!!editingId"
      @submit="handleSubmit"
    />

    <!-- Event Detail Popover -->
    <UiModal
      v-model="showDetail"
      title="Event Details"
      size="md"
    >
      <div
        v-if="detailEvent"
        class="space-y-3"
      >
        <h3 class="text-lg font-semibold text-gray-900">
          {{ detailEvent.title }}
        </h3>

        <div class="text-sm text-gray-600 space-y-2">
          <div class="flex items-center gap-2">
            <Clock class="w-4 h-4 text-gray-400" />
            <span>{{ formatEventTime(detailEvent) }}</span>
          </div>

          <div
            v-if="detailEvent.location"
            class="flex items-center gap-2"
          >
            <MapPin class="w-4 h-4 text-gray-400" />
            <span>{{ detailEvent.location }}</span>
          </div>

          <div
            v-if="detailEvent.description"
            class="flex items-start gap-2"
          >
            <FileText class="w-4 h-4 text-gray-400 mt-0.5" />
            <span>{{ detailEvent.description }}</span>
          </div>
        </div>

        <div v-if="detailEvent.staffAttendees.length > 0">
          <p class="text-xs font-medium text-gray-500 mb-2">
            Attendees
          </p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="a in detailEvent.staffAttendees"
              :key="a.userId"
              class="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
            >
              {{ a.firstName }} {{ a.lastName }}
            </span>
          </div>
        </div>

        <div
          v-if="detailEvent.appointmentType"
          class="flex items-center gap-2"
        >
          <UiBadge
            :variant="typeVariant(detailEvent.appointmentType)"
            size="sm"
          >
            {{ detailEvent.appointmentType }}
          </UiBadge>
          <UiBadge
            v-if="detailEvent.source !== 'google'"
            :variant="statusVariant(detailEvent.status)"
            size="sm"
          >
            {{ detailEvent.status || 'No status' }}
          </UiBadge>
        </div>
      </div>

      <template #footer>
        <template v-if="detailEvent?.ytpAppointmentId">
          <UiButton
            variant="outline"
            size="sm"
            @click="editEvent"
          >
            Edit
          </UiButton>
          <UiButton
            variant="danger"
            size="sm"
            :disabled="cancelling"
            @click="cancelEvent"
          >
            {{ cancelling ? 'Cancelling...' : 'Cancel' }}
          </UiButton>
        </template>
        <UiButton @click="showDetail = false">
          Close
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Clock, MapPin, FileText } from 'lucide-vue-next'
import { useCalendarStore, type CalendarEvent } from '~/stores/useCalendarStore'
import { formatDateTime } from '~/utils/format'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const toast = useToast()
const calendar = useCalendarStore()

const { currentDate, viewMode, viewType, events, loading, dateLabel, weekDays } = storeToRefs(calendar)

const showModal = ref(false)
const showDetail = ref(false)
const selectedEvent = ref<Record<string, any> | undefined>(undefined)
const detailEvent = ref<CalendarEvent | null>(null)
const editingId = ref<string | null>(null)
const cancelling = ref(false)

// Fetch events on mount and when date range changes
onMounted(() => {
  calendar.fetchEvents()
  calendar.loadAppointmentTypes()
})
watch([viewMode, currentDate], () => calendar.fetchEvents())

function handleSlotClick(day: Date, hour: number) {
  const start = new Date(day)
  start.setHours(hour, 0, 0, 0)
  const end = new Date(start)
  end.setHours(hour + 1, 0, 0, 0)

  selectedEvent.value = {
    startTime: start.toISOString(),
    endTime: end.toISOString()
  }
  editingId.value = null
  showModal.value = true
}

function handleEventClick(evt: CalendarEvent) {
  detailEvent.value = evt
  showDetail.value = true
}

function formatEventTime(evt: CalendarEvent): string {
  if (evt.isAllDay) return 'All day'
  const start = new Date(evt.startTime)
  const end = new Date(evt.endTime)
  const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${dateStr}, ${startTime} - ${endTime}`
}

async function handleSubmit(data: Record<string, any>) {
  try {
    if (editingId.value) {
      await calendar.updateAppointment(editingId.value, data)
      toast.success('Appointment updated')
    }
    else {
      await calendar.createAppointment(data)
      toast.success('Appointment created')
    }
    editingId.value = null
    selectedEvent.value = undefined
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to save appointment')
  }
}

function editEvent() {
  if (!detailEvent.value?.ytpAppointmentId) return
  editingId.value = detailEvent.value.ytpAppointmentId
  selectedEvent.value = {
    title: detailEvent.value.title,
    startTime: detailEvent.value.startTime,
    endTime: detailEvent.value.endTime,
    location: detailEvent.value.location,
    description: detailEvent.value.description,
    appointmentType: detailEvent.value.appointmentType,
    matterId: detailEvent.value.matterId
  }
  showDetail.value = false
  showModal.value = true
}

async function cancelEvent() {
  if (!detailEvent.value?.ytpAppointmentId) return
  cancelling.value = true
  try {
    await calendar.cancelAppointment(detailEvent.value.ytpAppointmentId)
    toast.success('Appointment cancelled')
    showDetail.value = false
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to cancel appointment')
  }
  finally {
    cancelling.value = false
  }
}

function typeVariant(type?: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (type) {
    case 'CONSULTATION': return 'info'
    case 'SIGNING': return 'success'
    case 'CALL': return 'warning'
    default: return 'default'
  }
}

function statusVariant(status?: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'CONFIRMED': return 'success'
    case 'PENDING': return 'warning'
    case 'CANCELLED': return 'danger'
    case 'COMPLETED': return 'info'
    default: return 'default'
  }
}
</script>
