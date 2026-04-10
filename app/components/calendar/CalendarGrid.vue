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
        <div class="grid grid-cols-[60px_repeat(7,1fr)]">
          <!-- Time labels column -->
          <div>
            <div
              v-for="hour in hours"
              :key="hour"
              class="h-[60px] p-1 text-xs text-gray-400 text-right pr-2"
            >
              {{ formatHour(hour) }}
            </div>
          </div>

          <!-- Day columns with absolute-positioned events -->
          <div
            v-for="day in weekDays"
            :key="day.toISOString()"
            class="border-l border-gray-100 relative"
          >
            <!-- Hour grid lines (clickable) -->
            <div
              v-for="hour in hours"
              :key="hour"
              class="h-[60px] border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              @click="$emit('slotClick', day, hour)"
            />

            <!-- Events overlay -->
            <CalendarEventCard
              v-for="evt in getEventsForDay(day)"
              :key="evt.id"
              :event="evt"
              class="absolute overflow-hidden"
              :style="getEventStyle(evt, day)"
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
          v-for="name in dayNames"
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

const ALL_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const prefs = usePreferencesStore()
const dayNames = computed(() => {
  const start = prefs.weekStart
  return [...ALL_DAY_NAMES.slice(start), ...ALL_DAY_NAMES.slice(0, start)]
})

const props = defineProps<{
  viewMode: ViewMode
  weekDays: Date[]
  currentDate: Date
  getEventsForDay: (day: Date) => CalendarEvent[]
  getEventsForHour: (day: Date, hour: number) => CalendarEvent[]
}>()

const HOUR_HEIGHT = 60 // px per hour row
const GRID_START_HOUR = 7 // first hour shown in the grid

// Compute layout for overlapping events — assigns each event a column and total columns count
const dayEventLayouts = computed(() => {
  const layouts = new Map<string, Map<string, { column: number; totalColumns: number }>>()

  for (const day of props.weekDays) {
    const dayKey = day.toISOString()
    const events = props.getEventsForDay(day)
      .map(e => ({
        id: e.id,
        start: new Date(e.startTime).getHours() * 60 + new Date(e.startTime).getMinutes(),
        end: new Date(e.endTime).getHours() * 60 + new Date(e.endTime).getMinutes()
      }))
      .sort((a, b) => a.start - b.start || a.end - b.end)

    // Assign columns using a greedy approach
    const columns: Array<number> = [] // tracks end-time of last event in each column
    const assignments = new Map<string, { column: number; totalColumns: number }>()

    // Group overlapping events into clusters
    const clusters: Array<Array<typeof events[number]>> = []
    let currentCluster: Array<typeof events[number]> = []
    let clusterEnd = 0

    for (const evt of events) {
      if (currentCluster.length === 0 || evt.start < clusterEnd) {
        currentCluster.push(evt)
        clusterEnd = Math.max(clusterEnd, evt.end)
      } else {
        clusters.push(currentCluster)
        currentCluster = [evt]
        clusterEnd = evt.end
      }
    }
    if (currentCluster.length > 0) clusters.push(currentCluster)

    // Assign columns within each cluster
    for (const cluster of clusters) {
      const clusterColumns: Array<number> = []
      const clusterAssignments: Array<{ id: string; column: number }> = []

      for (const evt of cluster) {
        // Find first column where event fits (no overlap)
        let col = 0
        while (col < clusterColumns.length && clusterColumns[col]! > evt.start) {
          col++
        }
        if (col >= clusterColumns.length) clusterColumns.push(0)
        clusterColumns[col] = evt.end
        clusterAssignments.push({ id: evt.id, column: col })
      }

      const totalCols = clusterColumns.length
      for (const a of clusterAssignments) {
        assignments.set(a.id, { column: a.column, totalColumns: totalCols })
      }
    }

    layouts.set(dayKey, assignments)
  }

  return layouts
})

function getEventStyle(event: CalendarEvent, day: Date) {
  const start = new Date(event.startTime)
  const end = new Date(event.endTime)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const durationMinutes = Math.max(endMinutes - startMinutes, 15)

  const topPx = ((startMinutes - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT
  const heightPx = (durationMinutes / 60) * HOUR_HEIGHT

  // Get column layout for overlapping events
  const dayKey = day.toISOString()
  const dayLayout = dayEventLayouts.value.get(dayKey)
  const layout = dayLayout?.get(event.id)
  const column = layout?.column ?? 0
  const totalColumns = layout?.totalColumns ?? 1

  const widthPercent = 100 / totalColumns
  const leftPercent = column * widthPercent

  return {
    top: `${Math.max(topPx, 0)}px`,
    height: `${heightPx}px`,
    left: `${leftPercent}%`,
    width: `${widthPercent - 1}%`, // slight gap between columns
    zIndex: 10 + column
  }
}

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

  // Fill in days from previous month (offset from preferred week start)
  const startDay = (firstOfMonth.getDay() - prefs.weekStart + 7) % 7
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
