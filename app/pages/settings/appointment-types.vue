<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          Appointment Types
        </h1>
        <p class="text-gray-600 mt-1">
          Configure bookable appointment types with custom durations, fees, and booking links
        </p>
      </div>
      <UiButton @click="openAddModal">
        Add Appointment Type
      </UiButton>
    </div>

    <!-- System Default Business Hours -->
    <UiCard>
      <div class="flex items-start justify-between">
        <div>
          <h3 class="font-medium text-gray-900">
            Default Business Hours
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            Availability shown to prospects when booking. Individual appointment types can override this.
          </p>
          <div
            v-if="systemHours"
            class="mt-3 flex items-center gap-4 text-sm text-gray-700"
          >
            <span class="font-medium">{{ formatHour(systemHours.start) }} - {{ formatHour(systemHours.end) }}</span>
            <span class="text-gray-400">|</span>
            <span>{{ systemHours.days.map(d => dayNames[d]).join(', ') }}</span>
          </div>
          <div
            v-else
            class="mt-3 text-sm text-gray-400"
          >
            Loading...
          </div>
        </div>
        <UiButton
          variant="outline"
          size="sm"
          @click="showHoursModal = true"
        >
          Edit
        </UiButton>
      </div>
    </UiCard>

    <!-- Business Hours Modal -->
    <UiModal
      v-model="showHoursModal"
      title="Default Business Hours"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UiSelect
            v-model="hoursForm.start"
            label="Start Hour"
          >
            <option
              v-for="h in 24"
              :key="h-1"
              :value="h-1"
            >
              {{ formatHour(h-1) }}
            </option>
          </UiSelect>
          <UiSelect
            v-model="hoursForm.end"
            label="End Hour"
          >
            <option
              v-for="h in 24"
              :key="h"
              :value="h"
            >
              {{ formatHour(h) }}
            </option>
          </UiSelect>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Business Days</label>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="(dayName, dayIndex) in dayNames"
              :key="dayIndex"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-sm cursor-pointer transition-colors"
              :class="hoursForm.days.includes(dayIndex) ? 'bg-accent-50 border-accent-300 text-accent-700' : 'bg-white border-gray-300 text-gray-600'"
            >
              <input
                v-model="hoursForm.days"
                type="checkbox"
                :value="dayIndex"
                class="sr-only"
              >
              {{ dayName }}
            </label>
          </div>
        </div>
      </div>
      <template #footer>
        <UiButton
          variant="outline"
          @click="showHoursModal = false"
        >
          Cancel
        </UiButton>
        <UiButton
          :is-loading="savingHours"
          @click="saveBusinessHours"
        >
          Save
        </UiButton>
      </template>
    </UiModal>

    <!-- Loading -->
    <div
      v-if="loading"
      class="text-center py-12 text-gray-500"
    >
      Loading appointment types...
    </div>

    <!-- Types Grid -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <UiCard
        v-for="type in types"
        :key="type.id"
        :padding="false"
        class="hover:shadow-lg transition-shadow"
      >
        <div class="p-6">
          <div class="flex justify-between items-start mb-3">
            <div class="flex items-center gap-3">
              <div
                class="w-4 h-4 rounded-full flex-shrink-0"
                :style="{ backgroundColor: type.color }"
              />
              <div>
                <h3 class="font-semibold text-gray-900 text-lg">
                  {{ type.name }}
                </h3>
                <p class="text-xs text-gray-400 font-mono">
                  /book/{{ type.slug }}
                </p>
              </div>
            </div>
            <div class="flex gap-1">
              <UiBadge
                v-if="type.isPubliclyBookable"
                variant="success"
                size="sm"
              >
                Public
              </UiBadge>
              <UiBadge
                v-else
                variant="default"
                size="sm"
              >
                Internal
              </UiBadge>
              <UiBadge
                v-if="!type.isActive"
                variant="danger"
                size="sm"
              >
                Inactive
              </UiBadge>
            </div>
          </div>

          <p
            v-if="type.description"
            class="text-sm text-gray-600 mb-4 line-clamp-2"
          >
            {{ type.description }}
          </p>

          <div class="space-y-2 border-t border-gray-200 pt-4">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Duration:</span>
              <span class="font-medium text-gray-900">{{ type.defaultDurationMinutes }} min</span>
            </div>
            <div
              v-if="type.consultationFeeEnabled"
              class="flex justify-between text-sm"
            >
              <span class="text-gray-600">Fee:</span>
              <span class="font-medium text-gray-900">${{ (type.consultationFee / 100).toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Eligible Staff:</span>
              <span class="font-medium text-gray-900">
                {{ type.staffEligibility === 'attorneys_only' ? 'Attorneys only' : type.staffEligibility === 'specific' && type.assignedAttorneyIds ? `${type.assignedAttorneyIds.length} assigned` : 'All staff' }}
              </span>
            </div>
          </div>

          <!-- Booking Links Panel (for public types) -->
          <div
            v-if="type.isPubliclyBookable && type.isActive"
            class="mt-4 border-t border-gray-200 pt-4"
          >
            <p class="text-xs font-medium text-gray-500 uppercase mb-2">
              Booking Links
            </p>
            <div class="space-y-1.5">
              <!-- Generic link -->
              <div class="flex items-center justify-between">
                <code class="text-xs text-gray-600 truncate flex-1">/book/{{ type.slug }}</code>
                <span class="text-[10px] text-gray-400 mx-1 flex-shrink-0">generic</span>
                <button
                  class="text-xs text-accent-600 hover:text-accent-800 ml-1 flex-shrink-0"
                  @click="copyLink(`/book/${type.slug}`)"
                >
                  Copy
                </button>
              </div>
              <!-- Per-staff links -->
              <div
                v-for="staff in getEligibleStaff(type)"
                :key="staff.id"
                class="flex items-center justify-between"
              >
                <code class="text-xs text-gray-600 truncate flex-1">/book/{{ type.slug }}/{{ staffSlug(staff) }}</code>
                <span class="text-[10px] text-gray-400 mx-1 flex-shrink-0 truncate max-w-[80px]">{{ staff.name }}</span>
                <button
                  class="text-xs text-accent-600 hover:text-accent-800 ml-1 flex-shrink-0"
                  @click="copyLink(`/book/${type.slug}/${staffSlug(staff)}`)"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          <div class="mt-4 flex space-x-2">
            <button
              class="flex-1 text-sm text-accent-600 hover:text-accent-900 font-medium"
              @click="editType(type)"
            >
              Edit
            </button>
            <button
              class="flex-1 text-sm text-gray-600 hover:text-gray-900 font-medium"
              @click="toggleStatus(type)"
            >
              {{ type.isActive ? 'Deactivate' : 'Activate' }}
            </button>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Empty State -->
    <div
      v-if="!loading && types.length === 0"
      class="text-center py-12"
    >
      <p class="text-gray-500">
        No appointment types configured yet.
      </p>
      <UiButton
        class="mt-4"
        @click="openAddModal"
      >
        Create Your First Type
      </UiButton>
    </div>

    <!-- Add/Edit Modal -->
    <UiModal
      v-model="showModal"
      :title="editing ? 'Edit Appointment Type' : 'Add Appointment Type'"
      size="lg"
    >
      <form
        class="space-y-4"
        @submit.prevent="handleSave"
      >
        <UiInput
          v-model="form.name"
          label="Name"
          placeholder="e.g., Initial WYDAPT Consultation"
          required
        />

        <div class="grid grid-cols-2 gap-4">
          <UiInput
            v-model="form.slug"
            label="URL Slug"
            placeholder="Auto-generated from name"
          />
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div class="flex items-center gap-2">
              <input
                v-model="form.color"
                type="color"
                class="w-10 h-10 rounded border border-gray-300 cursor-pointer"
              >
              <div class="flex gap-1 flex-wrap">
                <button
                  v-for="swatch in colorSwatches"
                  :key="swatch"
                  type="button"
                  class="w-6 h-6 rounded-full border-2 transition-transform"
                  :class="form.color === swatch ? 'border-gray-800 scale-110' : 'border-transparent'"
                  :style="{ backgroundColor: swatch }"
                  @click="form.color = swatch"
                />
              </div>
            </div>
          </div>
        </div>

        <UiTextarea
          v-model="form.description"
          label="Description"
          placeholder="Describe this appointment type for prospects..."
          :rows="3"
        />

        <UiInput
          v-model="form.defaultDurationMinutes"
          label="Duration (minutes)"
          type="number"
          min="5"
          max="480"
        />

        <!-- Default Location -->
        <div class="border rounded-lg p-4 space-y-3">
          <label class="block text-sm font-medium text-gray-700">Default Location</label>
          <select
            v-model="form.locationType"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="none">
              No default location
            </option>
            <option value="room">
              Room
            </option>
            <option value="video">
              Video Meeting
            </option>
            <option value="custom">
              Custom Text
            </option>
          </select>

          <!-- Room Selector -->
          <div v-if="form.locationType === 'room'">
            <select
              v-model="form.locationRoomId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">
                Select a room...
              </option>
              <option
                v-for="room in activeRooms"
                :key="room.id"
                :value="room.id"
              >
                {{ room.name }}{{ room.building ? ` (${room.building})` : '' }}
              </option>
            </select>
            <p
              v-if="activeRooms.length === 0"
              class="text-xs text-gray-400 mt-1"
            >
              No rooms configured. <NuxtLink
                to="/settings/rooms"
                class="text-accent-600 underline"
              >Add rooms</NuxtLink>
            </p>
          </div>

          <!-- Video Provider Selector -->
          <div v-if="form.locationType === 'video'">
            <select
              v-model="form.locationVideoProvider"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="zoom">
                Zoom
              </option>
              <option
                value="google_meet"
                disabled
              >
                Google Meet (coming soon)
              </option>
            </select>
          </div>

          <!-- Custom Text -->
          <UiInput
            v-if="form.locationType === 'custom'"
            v-model="form.defaultLocation"
            placeholder="e.g., Zoom, Office"
          />
        </div>

        <!-- Consultation Fee -->
        <div class="border rounded-lg p-4 space-y-3">
          <UiToggle
            v-model="form.consultationFeeEnabled"
            label="Consultation Fee"
            description="Require payment before booking"
          />
          <UiInput
            v-if="form.consultationFeeEnabled"
            v-model="form.consultationFeeDisplay"
            label="Fee Amount ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="375.00"
          />
        </div>

        <!-- Visibility -->
        <div class="border rounded-lg p-4 space-y-3">
          <UiToggle
            v-model="form.isPubliclyBookable"
            label="Publicly Bookable"
            description="Show on public booking page with a shareable link"
          />
        </div>

        <!-- Eligible Staff -->
        <div class="border rounded-lg p-4 space-y-3">
          <label class="block text-sm font-medium text-gray-700">Eligible Staff</label>
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.staffEligibility"
                type="radio"
                value="any"
                class="text-accent-600 focus:ring-accent-500"
              >
              <span class="text-sm text-gray-700">Any staff member with a calendar</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.staffEligibility"
                type="radio"
                value="attorneys_only"
                class="text-accent-600 focus:ring-accent-500"
              >
              <span class="text-sm text-gray-700">Attorneys only</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.staffEligibility"
                type="radio"
                value="specific"
                class="text-accent-600 focus:ring-accent-500"
              >
              <span class="text-sm text-gray-700">Specific people</span>
            </label>
          </div>
          <div
            v-if="form.staffEligibility === 'specific'"
            class="space-y-2 pt-2"
          >
            <p class="text-sm text-gray-600">
              Select eligible staff members:
            </p>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="staff in staffList"
                :key="staff.id"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-sm cursor-pointer transition-colors"
                :class="form.assignedAttorneyIds.includes(staff.id) ? 'bg-accent-50 border-accent-300 text-accent-700' : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'"
              >
                <input
                  v-model="form.assignedAttorneyIds"
                  type="checkbox"
                  :value="staff.id"
                  class="sr-only"
                >
                {{ staff.name }}
              </label>
            </div>
          </div>
        </div>

        <!-- Business Hours Override -->
        <div class="border rounded-lg p-4 space-y-3">
          <UiToggle
            v-model="customBusinessHours"
            label="Custom Business Hours"
            description="Override the default 9 AM - 5 PM, Monday-Friday schedule"
          />
          <div
            v-if="customBusinessHours"
            class="space-y-3"
          >
            <div class="grid grid-cols-2 gap-4">
              <UiSelect
                v-model="form.businessHoursStart"
                label="Start Hour"
              >
                <option
                  v-for="h in 24"
                  :key="h-1"
                  :value="h-1"
                >
                  {{ formatHour(h-1) }}
                </option>
              </UiSelect>
              <UiSelect
                v-model="form.businessHoursEnd"
                label="End Hour"
              >
                <option
                  v-for="h in 24"
                  :key="h"
                  :value="h"
                >
                  {{ formatHour(h) }}
                </option>
              </UiSelect>
            </div>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="(dayName, dayIndex) in dayNames"
                :key="dayIndex"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-sm cursor-pointer transition-colors"
                :class="form.businessHoursDays.includes(dayIndex) ? 'bg-accent-50 border-accent-300 text-accent-700' : 'bg-white border-gray-300 text-gray-600'"
              >
                <input
                  v-model="form.businessHoursDays"
                  type="checkbox"
                  :value="dayIndex"
                  class="sr-only"
                >
                {{ dayName }}
              </label>
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <UiButton
          variant="outline"
          @click="closeModal"
        >
          Cancel
        </UiButton>
        <UiButton
          :is-loading="saving"
          @click="handleSave"
        >
          {{ editing ? 'Update' : 'Create' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Calendar } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const toast = useToast()

interface AppointmentType {
  id: string
  name: string
  slug: string
  description: string | null
  defaultDurationMinutes: number
  color: string
  consultationFee: number
  consultationFeeEnabled: boolean
  questionnaireId: string | null
  serviceCatalogId: string | null
  staffEligibility: 'any' | 'attorneys_only' | 'specific'
  assignedAttorneyIds: string[] | null
  businessHours: { start: number, end: number, days: number[] } | null
  defaultLocation: string | null
  defaultLocationConfig: any | null
  isPubliclyBookable: boolean
  isActive: boolean
  displayOrder: number
}

interface Room {
  id: string
  name: string
  building: string | null
  isActive: boolean
}

interface StaffMember {
  id: string
  name: string
  email: string
}

const types = ref<AppointmentType[]>([])
const staffList = ref<StaffMember[]>([])
const activeRooms = ref<Room[]>([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editing = ref<AppointmentType | null>(null)

// System default business hours
const systemHours = ref<{ start: number, end: number, days: number[] } | null>(null)
const showHoursModal = ref(false)
const savingHours = ref(false)
const hoursForm = ref({ start: 9, end: 17, days: [1, 2, 3, 4, 5] as number[] })

const colorSwatches = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  '#f97316', '#eab308', '#22c55e', '#6b7280'
]

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const form = ref({
  name: '',
  slug: '',
  description: '',
  defaultDurationMinutes: 60,
  color: '#6366f1',
  consultationFeeEnabled: false,
  consultationFeeDisplay: '',
  defaultLocation: '',
  locationType: 'none' as 'none' | 'room' | 'video' | 'custom',
  locationRoomId: '',
  locationVideoProvider: 'zoom' as 'zoom' | 'google_meet',
  isPubliclyBookable: false,
  staffEligibility: 'any' as 'any' | 'attorneys_only' | 'specific',
  assignedAttorneyIds: [] as string[],
  businessHoursStart: 9,
  businessHoursEnd: 17,
  businessHoursDays: [1, 2, 3, 4, 5] as number[]
})

const customBusinessHours = ref(false)

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Auto-generate slug from name when adding (not editing)
watch(() => form.value.name, (name) => {
  if (!editing.value && name) {
    form.value.slug = slugify(name)
  }
})

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  if (h === 24) return '12 AM (next day)'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

async function fetchTypes() {
  loading.value = true
  try {
    types.value = await $fetch<AppointmentType[]>('/api/admin/appointment-types')
  }
  catch (error) {
    toast.error('Failed to load appointment types')
  }
  finally {
    loading.value = false
  }
}

async function fetchStaff() {
  try {
    const calendars = await $fetch<any[]>('/api/admin/calendars')
    const seen = new Set<string>()
    staffList.value = calendars
      .filter((c) => {
        if (seen.has(c.attorneyId)) return false
        seen.add(c.attorneyId)
        return true
      })
      .map(c => ({
        id: c.attorneyId,
        name: c.attorneyName || c.attorneyEmail,
        email: c.attorneyEmail || ''
      }))
  }
  catch {
    // Non-admin or no calendars configured
  }
}

function openAddModal() {
  editing.value = null
  form.value = {
    name: '',
    slug: '',
    description: '',
    defaultDurationMinutes: 60,
    color: '#6366f1',
    consultationFeeEnabled: false,
    consultationFeeDisplay: '',
    defaultLocation: '',
    locationType: 'none',
    locationRoomId: '',
    locationVideoProvider: 'zoom',
    isPubliclyBookable: false,
    staffEligibility: 'any',
    assignedAttorneyIds: [],
    businessHoursStart: 9,
    businessHoursEnd: 17,
    businessHoursDays: [1, 2, 3, 4, 5]
  }
  customBusinessHours.value = false
  showModal.value = true
}

function editType(type: AppointmentType) {
  editing.value = type

  // Parse location config to populate structured fields
  let locationType: 'none' | 'room' | 'video' | 'custom' = 'none'
  let locationRoomId = ''
  let locationVideoProvider: 'zoom' | 'google_meet' = 'zoom'

  if (type.defaultLocationConfig) {
    const config = type.defaultLocationConfig
    if (config.type === 'room') {
      locationType = 'room'
      locationRoomId = config.roomId || ''
    }
    else if (config.type === 'video') {
      locationType = 'video'
      locationVideoProvider = config.provider || 'zoom'
    }
    else if (config.type === 'custom') {
      locationType = 'custom'
    }
  }
  else if (type.defaultLocation) {
    // Legacy: has free-text location but no structured config
    locationType = 'custom'
  }

  form.value = {
    name: type.name,
    slug: type.slug,
    description: type.description || '',
    defaultDurationMinutes: type.defaultDurationMinutes,
    color: type.color,
    consultationFeeEnabled: type.consultationFeeEnabled,
    consultationFeeDisplay: type.consultationFee ? (type.consultationFee / 100).toFixed(2) : '',
    defaultLocation: type.defaultLocation || (type.defaultLocationConfig?.type === 'custom' ? type.defaultLocationConfig.text : '') || '',
    locationType,
    locationRoomId,
    locationVideoProvider,
    isPubliclyBookable: type.isPubliclyBookable,
    staffEligibility: type.staffEligibility || 'any',
    assignedAttorneyIds: type.assignedAttorneyIds ? [...type.assignedAttorneyIds] : [],
    businessHoursStart: type.businessHours?.start ?? 9,
    businessHoursEnd: type.businessHours?.end ?? 17,
    businessHoursDays: type.businessHours?.days ?? [1, 2, 3, 4, 5]
  }
  customBusinessHours.value = !!type.businessHours
  showModal.value = true
}

async function handleSave() {
  saving.value = true
  try {
    // Build defaultLocationConfig from structured fields
    let defaultLocationConfig: any = null
    let defaultLocation: string | null = null

    if (form.value.locationType === 'room' && form.value.locationRoomId) {
      defaultLocationConfig = { type: 'room', roomId: form.value.locationRoomId }
      // Resolve room name for display string
      const room = activeRooms.value.find(r => r.id === form.value.locationRoomId)
      if (room) {
        defaultLocation = room.building ? `${room.name}, ${room.building}` : room.name
      }
    }
    else if (form.value.locationType === 'video') {
      defaultLocationConfig = { type: 'video', provider: form.value.locationVideoProvider }
      defaultLocation = form.value.locationVideoProvider === 'zoom' ? 'Zoom Meeting' : 'Google Meet'
    }
    else if (form.value.locationType === 'custom' && form.value.defaultLocation) {
      defaultLocationConfig = { type: 'custom', text: form.value.defaultLocation }
      defaultLocation = form.value.defaultLocation
    }

    const payload: Record<string, any> = {
      name: form.value.name,
      slug: form.value.slug || slugify(form.value.name),
      description: form.value.description || null,
      defaultDurationMinutes: Number(form.value.defaultDurationMinutes),
      color: form.value.color,
      consultationFeeEnabled: form.value.consultationFeeEnabled,
      consultationFee: form.value.consultationFeeEnabled ?
          Math.round(parseFloat(form.value.consultationFeeDisplay || '0') * 100) :
        0,
      defaultLocation,
      defaultLocationConfig,
      isPubliclyBookable: form.value.isPubliclyBookable,
      staffEligibility: form.value.staffEligibility,
      assignedAttorneyIds: form.value.staffEligibility === 'specific' ? form.value.assignedAttorneyIds : null,
      businessHours: customBusinessHours.value ?
          {
            start: Number(form.value.businessHoursStart),
            end: Number(form.value.businessHoursEnd),
            days: form.value.businessHoursDays
          } :
        null
    }

    if (editing.value) {
      await $fetch(`/api/admin/appointment-types/${editing.value.id}`, {
        method: 'PUT',
        body: payload
      })
      toast.success('Appointment type updated')
    }
    else {
      await $fetch('/api/admin/appointment-types', {
        method: 'POST',
        body: payload
      })
      toast.success('Appointment type created')
    }

    closeModal()
    await fetchTypes()
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Failed to save appointment type')
  }
  finally {
    saving.value = false
  }
}

async function toggleStatus(type: AppointmentType) {
  try {
    if (type.isActive) {
      await $fetch(`/api/admin/appointment-types/${type.id}`, { method: 'DELETE' })
      toast.success(`${type.name} deactivated`)
    }
    else {
      await $fetch(`/api/admin/appointment-types/${type.id}`, {
        method: 'PUT',
        body: { isActive: true }
      })
      toast.success(`${type.name} activated`)
    }
    await fetchTypes()
  }
  catch {
    toast.error('Failed to update status')
  }
}

function closeModal() {
  showModal.value = false
  editing.value = null
}

function staffSlug(staff: StaffMember): string {
  return staff.name.toLowerCase().replace(/\s+/g, '-')
}

function getEligibleStaff(type: AppointmentType): StaffMember[] {
  if (type.staffEligibility === 'specific' && type.assignedAttorneyIds && type.assignedAttorneyIds.length > 0) {
    return staffList.value.filter(s => type.assignedAttorneyIds!.includes(s.id))
  }
  // For 'any' and 'attorneys_only' — show all staff (role filtering happens server-side for bookings)
  return staffList.value
}

async function copyLink(path: string) {
  try {
    await navigator.clipboard.writeText(window.location.origin + path)
    toast.success('Link copied to clipboard')
  }
  catch {
    toast.error('Failed to copy link')
  }
}

async function fetchBusinessHours() {
  try {
    const data = await $fetch<{ start: number, end: number, days: number[] }>('/api/admin/settings/business-hours')
    systemHours.value = data
    hoursForm.value = { start: data.start, end: data.end, days: [...data.days] }
  }
  catch {
    // Default will show from the API
    systemHours.value = { start: 9, end: 17, days: [1, 2, 3, 4, 5] }
    hoursForm.value = { start: 9, end: 17, days: [1, 2, 3, 4, 5] }
  }
}

async function saveBusinessHours() {
  savingHours.value = true
  try {
    await $fetch('/api/admin/settings/business-hours', {
      method: 'PUT',
      body: {
        start: Number(hoursForm.value.start),
        end: Number(hoursForm.value.end),
        days: hoursForm.value.days
      }
    })
    systemHours.value = { ...hoursForm.value }
    showHoursModal.value = false
    toast.success('Business hours updated')
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Failed to save business hours')
  }
  finally {
    savingHours.value = false
  }
}

async function fetchRooms() {
  try {
    const allRooms = await $fetch<Room[]>('/api/admin/rooms')
    activeRooms.value = allRooms.filter(r => r.isActive)
  }
  catch {
    // No rooms configured — that's fine
  }
}

onMounted(() => {
  fetchTypes()
  fetchStaff()
  fetchBusinessHours()
  fetchRooms()
})
</script>
