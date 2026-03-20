<template>
  <div class="text-center">
    <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <Check class="w-12 h-12 text-green-600" />
    </div>
    <h2 class="text-3xl font-bold text-[#0A2540] mb-4">
      Consultation Confirmed!
    </h2>
    <p class="text-slate-600 mb-8">
      Your appointment has been scheduled.
    </p>

    <div class="bg-slate-50 border border-slate-200 rounded-lg p-6 max-w-md mx-auto mb-8">
      <h3 class="font-semibold text-slate-900 mb-4">
        Appointment Details
      </h3>
      <div class="space-y-3 text-left">
        <div class="flex justify-between">
          <span class="text-slate-600">Date & Time:</span>
          <span class="font-medium text-right">{{ formattedStartTime }}</span>
        </div>
        <div
          v-if="attorneyName"
          class="flex justify-between"
        >
          <span class="text-slate-600">Attorney:</span>
          <span class="font-medium">{{ attorneyName }}</span>
        </div>
        <div
          v-if="location"
          class="flex justify-between"
        >
          <span class="text-slate-600">Location:</span>
          <span class="font-medium">{{ location }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-600">Booking ID:</span>
          <span class="font-mono text-sm">{{ bookingId }}</span>
        </div>
      </div>
    </div>

    <!-- Add to Calendar -->
    <div class="mb-8">
      <button
        class="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#C41E3A] text-[#C41E3A] rounded-lg font-semibold hover:bg-red-50 transition-colors"
        @click="downloadIcs"
      >
        <CalendarPlus class="w-5 h-5" />
        Add to Calendar
      </button>
    </div>

    <div class="space-y-2">
      <p class="text-slate-600">
        A confirmation email has been sent to <strong>{{ email }}</strong>
      </p>
      <p class="text-sm text-slate-500">
        You will receive a meeting link before your appointment.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check, CalendarPlus } from 'lucide-vue-next'

const props = defineProps<{
  bookingId: string
  startTime: string
  endTime: string
  email: string
  attorneyName?: string
  location?: string
  timezone?: string
}>()

const formattedStartTime = computed(() => {
  const d = new Date(props.startTime)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: props.timezone || 'America/New_York'
  })
})

function downloadIcs() {
  const start = new Date(props.startTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = new Date(props.endTime).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YTP//Consultation//EN',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:Consultation${props.attorneyName ? ` with ${props.attorneyName}` : ''}`,
    props.location ? `LOCATION:${props.location}` : '',
    `DESCRIPTION:Booking ID: ${props.bookingId}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'consultation.ics'
  link.click()
  URL.revokeObjectURL(url)
}
</script>
