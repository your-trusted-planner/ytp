<template>
  <div
    class="group rounded px-2 py-1 text-xs cursor-pointer overflow-hidden min-w-0"
    :class="cancelledClasses"
    :style="dynamicStyle"
    @click.stop="$emit('select', event)"
  >
    <div class="font-medium truncate">
      {{ event.title }}
    </div>
    <div class="text-[10px] opacity-75 truncate">
      {{ timeLabel }}
    </div>
    <div
      v-if="event.location"
      class="text-[10px] opacity-60 truncate"
    >
      {{ event.location }}
    </div>
    <UiAvatarStack
      v-if="event.staffAttendees.length > 0"
      :people="event.staffAttendees"
      :max="3"
      size="sm"
      class="mt-1"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCalendarStore } from '~/stores/useCalendarStore'
import type { CalendarEvent } from '~/stores/useCalendarStore'

const props = defineProps<{
  event: CalendarEvent
}>()

defineEmits<{
  select: [event: CalendarEvent]
}>()

const calendar = useCalendarStore()

const timeLabel = computed(() => {
  if (props.event.isAllDay) return 'All day'
  const start = new Date(props.event.startTime)
  const end = new Date(props.event.endTime)
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${fmt(start)} - ${fmt(end)}`
})

const isCancelled = computed(() => props.event.status === 'CANCELLED')

const cancelledClasses = computed(() => {
  if (isCancelled.value) return 'bg-red-50 border-l-2 border-red-300 text-red-400 line-through'
  return 'border-l-2'
})

/**
 * Use dynamic hex color from the appointment type.
 * Hex colors can't be Tailwind classes, so we use inline styles.
 */
const dynamicStyle = computed(() => {
  if (isCancelled.value) return {}
  const color = calendar.getTypeColor(props.event.appointmentTypeId, props.event.appointmentType)
  return {
    borderLeftColor: color,
    backgroundColor: color + '15', // ~8% opacity
    color: color
  }
})
</script>
