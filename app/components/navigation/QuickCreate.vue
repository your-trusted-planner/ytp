<template>
  <div class="relative">
    <button
      ref="buttonRef"
      class="p-2 text-white/80 hover:text-white rounded-lg transition-colors"
      :class="{ 'text-white bg-white/10': isOpen }"
      title="Quick Create"
      @click="isOpen = !isOpen"
    >
      <Plus class="w-5 h-5" />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-40"
        @click="isOpen = false"
      />
      <div
        v-if="isOpen"
        class="fixed z-50 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
        :style="dropdownPosition"
      >
        <button
          v-for="item in createItems"
          :key="item.label"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          @click="handleAction(item)"
        >
          <component
            :is="item.icon"
            class="w-4 h-4 text-gray-400"
          />
          {{ item.label }}
        </button>
      </div>
    </Teleport>

    <!-- Appointment Modal -->
    <CalendarAppointmentModal
      v-model="showAppointmentModal"
      @submit="handleAppointmentSubmit"
    />

    <!-- Time Entry Modal -->
    <BillingTimeEntryModal
      v-if="showTimeEntryModal"
      @close="showTimeEntryModal = false"
      @created="showTimeEntryModal = false"
    />

    <!-- Matter Modal -->
    <MatterFormModal
      v-model="showMatterModal"
      :clients="matterData.clients"
      :lawyers="matterData.lawyers"
      :engagement-journeys="matterData.engagementJourneys"
      :catalog="matterData.catalog"
      @save="onModalDone"
    />
  </div>
</template>

<script setup lang="ts">
import {
  Plus, Calendar, UserPlus, Users, Briefcase, Clock, Receipt
} from 'lucide-vue-next'

const router = useRouter()
const isOpen = ref(false)
const buttonRef = ref<HTMLElement | null>(null)

const showAppointmentModal = ref(false)
const showTimeEntryModal = ref(false)
const showMatterModal = ref(false)

// Matter modal data — lazy-loaded on first open
const matterDataLoaded = ref(false)
const matterData = ref({
  clients: [] as any[],
  lawyers: [] as any[],
  engagementJourneys: [] as any[],
  catalog: [] as any[]
})

async function loadMatterData() {
  if (matterDataLoaded.value) return
  const [clientsRes, lawyersRes, journeysRes, catalogRes] = await Promise.all([
    $fetch<any>('/api/clients').catch(() => ({ clients: [] })),
    $fetch<any>('/api/matters/lawyers').catch(() => ({ lawyers: [] })),
    $fetch<any>('/api/journeys/engagement-templates').catch(() => ({ engagementJourneys: [] })),
    $fetch<any>('/api/catalog').catch(() => ({ services: [] }))
  ])
  matterData.value = {
    clients: clientsRes.clients || clientsRes || [],
    lawyers: lawyersRes.lawyers || [],
    engagementJourneys: journeysRes.engagementJourneys || [],
    catalog: catalogRes.services || catalogRes || []
  }
  matterDataLoaded.value = true
}

const dropdownPosition = computed(() => {
  if (!buttonRef.value) return { top: '56px', right: '16px' }
  const rect = buttonRef.value.getBoundingClientRect()
  return {
    top: `${rect.bottom + 4}px`,
    right: `${window.innerWidth - rect.right}px`
  }
})

const createItems = [
  { label: 'New Appointment', icon: Calendar, action: 'appointment' },
  { label: 'New Person', icon: UserPlus, action: 'navigate', path: '/clients/new?type=person' },
  { label: 'New Client', icon: Users, action: 'navigate', path: '/clients/new' },
  { label: 'New Matter', icon: Briefcase, action: 'matter' },
  { label: 'New Time Entry', icon: Clock, action: 'timeEntry' },
  { label: 'New Expense', icon: Receipt, action: 'navigate', path: '/billing/expenses/new' }
]

async function handleAction(item: typeof createItems[number]) {
  isOpen.value = false

  switch (item.action) {
    case 'appointment':
      showAppointmentModal.value = true
      break
    case 'matter':
      await loadMatterData()
      showMatterModal.value = true
      break
    case 'timeEntry':
      showTimeEntryModal.value = true
      break
    case 'navigate':
      if (item.path) router.push(item.path)
      break
  }
}

const toast = useToast()
const calendar = useCalendarStore()

async function handleAppointmentSubmit(data: Record<string, any>) {
  try {
    await calendar.createAppointment(data)
    toast.success('Appointment created')
  } catch (err: any) {
    toast.error(err.data?.message || 'Failed to create appointment')
  }
}

function onModalDone() {
  // Modals handle their own success toasts
}
</script>
