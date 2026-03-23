<template>
  <div class="space-y-4">
    <div class="flex flex-col md:flex-row gap-4">
      <!-- Month Calendar -->
      <div class="md:w-[280px] flex-shrink-0">
        <!-- Month Navigation -->
        <div class="flex items-center justify-between mb-3">
          <button
            type="button"
            :disabled="!canGoPrev"
            class="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            @click="prevMonth"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="text-sm font-semibold text-slate-800">{{ monthLabel }}</span>
          <button
            type="button"
            :disabled="!canGoNext"
            class="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            @click="nextMonth"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <!-- Day-of-week headers -->
        <div class="grid grid-cols-7 mb-1">
          <div
            v-for="d in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']"
            :key="d"
            class="text-center text-xs font-medium text-slate-400 py-0.5"
          >
            {{ d }}
          </div>
        </div>

        <!-- Calendar grid -->
        <div class="grid grid-cols-7">
          <div
            v-for="cell in calendarCells"
            :key="cell.key"
            class="aspect-square flex items-center justify-center"
          >
            <button
              v-if="cell.inMonth"
              type="button"
              :disabled="cell.disabled"
              class="w-8 h-8 rounded-full text-xs font-medium transition-all relative"
              :class="cellClasses(cell)"
              @click="selectDate(cell)"
            >
              {{ cell.dayNum }}
              <!-- Availability dot -->
              <span
                v-if="!cell.disabled && cell.hasAvailability"
                class="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                :class="selectedDate === cell.dateStr ? 'bg-white' : 'bg-green-500'"
              />
            </button>
          </div>
        </div>

        <div
          v-if="loadingAvailability"
          class="text-center mt-1"
        >
          <span class="text-xs text-slate-400">Checking availability...</span>
        </div>
      </div>

      <!-- Time Slots (right panel) -->
      <div class="flex-1 min-w-0">
        <div
          v-if="!selectedDate"
          class="text-center py-8 text-slate-400"
        >
          <p class="text-sm">
            Pick a date to see available times
          </p>
        </div>

        <div
          v-else-if="loadingSlots"
          class="text-center py-8"
        >
          <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          <p class="text-xs text-slate-500 mt-2">
            Loading times...
          </p>
        </div>

        <div
          v-else-if="availableSlots.length === 0"
          class="text-center py-8"
        >
          <p class="text-slate-500 text-sm">
            No available times on this date.
          </p>
        </div>

        <div v-else>
          <p class="text-xs text-slate-500 mb-2">
            {{ formatSelectedDateLabel }}
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <button
              v-for="slot in availableSlots"
              :key="slot.startTime"
              type="button"
              class="px-2 py-2 border-2 rounded-lg text-xs font-medium transition-all"
              :class="[
                selectedSlot?.startTime === slot.startTime
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              ]"
              @click="selectSlot(slot)"
            >
              {{ formatSlotTime(slot.startTime) }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface TimeSlot {
  startTime: string
  endTime: string
  available: boolean
}

const props = defineProps<{
  attendeeIds: string[]
  durationMinutes: number
  timezone?: string
  initialDate?: string
}>()

const emit = defineEmits<{
  select: [slot: { startTime: string, endTime: string, date: string, time: string }]
  'pick-manually': []
}>()

const tz = computed(() => props.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)

const today = new Date()
today.setHours(0, 0, 0, 0)

const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

const selectedDate = ref<string | null>(null)
const selectedSlot = ref<TimeSlot | null>(null)
const availableSlots = ref<TimeSlot[]>([])
const loadingSlots = ref(false)
const loadingAvailability = ref(false)
const businessDays = ref<number[]>([1, 2, 3, 4, 5])
const availableDatesSet = ref(new Set<string>())

// Navigation limits: current month to 3 months ahead
const canGoPrev = computed(() => {
  return viewYear.value > today.getFullYear() || viewMonth.value > today.getMonth()
})
const canGoNext = computed(() => {
  const maxDate = new Date(today)
  maxDate.setMonth(maxDate.getMonth() + 3)
  return new Date(viewYear.value, viewMonth.value) < new Date(maxDate.getFullYear(), maxDate.getMonth())
})

const monthLabel = computed(() => {
  return new Date(viewYear.value, viewMonth.value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const formatSelectedDateLabel = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(selectedDate.value + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
})

interface CalendarCell {
  key: string
  dateStr: string
  dayNum: number
  inMonth: boolean
  isPast: boolean
  isNonBusinessDay: boolean
  isToday: boolean
  hasAvailability: boolean
  disabled: boolean
}

const calendarCells = computed((): CalendarCell[] => {
  const cells: CalendarCell[] = []
  const firstDay = new Date(viewYear.value, viewMonth.value, 1)
  const startDow = firstDay.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()

  for (let i = 0; i < startDow; i++) {
    cells.push({ key: `pad-${i}`, dateStr: '', dayNum: 0, inMonth: false, isPast: false, isNonBusinessDay: false, isToday: false, hasAvailability: false, disabled: true })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewYear.value, viewMonth.value, day)
    const dateStr = toDateStr(d)
    const isPast = d < today
    const isNonBusinessDay = !businessDays.value.includes(d.getDay())
    const isToday = dateStr === toDateStr(today)
    const hasAvailability = availableDatesSet.value.has(dateStr)

    cells.push({
      key: dateStr,
      dateStr,
      dayNum: day,
      inMonth: true,
      isPast,
      isNonBusinessDay,
      isToday,
      hasAvailability,
      disabled: isPast || isNonBusinessDay
    })
  }

  return cells
})

function cellClasses(cell: CalendarCell): string {
  if (selectedDate.value === cell.dateStr) {
    return 'bg-blue-600 text-white'
  }
  if (cell.disabled) {
    return 'text-slate-300 cursor-not-allowed'
  }
  if (cell.isToday) {
    return 'bg-slate-100 text-slate-900 hover:bg-slate-200'
  }
  if (cell.hasAvailability) {
    return 'text-slate-900 hover:bg-slate-100'
  }
  return 'text-slate-400 hover:bg-slate-50'
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function selectDate(cell: CalendarCell) {
  if (cell.disabled) return
  selectedDate.value = cell.dateStr
  selectedSlot.value = null
}

function selectSlot(slot: TimeSlot) {
  selectedSlot.value = slot

  // Extract date and time strings for the form
  const d = new Date(slot.startTime)
  const date = toDateStr(d)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const time = `${hh}:${mm}`

  emit('select', { startTime: slot.startTime, endTime: slot.endTime, date, time })
}

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz.value
  })
}

