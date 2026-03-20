<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          Rooms & Locations
        </h1>
        <p class="text-gray-600 mt-1">
          Manage conference rooms and meeting spaces with optional Google Calendar resource integration
        </p>
      </div>
      <UiButton @click="openAddModal">
        Add Room
      </UiButton>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="text-center py-12 text-gray-500"
    >
      Loading rooms...
    </div>

    <!-- Rooms Grid -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <UiCard
        v-for="room in roomList"
        :key="room.id"
        :padding="false"
        class="hover:shadow-lg transition-shadow"
      >
        <div class="p-6">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="font-semibold text-gray-900 text-lg">
                {{ room.name }}
              </h3>
              <p
                v-if="room.building"
                class="text-sm text-gray-500"
              >
                {{ room.building }}
              </p>
            </div>
            <div class="flex gap-1">
              <UiBadge
                v-if="room.calendarEmail"
                variant="success"
                size="sm"
              >
                Calendar
              </UiBadge>
              <UiBadge
                v-if="!room.isActive"
                variant="danger"
                size="sm"
              >
                Inactive
              </UiBadge>
            </div>
          </div>

          <p
            v-if="room.description"
            class="text-sm text-gray-600 mb-4 line-clamp-2"
          >
            {{ room.description }}
          </p>

          <div class="space-y-2 border-t border-gray-200 pt-4">
            <div
              v-if="room.capacity"
              class="flex justify-between text-sm"
            >
              <span class="text-gray-600">Capacity:</span>
              <span class="font-medium text-gray-900">{{ room.capacity }} people</span>
            </div>
            <div
              v-if="room.address"
              class="flex justify-between text-sm"
            >
              <span class="text-gray-600">Address:</span>
              <span class="font-medium text-gray-900 truncate ml-2">{{ room.address }}</span>
            </div>
            <div
              v-if="room.calendarEmail"
              class="flex justify-between text-sm"
            >
              <span class="text-gray-600">Calendar:</span>
              <span class="font-medium text-gray-900 truncate ml-2 text-xs">{{ room.calendarEmail }}</span>
            </div>
          </div>

          <div class="mt-4 flex space-x-2">
            <button
              class="flex-1 text-sm text-accent-600 hover:text-accent-900 font-medium"
              @click="editRoom(room)"
            >
              Edit
            </button>
            <button
              v-if="room.calendarEmail"
              class="flex-1 text-sm text-blue-600 hover:text-blue-900 font-medium"
              @click="testCalendar(room)"
            >
              {{ testingRoomId === room.id ? 'Testing...' : 'Test Calendar' }}
            </button>
            <button
              class="flex-1 text-sm text-gray-600 hover:text-gray-900 font-medium"
              @click="toggleStatus(room)"
            >
              {{ room.isActive ? 'Deactivate' : 'Activate' }}
            </button>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Empty State -->
    <div
      v-if="!loading && roomList.length === 0"
      class="text-center py-12"
    >
      <p class="text-gray-500">
        No rooms configured yet.
      </p>
      <UiButton
        class="mt-4"
        @click="openAddModal"
      >
        Create Your First Room
      </UiButton>
    </div>

    <!-- Add/Edit Modal -->
    <UiModal
      v-model="showModal"
      :title="editing ? 'Edit Room' : 'Add Room'"
      size="lg"
    >
      <form
        class="space-y-4"
        @submit.prevent="handleSave"
      >
        <UiInput
          v-model="form.name"
          label="Room Name"
          placeholder="e.g., Conf. Room A"
          required
        />

        <div class="grid grid-cols-2 gap-4">
          <UiInput
            v-model="form.building"
            label="Building"
            placeholder="e.g., Main Office"
          />
          <UiInput
            v-model="form.capacity"
            label="Capacity"
            type="number"
            min="1"
            placeholder="e.g., 8"
          />
        </div>

        <UiInput
          v-model="form.address"
          label="Address"
          placeholder="Physical address"
        />

        <UiTextarea
          v-model="form.description"
          label="Description"
          placeholder="Notes about this room..."
          :rows="2"
        />

        <!-- Calendar Integration -->
        <div class="border rounded-lg p-4 space-y-3">
          <h4 class="font-medium text-gray-900 text-sm">
            Calendar Resource (Optional)
          </h4>
          <p class="text-xs text-gray-500">
            Link to a Google Workspace resource calendar to track room availability and prevent double-bookings.
          </p>
          <UiInput
            v-model="form.calendarEmail"
            label="Resource Calendar Email"
            placeholder="e.g., room-a@resource.calendar.google.com"
            type="email"
          />
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
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const toast = useToast()

