<template>
  <div class="space-y-4">
    <div
      v-if="groupedEvents.length === 0"
      class="text-center py-12"
    >
      <CalendarIcon class="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500">
        No events in this period
      </p>
    </div>

    <div
      v-for="group in groupedEvents"
      :key="group.dateKey"
      class="bg-white border border-gray-200 rounded-lg overflow-hidden"
    >
      <!-- Date Header -->
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div class="flex items-center gap-2">
          <span
            v-if="isToday(group.date)"
            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-medium"
          >
            {{ group.date.getDate() }}
          </span>
          <span
            v-else
            class="text-sm font-medium text-gray-900"
          >{{ group.date.getDate() }}</span>
          <span class="text-sm font-medium text-gray-900">{{ formatDayHeader(group.date) }}</span>
          <span
            v-if="isToday(group.date)"
            class="text-xs text-blue-600 font-medium"
          >Today</span>
        </div>
      </div>

      <!-- Events List -->
      <div class="divide-y divide-gray-100">
        <div
          v-for="evt in group.events"
          :key="evt.id"
          class="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3"
          @click="$emit('eventClick', evt)"
        >
          <!-- Time column -->
          <div class="w-20 flex-shrink-0">
            <div
              v-if="evt.isAllDay"
              class="text-xs font-medium text-gray-500"
            >
              All day
            </div>
            <div v-else>
              <div class="text-sm font-medium text-gray-900">
                {{ formatTime(evt.startTime) }}
              </div>
              <div class="text-xs text-gray-500">
                {{ formatTime(evt.endTime) }}
              </div>
            </div>
          </div>

          <!-- Type indicator bar -->
          <div
            class="w-1 self-stretch rounded-full flex-shrink-0"
            :style="{ backgroundColor: getEventColor(evt) }"
          />

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">
              {{ evt.title }}
            </div>
            <div
              v-if="evt.location"
              class="text-xs text-gray-500 mt-0.5 truncate"
            >
              <MapPin class="w-3 h-3 inline mr-0.5" />{{ evt.location }}
            </div>
          </div>

          <!-- Attendees -->
          <UiAvatarStack
            v-if="evt.staffAttendees.length > 0"
            :people="evt.staffAttendees"
            :max="4"
            size="sm"
            class="flex-shrink-0"
          />

          <!-- Status badge -->
          <UiBadge
            v-if="evt.source === 'ytp' || evt.source === 'both'"
            :variant="statusVariant(evt.status)"
            size="sm"
            class="flex-shrink-0"
          >
            {{ evt.appointmentType || 'Event' }}
          </UiBadge>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Calendar as CalendarIcon, MapPin } from 'lucide-vue-next'
import { useCalendarStore } from '~/stores/useCalendarStore'
import type { CalendarEvent } from '~/stores/useCalendarStore'

const calendar = useCalendarStore()

const props = defineProps<{
  events: CalendarEvent[]
}>()

defineEmits<{
  eventClick: [event: CalendarEvent]
}>()

interface EventGroup {
  dateKey: string
  date: Date
  events: CalendarEvent[]
}

const groupedEvents = computed((): EventGroup[] => {
  const groups = new Map<string, EventGroup>()

  for (const evt of props.events) {
    const date = new Date(evt.startTime)
    const key = date.toISOString().slice(0, 10)
    if (!groups.has(key)) {
      groups.set(key, { dateKey: key, date: new Date(date.getFullYear(), date.getMonth(), date.getDate()), events: [] })
    }
    groups.get(key)!.events.push(evt)
  }

  return Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
})

function isToday(date: Date): boolean {
  const today = new Date()
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getEventColor(evt: CalendarEvent): string {
  return calendar.getTypeColor(evt.appointmentTypeId, evt.appointmentType)
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
