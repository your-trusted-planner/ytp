<template>
  <div class="border border-gray-200 rounded-lg overflow-hidden bg-white">
    <!-- Week View -->
    <div v-if="viewMode === 'week'">
      <!-- Day Headers -->
      <div class="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
        <div class="p-2" />
        <div
          v-for="day in weekDays"
          :key="day.toISOString()"
          class="p-2 text-center border-l border-gray-200"
          :class="{ 'bg-blue-50': isToday(day) }"
        >
          <div class="text-xs text-gray-500 uppercase">
            {{ dayName(day) }}
          </div>
          <div
            class="text-lg font-semibold"
            :class="isToday(day) ? 'text-blue-600' : 'text-gray-900'"
          >
            {{ day.getDate() }}
          </div>
        </div>
      </div>

      <!-- Time Grid -->
      <div
        class="overflow-y-auto"
        style="max-height: 600px;"
      >
        <div
          v-for="hour in hours"
          :key="hour"
          class="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 min-h-[60px]"
        >
          <!-- Time label -->
          <div class="p-1 text-xs text-gray-400 text-right pr-2 pt-0">
            {{ formatHour(hour) }}
          </div>

          <!-- Day cells -->
          <div
            v-for="day in weekDays"
            :key="`${day.toISOString()}-${hour}`"
            class="border-l border-gray-100 p-0.5 min-h-[60px] min-w-0 overflow-hidden hover:bg-gray-50 cursor-pointer relative"
            @click="$emit('slotClick', day, hour)"
          >
            <CalendarEventCard
              v-for="evt in getEventsForHour(day, hour)"
              :key="evt.id"
              :event="evt"
              class="mb-0.5"
              @select="$emit('eventClick', evt)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Month View -->
    <div v-else-if="viewMode === 'month'">
      <!-- Day headers -->
      <div class="grid grid-cols-7 border-b border-gray-200">
        <div
          v-for="name in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
          :key="name"
          class="p-2 text-center text-xs font-medium text-gray-500 uppercase"
        >
          {{ name }}
        </div>
      </div>

      <!-- Month grid -->
      <div class="grid grid-cols-7">
        <div
          v-for="(day, idx) in monthDays"
          :key="idx"
          class="border-b border-r border-gray-100 p-1 min-h-[100px] cursor-pointer hover:bg-gray-50"
          :class="{
            'bg-gray-50': !day.currentMonth,
            'bg-blue-50': isToday(day.date)
          }"
          @click="$emit('slotClick', day.date, 9)"
        >
          <div
            class="text-xs font-medium mb-1"
            :class="day.currentMonth ? 'text-gray-900' : 'text-gray-400'"
          >
            {{ day.date.getDate() }}
          </div>
          <div class="space-y-0.5">
            <CalendarEventCard
              v-for="evt in getEventsForDay(day.date).slice(0, 3)"
              :key="evt.id"
              :event="evt"
              @select="$emit('eventClick', evt)"
            />
            <div
              v-if="getEventsForDay(day.date).length > 3"
              class="text-[10px] text-gray-500 pl-2"
            >
              +{{ getEventsForDay(day.date).length - 3 }} more
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarEvent, ViewMode } from '~/stores/useCalendarStore'

const props = defineProps<{
  viewMode: ViewMode
  weekDays: Date[]
  currentDate: Date
  getEventsForDay: (day: Date) => CalendarEvent[]
  getEventsForHour: (day: Date, hour: number) => CalendarEvent[]
}>()

defineEmits<{
  slotClick: [day: Date, hour: number]
  eventClick: [event: CalendarEvent]
}>()

const hours = Array.from({ length: 13 }, (_, i) => i + 7) // 7am - 7pm

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

function dayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
}

const monthDays = computed(() => {
  const d = props.currentDate
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1)
  const lastOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)

  const days: Array<{ date: Date, currentMonth: boolean }> = []

  // Fill in days from previous month
  const startDay = firstOfMonth.getDay()
  for (let i = startDay - 1; i >= 0; i--) {
    const date = new Date(firstOfMonth)
    date.setDate(date.getDate() - i - 1)
    days.push({ date, currentMonth: false })
  }

  // Days of current month
  for (let i = 1; i <= lastOfMonth.getDate(); i++) {
    days.push({ date: new Date(d.getFullYear(), d.getMonth(), i), currentMonth: true })
  }

  // Fill remaining cells to complete the grid (6 rows)
  while (days.length < 42) {
    const lastDate = days[days.length - 1]!.date
    const nextDate = new Date(lastDate)
    nextDate.setDate(nextDate.getDate() + 1)
    days.push({ date: nextDate, currentMonth: false })
  }

  return days
})
</script>