interface Room {
  id: string
  name: string
  building: string | null
  address: string | null
  capacity: number | null
  calendarEmail: string | null
  calendarProvider: string
  description: string | null
  isActive: boolean
  displayOrder: number
}

const roomList = ref<Room[]>([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editing = ref<Room | null>(null)
const testingRoomId = ref<string | null>(null)

const form = ref({
  name: '',
  building: '',
  address: '',
  capacity: '' as string | number,
  calendarEmail: '',
  description: ''
})

async function fetchRooms() {
  loading.value = true
  try {
    roomList.value = await $fetch<Room[]>('/api/admin/rooms')
  }
  catch {
    toast.error('Failed to load rooms')
  }
  finally {
    loading.value = false
  }
}

function openAddModal() {
  editing.value = null
  form.value = {
    name: '',
    building: '',
    address: '',
    capacity: '',
    calendarEmail: '',
    description: ''
  }
  showModal.value = true
}

function editRoom(room: Room) {
  editing.value = room
  form.value = {
    name: room.name,
    building: room.building || '',
    address: room.address || '',
    capacity: room.capacity || '',
    calendarEmail: room.calendarEmail || '',
    description: room.description || ''
  }
  showModal.value = true
}

async function handleSave() {
  saving.value = true
  try {
    const payload: Record<string, any> = {
      name: form.value.name,
      building: form.value.building || null,
      address: form.value.address || null,
      capacity: form.value.capacity ? Number(form.value.capacity) : null,
      calendarEmail: form.value.calendarEmail || null,
      description: form.value.description || null
    }

    if (editing.value) {
      await $fetch(`/api/admin/rooms/${editing.value.id}`, {
        method: 'PUT',
        body: payload
      })
      toast.success('Room updated')
    }
    else {
      await $fetch('/api/admin/rooms', {
        method: 'POST',
        body: payload
      })
      toast.success('Room created')
    }

    closeModal()
    await fetchRooms()
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Failed to save room')
  }
  finally {
    saving.value = false
  }
}

async function toggleStatus(room: Room) {
  try {
    if (room.isActive) {
      await $fetch(`/api/admin/rooms/${room.id}`, { method: 'DELETE' })
      toast.success(`${room.name} deactivated`)
    }
    else {
      await $fetch(`/api/admin/rooms/${room.id}`, {
        method: 'PUT',
        body: { isActive: true }
      })
      toast.success(`${room.name} activated`)
    }
    await fetchRooms()
  }
  catch {
    toast.error('Failed to update status')
  }
}

async function testCalendar(room: Room) {
  if (!room.calendarEmail) return
  testingRoomId.value = room.id
  try {
    // Use the first staff member's email as the impersonation target
    const calendars = await $fetch<any[]>('/api/admin/calendars')
    if (calendars.length === 0) {
      toast.error('No staff calendars configured — needed for impersonation')
      return
    }
    const impersonateEmail = calendars[0].calendarEmail

    const result = await $fetch<{ message: string }>('/api/admin/rooms/test-calendar', {
      method: 'POST',
      body: {
        calendarEmail: room.calendarEmail,
        impersonateEmail
      }
    })
    toast.success(result.message)
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Calendar test failed')
  }
  finally {
    testingRoomId.value = null
  }
}

function closeModal() {
  showModal.value = false
  editing.value = null
}

onMounted(() => {
  fetchRooms()
})
</script>
