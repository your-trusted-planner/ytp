<template>
  <UiModal
    v-model="isOpen"
    :title="editing ? 'Edit Appointment' : 'New Appointment'"
    size="lg"
  >
    <form
      class="space-y-4"
      @submit.prevent="handleSubmit"
    >
      <!-- Type -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          v-model="form.appointmentTypeId"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          @change="onTypeChange"
        >
          <option value="">
            Select type...
          </option>
          <option
            v-for="t in calendar.appointmentTypes"
            :key="t.id"
            :value="t.id"
          >
            {{ t.name }}
          </option>
        </select>
      </div>

      <!-- Title -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          v-model="form.title"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Appointment title"
        >
      </div>

      <!-- Staff Attendees (moved up to inform slot picker) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Staff Attendees</label>
        <div class="space-y-2">
          <label
            v-for="staff in staffList"
            :key="staff.id"
            class="flex items-center gap-2 text-sm"
          >
            <input
              v-model="form.attendeeIds"
              type="checkbox"
              :value="staff.id"
              class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            >
            {{ staff.name }}
          </label>
        </div>
      </div>

      <!-- Duration (always visible, affects slot picker) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Duration</label>
        <select
          v-model="form.durationMinutes"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option :value="15">15 min</option>
          <option :value="30">30 min</option>
          <option :value="60">1 hour</option>
          <option :value="90">1.5 hours</option>
          <option :value="120">2 hours</option>
        </select>
      </div>

      <!-- Availability Slot Picker -->
      <div v-if="showSlotPicker">
        <label class="block text-sm font-medium text-gray-700 mb-1">Available Times</label>
        <p class="text-xs text-gray-500 mb-3">
          Select a time slot based on attendee availability, or
          <button
            type="button"
            class="text-blue-600 underline"
            @click="onPickManually"
          >set time manually</button>.
        </p>
        <InternalSlotPicker
          :attendee-ids="form.attendeeIds"
          :duration-minutes="form.durationMinutes"
          :initial-date="slotPickerInitialDate"
          @select="onSlotSelected"
          @pick-manually="onPickManually"
        />
      </div>

      <!-- Slot selected confirmation banner -->
      <div
        v-if="manualTimeMode && slotWasSelected && form.date && !editing"
        class="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2"
      >
        <span class="text-sm text-green-700">Time slot selected. Adjust below if needed.</span>
        <button
          type="button"
          class="text-xs text-blue-600 underline"
          @click="returnToSlotPicker"
        >
          Pick a different slot
        </button>
      </div>

      <!-- Date/Time (manual mode or no slot picker) -->
      <div
        v-if="!showSlotPicker"
        class="grid grid-cols-2 gap-4"
      >
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            v-model="form.date"
            type="date"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Time *</label>
          <select
            v-model="form.time"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option
              v-for="slot in timeSlots"
              :key="slot.value"
              :value="slot.value"
            >
              {{ slot.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Location -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">Location</label>
        <select
          v-model="form.locationType"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          @change="onLocationTypeChange"
        >
          <option value="none">
            No location
          </option>
          <option
            v-if="calendar.rooms.length > 0"
            disabled
            class="text-xs text-gray-400 uppercase"
          >
            -- Rooms --
          </option>
          <option
            v-for="room in calendar.rooms"
            :key="room.id"
            :value="'room:' + room.id"
          >
            {{ room.name }}{{ room.building ? ` (${room.building})` : '' }}
          </option>
          <option
            v-if="hasZoomConnection"
            value="video:zoom"
          >
            Zoom Meeting
          </option>
          <option value="custom">
            Custom...
          </option>
        </select>
        <input
          v-if="form.locationType === 'custom'"
          v-model="form.location"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Enter location..."
        >
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          v-model="form.description"
          rows="2"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="Notes or details"
        />
      </div>

      <!-- Invitees -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          With{{ selectedTypeIsClientFacing ? '' : ' (optional)' }}
          <span v-if="selectedTypeIsClientFacing" class="text-red-500 ml-0.5">*</span>
        </label>
        <!-- Selected people chips -->
        <div
          v-if="selectedPeople.length > 0"
          class="flex flex-wrap gap-1.5 mb-2"
        >
          <span
            v-for="person in selectedPeople"
            :key="person.id"
            class="inline-flex items-center gap-1 px-2.5 py-1 bg-burgundy-50 text-burgundy-700 rounded-full text-sm"
          >
            {{ person.name }}
            <button
              type="button"
              class="text-burgundy-400 hover:text-burgundy-600"
              @click="removePerson(person.id)"
            >
              <X class="w-3 h-3" />
            </button>
          </span>
        </div>
        <!-- Quick Add Person (inline, replaces search when active) -->
        <PeopleQuickAddPerson
          v-if="showQuickAdd"
          :initial-first-name="quickAddFirstName"
          :initial-last-name="quickAddLastName"
          submit-label="Add to appointment"
          @person-created="onQuickAddPersonCreated"
          @cancel="showQuickAdd = false"
        />
        <!-- Search input -->
        <div
          v-else
          class="relative"
        >
          <input
            v-model="personSearch"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="Search people to add..."
            @input="onPersonSearchInput"
            @focus="showPersonDropdown = true"
            @blur="hidePersonDropdown"
          >
          <div
            v-if="showPersonDropdown && (personOptions.length > 0 || (personSearch.length >= 2 && !personSearchLoading))"
            class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto"
          >
            <button
              v-for="option in personOptions"
              :key="option.value"
              type="button"
              class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              @mousedown.prevent="addPerson(option)"
            >
              {{ option.label }}
            </button>
            <button
              v-if="personOptions.length === 0 && personSearch.length >= 2 && !personSearchLoading"
              type="button"
              class="w-full px-3 py-2 text-left text-sm text-burgundy-600 hover:bg-gray-50 italic"
              @mousedown.prevent="openQuickAdd"
            >
              Add "{{ personSearch }}" as a new person...
            </button>
          </div>
        </div>
      </div>

      <!-- Matter Select -->
      <div v-if="matters.length > 0">
        <label class="block text-sm font-medium text-gray-700 mb-1">Matter (optional)</label>
        <select
          v-model="form.matterId"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">
            No matter
          </option>
          <option
            v-for="m in matters"
            :key="m.id"
            :value="m.id"
          >
            {{ m.title }}
          </option>
        </select>
      </div>

      <!-- Options -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <input
            id="checkAvailability"
            v-model="form.checkAvailability"
            type="checkbox"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          >
          <label
            for="checkAvailability"
            class="text-sm text-gray-700"
          >Check staff availability</label>
        </div>
        <div class="flex items-center gap-2">
          <input
            id="syncToGoogle"
            v-model="form.syncToGoogle"
            type="checkbox"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          >
          <label
            for="syncToGoogle"
            class="text-sm text-gray-700"
          >Sync to Google Calendar</label>
        </div>
      </div>
    </form>

    <template #footer>
      <UiButton
        variant="outline"
        @click="isOpen = false"
      >
        Cancel
      </UiButton>
      <UiButton
        :disabled="submitting"
        @click="handleSubmit"
      >
        {{ submitting ? 'Saving...' : editing ? 'Update' : 'Create' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useCalendarStore } from '~/stores/useCalendarStore'
import InternalSlotPicker from './InternalSlotPicker.vue'

const toast = useToast()

const props = defineProps<{
  modelValue: boolean
  initialData?: Record<string, any>
  editing?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'submit': [data: Record<string, any>]
}>()

const calendar = useCalendarStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const submitting = ref(false)
const hasZoomConnection = ref(false)
const previousAutoTitle = ref('')

const selectedTypeIsClientFacing = computed(() => {
  if (!form.value.appointmentTypeId) return false
  const type = calendar.getTypeById(form.value.appointmentTypeId)
  return type?.isClientFacing ?? false
})
const personOptions = ref<Array<{ label: string, value: string }>>([])
const personSearch = ref('')
const showPersonDropdown = ref(false)
const personSearchLoading = ref(false)
const selectedPeople = ref<Array<{ id: string, name: string }>>([])
const matters = ref<Array<{ id: string, title: string }>>([])

// Quick add person state
const showQuickAdd = ref(false)
const quickAddFirstName = ref('')
const quickAddLastName = ref('')

// Slot picker state
const manualTimeMode = ref(false)
const slotWasSelected = ref(false)
const slotPickerInitialDate = ref<string | undefined>(undefined)

// Use the store's shared staff list instead of fetching independently
const staffList = computed(() => calendar.staffList)

// Show slot picker when attendees selected, availability check on, not in manual mode, and not editing
const showSlotPicker = computed(() =>
  form.value.attendeeIds.length > 0 &&
  form.value.checkAvailability &&
  !manualTimeMode.value &&
  !props.editing
)

const durationOptions = [15, 30, 60, 90, 120]

// Generate 15-minute time slots for the picker
const timeSlots = computed(() => {
  const slots: Array<{ value: string, label: string }> = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      const value = `${hh}:${mm}`
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      const ampm = h < 12 ? 'AM' : 'PM'
      const label = `${hour12}:${mm} ${ampm}`
      slots.push({ value, label })
    }
  }
  return slots
})

const form = ref({
  title: '',
  description: '',
  date: '',
  time: '09:00',
  durationMinutes: 60,
  location: '',
  locationType: 'none' as string,
  appointmentTypeId: '',
  matterId: '',
  attendeeIds: [] as string[],
  checkAvailability: true,
  syncToGoogle: true
})

// Load staff list, appointment types, and rooms from store (no-op if already loaded)
onMounted(async () => {
  calendar.loadStaffList()
  calendar.loadAppointmentTypes()
  calendar.loadRooms()

  // Check if user has an active Zoom connection
  try {
    const connections = await $fetch<Array<{ provider: string, status: string }>>('/api/profile/video-connections')
    hasZoomConnection.value = connections.some(c => c.provider === 'zoom' && c.status === 'ACTIVE')
  } catch {
    // Not connected or endpoint unavailable
  }
})

// Parse locationConfig to determine locationType
function parseLocationConfig(data: Record<string, any>): string {
  if (data.locationConfig) {
    try {
      const config = typeof data.locationConfig === 'string' ? JSON.parse(data.locationConfig) : data.locationConfig
      if (config.type === 'room' && config.roomId) return 'room:' + config.roomId
      if (config.type === 'video') return 'video:' + (config.provider || 'zoom')
      if (config.type === 'custom') return 'custom'
    }
    catch { /* fall through */ }
  }
  if (data.location) return 'custom'
  return 'none'
}

// Populate form when editing — derive date, time, duration from start/end
watch(() => props.initialData, (data) => {
  if (data) {
    let date = ''
    let time = '09:00'
    let durationMinutes = 60

    if (data.startTime) {
      const start = new Date(data.startTime)
      const pad = (n: number) => String(n).padStart(2, '0')
      date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
      // Snap to nearest 15-min interval
      const snappedMin = Math.round(start.getMinutes() / 15) * 15
      time = `${pad(start.getHours())}:${pad(snappedMin % 60)}`

      if (data.endTime) {
        const end = new Date(data.endTime)
        const diffMs = end.getTime() - start.getTime()
        const diffMin = Math.round(diffMs / 60000)
        // Pick closest duration option, or use exact value
        durationMinutes = durationOptions.includes(diffMin) ? diffMin : diffMin
      }
    }

    form.value = {
      title: data.title || '',
      description: data.description || '',
      date,
      time,
      durationMinutes,
      location: data.location || '',
      locationType: parseLocationConfig(data),
      appointmentTypeId: data.appointmentTypeId || '',
      matterId: data.matterId || '',
      attendeeIds: data.attendeeIds || [],
      checkAvailability: true,
      syncToGoogle: true
    }
    // Populate selectedPeople from initialData if available
    selectedPeople.value = data.invitees || []

    // When editing, go straight to manual time mode
    // When creating from a calendar slot click (has startTime but not editing), pre-select the date in the slot picker
    if (props.editing) {
      manualTimeMode.value = true
    } else if (date) {
      slotPickerInitialDate.value = date
    }
  }
}, { immediate: true })

// Reset form when modal opens fresh (no initialData)
watch(isOpen, (open) => {
  if (open && !props.initialData) {
    previousAutoTitle.value = ''
    form.value = {
      title: '',
      description: '',
      date: '',
      time: '09:00',
      durationMinutes: 60,
      location: '',
      locationType: 'none',
      appointmentTypeId: '',
      matterId: '',
      attendeeIds: [],
      checkAvailability: true,
      syncToGoogle: true
    }
    selectedPeople.value = []
    personSearch.value = ''
    showQuickAdd.value = false
    quickAddFirstName.value = ''
    quickAddLastName.value = ''
    manualTimeMode.value = false
    slotWasSelected.value = false
    slotPickerInitialDate.value = undefined
  }
})

// When attendees change, reset to slot picker mode (selection is no longer valid)
watch(() => form.value.attendeeIds, () => {
  if (!props.editing) {
    manualTimeMode.value = false
    slotWasSelected.value = false
  }
}, { deep: true })

// Slot picker handlers
function onSlotSelected(slot: { startTime: string, endTime: string, date: string, time: string }) {
  form.value.date = slot.date
  form.value.time = slot.time
  manualTimeMode.value = true
  slotWasSelected.value = true
}

function onPickManually() {
  manualTimeMode.value = true
  slotWasSelected.value = false
}

function returnToSlotPicker() {
  manualTimeMode.value = false
  slotWasSelected.value = false
  slotPickerInitialDate.value = form.value.date || undefined
  form.value.date = ''
  form.value.time = '09:00'
}

async function onPersonSearchInput() {
  const query = personSearch.value
  if (query.length < 2) {
    personOptions.value = []
    return
  }
  personSearchLoading.value = true
  try {
    const results = await $fetch<any>(`/api/people?search=${encodeURIComponent(query)}&page=1&limit=10`)
    const people = results.people || results
    const selectedIds = new Set(selectedPeople.value.map(p => p.id))
    personOptions.value = (Array.isArray(people) ? people : [])
      .filter((p: any) => !selectedIds.has(p.id))
      .map((p: any) => ({
        label: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || p.id,
        value: p.id
      }))
  }
  catch {
    personOptions.value = []
  }
  finally {
    personSearchLoading.value = false
  }
}

function addPerson(option: { label: string, value: string }) {
  if (!selectedPeople.value.some(p => p.id === option.value)) {
    selectedPeople.value.push({ id: option.value, name: option.label })
  }
  personSearch.value = ''
  personOptions.value = []
}

function removePerson(id: string) {
  selectedPeople.value = selectedPeople.value.filter(p => p.id !== id)
}

function hidePersonDropdown() {
  setTimeout(() => { showPersonDropdown.value = false }, 200)
}

function openQuickAdd() {
  const parts = personSearch.value.trim().split(/\s+/)
  quickAddFirstName.value = parts[0] || ''
  quickAddLastName.value = parts.slice(1).join(' ')
  showQuickAdd.value = true
  showPersonDropdown.value = false
}

function onQuickAddPersonCreated(person: { id: string; name: string; email: string | null; phone: string | null }) {
  addPerson({ label: person.name, value: person.id })
  showQuickAdd.value = false
  personSearch.value = ''
  personOptions.value = []
}

function onTypeChange() {
  const typeId = form.value.appointmentTypeId
  if (!typeId) return
  const type = calendar.getTypeById(typeId)
  if (!type) return

  // Auto-fill title from appointment type name (only if empty or was previously auto-filled)
  if (!form.value.title || form.value.title === previousAutoTitle.value) {
    form.value.title = type.name
    previousAutoTitle.value = type.name
  }

  // Auto-fill duration from appointment type
  if (durationOptions.includes(type.defaultDurationMinutes)) {
    form.value.durationMinutes = type.defaultDurationMinutes
  }

  // Auto-fill location from defaultLocationConfig if available
  if (form.value.locationType === 'none') {
    if (type.defaultLocationConfig) {
      try {
        const config = typeof type.defaultLocationConfig === 'string' ?
            JSON.parse(type.defaultLocationConfig) :
          type.defaultLocationConfig
        if (config.type === 'room' && config.roomId) {
          form.value.locationType = 'room:' + config.roomId
          const room = calendar.rooms.find(r => r.id === config.roomId)
          form.value.location = room ? (room.building ? `${room.name}, ${room.building}` : room.name) : ''
        }
        else if (config.type === 'video') {
          form.value.locationType = 'video:' + (config.provider || 'zoom')
          form.value.location = config.provider === 'zoom' ? 'Zoom Meeting' : 'Google Meet'
        }
        else if (config.type === 'custom' && config.text) {
          form.value.locationType = 'custom'
          form.value.location = config.text
        }
      }
      catch { /* ignore */ }
    }
    else if (type.defaultLocation) {
      form.value.locationType = 'custom'
      form.value.location = type.defaultLocation
    }
  }
}

function onLocationTypeChange() {
  const lt = form.value.locationType
  if (lt === 'none') {
    form.value.location = ''
  }
  else if (lt.startsWith('room:')) {
    const roomId = lt.replace('room:', '')
    const room = calendar.rooms.find(r => r.id === roomId)
    form.value.location = room ? (room.building ? `${room.name}, ${room.building}` : room.name) : ''
  }
  else if (lt === 'video:zoom') {
    form.value.location = 'Zoom Meeting'
  }
  else if (lt === 'custom') {
    form.value.location = ''
  }
}

async function handleSubmit() {
  if (!form.value.title || !form.value.date || !form.value.time) return

  if (selectedTypeIsClientFacing.value && selectedPeople.value.length === 0) {
    toast.warning('This appointment type is client-facing — please add at least one person')
    return
  }

  submitting.value = true
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Compute start and end from date + time + duration
    const startDate = new Date(`${form.value.date}T${form.value.time}:00`)
    const endDate = new Date(startDate.getTime() + form.value.durationMinutes * 60 * 1000)

    // Build locationConfig from locationType
    let locationConfig: any = undefined
    let roomId: string | undefined = undefined
    const lt = form.value.locationType

    if (lt.startsWith('room:')) {
      roomId = lt.replace('room:', '')
      locationConfig = { type: 'room', roomId }
    }
    else if (lt.startsWith('video:')) {
      const provider = lt.replace('video:', '')
      locationConfig = { type: 'video', provider }
    }
    else if (lt === 'custom' && form.value.location) {
      locationConfig = { type: 'custom', text: form.value.location }
    }

    const payload: Record<string, any> = {
      title: form.value.title,
      description: form.value.description || undefined,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      location: form.value.location || undefined,
      locationConfig: locationConfig ? JSON.stringify(locationConfig) : undefined,
      roomId,
      timezone,
      appointmentTypeId: form.value.appointmentTypeId || undefined,
      inviteeIds: selectedPeople.value.map(p => p.id),
      matterId: form.value.matterId || undefined,
      attendeeIds: form.value.attendeeIds,
      checkAvailability: form.value.checkAvailability,
      syncToGoogle: form.value.syncToGoogle
    }

    // Set legacy appointmentType for backward compat
    if (form.value.appointmentTypeId) {
      const type = calendar.getTypeById(form.value.appointmentTypeId)
      if (type) {
        // Map name to legacy enum if possible
        const legacyMap: Record<string, string> = {
          'consultation': 'CONSULTATION', 'meeting': 'MEETING', 'call': 'CALL',
          'follow up': 'FOLLOW_UP', 'signing': 'SIGNING', 'other': 'OTHER'
        }
        payload.appointmentType = legacyMap[type.name.toLowerCase()] || 'OTHER'
      }
    }

    emit('submit', payload)
    isOpen.value = false
  }
  finally {
    submitting.value = false
  }
}
</script>
