<template>
  <div class="space-y-6">
    <h3 class="text-lg font-semibold text-[#0A2540]">
      Select a Date & Time
    </h3>

    <div class="flex flex-col md:flex-row gap-6">
      <!-- Month Calendar -->
      <div class="md:w-[320px] flex-shrink-0">
        <!-- Month Navigation -->
        <div class="flex items-center justify-between mb-4">
          <button
            :disabled="!canGoPrev"
            class="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            @click="prevMonth"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
          <span class="text-sm font-semibold text-slate-800">{{ monthLabel }}</span>
          <button
            :disabled="!canGoNext"
            class="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            @click="nextMonth"
          >
            <ChevronRight class="w-5 h-5" />
          </button>
        </div>

        <!-- Day-of-week headers -->
        <div class="grid grid-cols-7 mb-1">
          <div
            v-for="d in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']"
            :key="d"
            class="text-center text-xs font-medium text-slate-400 py-1"
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
              :disabled="cell.disabled"
              class="w-9 h-9 rounded-full text-sm font-medium transition-all relative"
              :class="cellClasses(cell)"
              @click="selectDate(cell)"
            >
              {{ cell.dayNum }}
              <!-- Availability dot -->
              <span
                v-if="!cell.disabled && cell.hasAvailability"
                class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                :class="selectedDate === cell.dateStr ? 'bg-white' : 'bg-green-500'"
              />
            </button>
          </div>
        </div>

        <div
          v-if="loadingAvailability"
          class="text-center mt-2"
        >
          <span class="text-xs text-slate-400">Checking availability...</span>
        </div>
      </div>

      <!-- Time Slots (right panel) -->
      <div class="flex-1 min-w-0">
        <div
          v-if="!selectedDate"
          class="text-center py-12 text-slate-400"
        >
          <p class="text-sm">
            Pick a date to see available times
          </p>
        </div>

        <div
          v-else-if="loadingSlots"
          class="text-center py-12"
        >
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#C41E3A]" />
          <p class="text-sm text-slate-500 mt-2">
            Loading times...
          </p>
        </div>

        <div
          v-else-if="availableSlots.length === 0"
          class="text-center py-12"
        >
          <p class="text-slate-500 text-sm">
            No available times on this date.
          </p>
        </div>

        <div v-else>
          <p class="text-sm text-slate-500 mb-3">
            {{ formatSelectedDateLabel }}
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              v-for="slot in availableSlots"
              :key="slot.startTime"
              class="px-3 py-2.5 border-2 rounded-lg text-sm font-medium transition-all"
              :class="[
                selectedSlot?.startTime === slot.startTime
                  ? 'border-[#C41E3A] bg-red-50 text-[#C41E3A]'
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
  attorneyId: string
  timezone?: string
  appointmentTypeId?: string
}>()

const emit = defineEmits<{
  select: [slot: { startTime: string, endTime: string }]
}>()

const today = new Date()
today.setHours(0, 0, 0, 0)

const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth()) // 0-indexed

const selectedDate = ref<string | null>(null)
const selectedSlot = ref<TimeSlot | null>(null)
const availableSlots = ref<TimeSlot[]>([])
const loadingSlots = ref(false)
const loadingAvailability = ref(false)
const businessDays = ref<number[]>([1, 2, 3, 4, 5])
const availableDatesSet = ref(new Set<string>())

// Navigation limits: current month to 2 months ahead
const canGoPrev = computed(() => {
  return viewYear.value > today.getFullYear() || viewMonth.value > today.getMonth()
})
const canGoNext = computed(() => {
  const maxDate = new Date(today)
  maxDate.setMonth(maxDate.getMonth() + 2)
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
  const startDow = firstDay.getDay() // 0=Sun
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()

  // Leading empty cells
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
    return 'bg-[#C41E3A] text-white'
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
  }
  else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  }
  else {
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
  emit('select', { startTime: slot.startTime, endTime: slot.endTime })
}

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: props.timezone || 'America/New_York'
  })
}

// Fetch business hours on mount
onMounted(async () => {
  try {
    const params: Record<string, string> = {}
    if (props.appointmentTypeId) params.appointmentTypeId = props.appointmentTypeId
    const data = await $fetch<{ start: number, end: number, days: number[] }>('/api/public/booking/business-hours', { params })
    businessDays.value = data.days
  }
  catch {
    businessDays.value = [1, 2, 3, 4, 5]
  }
})

// Fetch available dates when month or attorney changes
async function fetchAvailableDates() {
  loadingAvailability.value = true
  try {
    const startDate = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-01`
    const lastDay = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
    const endDate = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const tz = props.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    const params: Record<string, string> = {
      attorneyId: props.attorneyId,
      startDate,
      endDate,
      timezone: tz
    }
    if (props.appointmentTypeId) params.appointmentTypeId = props.appointmentTypeId

    const data = await $fetch<{ availableDates: string[] }>('/api/public/booking/availability-dates', { params })
    availableDatesSet.value = new Set(data.availableDates)
  }
  catch (err) {
    console.error('Failed to fetch available dates:', err)
    availableDatesSet.value = new Set()
  }
  finally {
    loadingAvailability.value = false
  }
}

watch([viewYear, viewMonth, () => props.attorneyId], () => {
  fetchAvailableDates()
}, { immediate: true })

// Fetch time slots when date is selected
watch(selectedDate, async (date) => {
  if (!date) return
  loadingSlots.value = true
  availableSlots.value = []

  try {
    const tz = props.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    const params: Record<string, string> = {
      attorneyId: props.attorneyId,
      date,
      timezone: tz
    }
    if (props.appointmentTypeId) params.appointmentTypeId = props.appointmentTypeId

    const data = await $fetch<any>('/api/public/booking/availability', { params })
    availableSlots.value = data.slots || []
  }
  catch (err) {
    console.error('Failed to fetch availability:', err)
  }
  finally {
    loadingSlots.value = false
  }
})
</script>