// Fetch business hours on mount
onMounted(async () => {
  try {
    const data = await $fetch<{ start: number, end: number, days: number[] }>('/api/public/booking/business-hours')
    businessDays.value = data.days
  } catch {
    businessDays.value = [1, 2, 3, 4, 5]
  }
})

// Pre-select initialDate if provided
watch(() => props.initialDate, (date) => {
  if (date) {
    selectedDate.value = date
    // Navigate to the month of the initial date
    const d = new Date(date + 'T12:00:00')
    viewYear.value = d.getFullYear()
    viewMonth.value = d.getMonth()
  }
}, { immediate: true })

// Fetch available dates when month, attendees, or duration changes
async function fetchAvailableDates() {
  if (props.attendeeIds.length === 0) {
    availableDatesSet.value = new Set()
    return
  }

  loadingAvailability.value = true
  try {
    const startDate = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-01`
    const lastDay = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
    const endDate = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const data = await $fetch<{ availableDates: string[] }>('/api/calendar/availability-dates', {
      params: {
        attendeeIds: props.attendeeIds,
        startDate,
        endDate,
        timezone: tz.value,
        durationMinutes: props.durationMinutes
      }
    })
    availableDatesSet.value = new Set(data.availableDates)
  } catch (err) {
    console.error('Failed to fetch available dates:', err)
    availableDatesSet.value = new Set()
  } finally {
    loadingAvailability.value = false
  }
}

watch([viewYear, viewMonth, () => props.attendeeIds, () => props.durationMinutes], () => {
  fetchAvailableDates()
}, { immediate: true, deep: true })

// Fetch time slots when date is selected or attendees/duration change
async function fetchSlots() {
  const date = selectedDate.value
  if (!date || props.attendeeIds.length === 0) return

  loadingSlots.value = true
  availableSlots.value = []

  try {
    const data = await $fetch<{ slots: TimeSlot[] }>('/api/calendar/availability', {
      params: {
        attendeeIds: props.attendeeIds,
        date,
        timezone: tz.value,
        durationMinutes: props.durationMinutes
      }
    })
    availableSlots.value = data.slots || []
  } catch (err) {
    console.error('Failed to fetch availability:', err)
  } finally {
    loadingSlots.value = false
  }
}

watch([selectedDate, () => props.attendeeIds, () => props.durationMinutes], () => {
  if (selectedDate.value) {
    fetchSlots()
  }
}, { deep: true })
</script>
