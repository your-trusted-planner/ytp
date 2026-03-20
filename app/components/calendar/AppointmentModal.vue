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

      <!-- Date/Time -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Start *</label>
          <input
            v-model="form.startTime"
            type="datetime-local"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">End *</label>
          <input
            v-model="form.endTime"
            type="datetime-local"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
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

      <!-- Client Search -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Client (optional)</label>
        <UiAutocomplete
          v-model="form.clientId"
          :options="clientOptions"
          label-key="label"
          value-key="value"
          placeholder="Search clients..."
          @search="searchClients"
        />
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

      <!-- Staff Attendees -->
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

      <!-- Sync to Google -->
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
import { useCalendarStore } from '~/stores/useCalendarStore'

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
const clientOptions = ref<Array<{ label: string, value: string }>>([])
const matters = ref<Array<{ id: string, title: string }>>([])

// Use the store's shared staff list instead of fetching independently
const staffList = computed(() => calendar.staffList)

const form = ref({
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  location: '',
  locationType: 'none' as string,
  appointmentTypeId: '',
  clientId: '',
  matterId: '',
  attendeeIds: [] as string[],
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

// Populate form when editing
watch(() => props.initialData, (data) => {
  if (data) {
    form.value = {
      title: data.title || '',
      description: data.description || '',
      startTime: data.startTime ? toLocalDatetime(data.startTime) : '',
      endTime: data.endTime ? toLocalDatetime(data.endTime) : '',
      location: data.location || '',
      locationType: parseLocationConfig(data),
      appointmentTypeId: data.appointmentTypeId || '',
      clientId: data.clientId || '',
      matterId: data.matterId || '',
      attendeeIds: data.attendeeIds || [],
      syncToGoogle: true
    }
  }
}, { immediate: true })

// Reset form when modal opens fresh (no initialData)
watch(isOpen, (open) => {
  if (open && !props.initialData) {
    form.value = {
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      location: '',
      locationType: 'none',
      appointmentTypeId: '',
      clientId: '',
      matterId: '',
      attendeeIds: [],
      syncToGoogle: true
    }
  }
})

function toLocalDatetime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function searchClients(query: string) {
  if (query.length < 2) {
    clientOptions.value = []
    return
  }
  try {
    const results = await $fetch<any[]>(`/api/clients?search=${encodeURIComponent(query)}&limit=10`)
    clientOptions.value = results.map((c: any) => ({
      label: c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.email || c.id,
      value: c.id
    }))
  }
  catch {
    clientOptions.value = []
  }
}

// Load matters when clientId changes
watch(() => form.value.clientId, async (clientId) => {
  if (!clientId) {
    matters.value = []
    return
  }
  try {
    const result = await $fetch<any[]>(`/api/matters?clientId=${clientId}`)
    matters.value = result.map(m => ({ id: m.id, title: m.title }))
  }
  catch {
    matters.value = []
  }
})

function onTypeChange() {
  const typeId = form.value.appointmentTypeId
  if (!typeId) return
  const type = calendar.getTypeById(typeId)
  if (!type) return

  // Auto-fill duration (adjust end time) if start is set
  if (form.value.startTime) {
    const start = new Date(form.value.startTime)
    const end = new Date(start.getTime() + type.defaultDurationMinutes * 60 * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    form.value.endTime = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`
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
  if (!form.value.title || !form.value.startTime || !form.value.endTime) return

  submitting.value = true
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

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
      startTime: new Date(form.value.startTime).toISOString(),
      endTime: new Date(form.value.endTime).toISOString(),
      location: form.value.location || undefined,
      locationConfig: locationConfig ? JSON.stringify(locationConfig) : undefined,
      roomId,
      timezone,
      appointmentTypeId: form.value.appointmentTypeId || undefined,
      clientId: form.value.clientId || undefined,
      matterId: form.value.matterId || undefined,
      attendeeIds: form.value.attendeeIds,
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
