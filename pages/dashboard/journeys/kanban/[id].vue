<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <button @click="$router.back()" class="text-gray-600 hover:text-gray-900">
          <IconArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ journey?.name || 'Journey Kanban' }}</h1>
          <p class="text-gray-600 mt-1">Manage all clients in this journey</p>
        </div>
      </div>
      <div class="flex items-center space-x-3">
        <UiSelect v-model="filterStatus" @change="fetchKanbanData">
          <option value="">All Statuses</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
        </UiSelect>
        <button
          @click="refreshData"
          class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          :class="{ 'animate-spin': refreshing }"
        >
          <IconRefreshCw class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <IconLoader class="w-8 h-8 animate-spin text-burgundy-600" />
    </div>

    <!-- Kanban Board -->
    <div v-else class="overflow-x-auto pb-4">
      <div class="flex space-x-4 min-w-max">
        <!-- Step Columns -->
        <div
          v-for="step in steps"
          :key="step.id"
          class="flex-shrink-0 w-80"
        >
          <div
            :class="[
              'rounded-lg border-2 overflow-hidden',
              step.step_type === 'BRIDGE' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
            ]"
          >
            <!-- Column Header -->
            <div
              :class="[
                'p-4 font-semibold',
                step.step_type === 'BRIDGE' ? 'bg-blue-100' : 'bg-gray-50'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                  <IconCircleDot v-if="step.step_type === 'MILESTONE'" class="w-5 h-5 text-burgundy-600" />
                  <IconRepeat v-else class="w-5 h-5 text-blue-600" />
                  <h3 class="text-gray-900">{{ step.name }}</h3>
                </div>
                <span
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-medium',
                    step.step_type === 'BRIDGE' ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-700'
                  ]"
                >
                  {{ getClientsInStep(step.id).length }}
                </span>
              </div>
              <div v-if="getTotalValue(step.id) > 0" class="text-sm text-gray-600">
                Total: ${{ formatCurrency(getTotalValue(step.id)) }}
              </div>
            </div>

            <!-- Client Cards -->
            <div class="p-2 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
              <draggable
                :list="getClientsInStep(step.id)"
                group="clients"
                item-key="id"
                @end="onDragEnd($event, step.id)"
                class="space-y-2"
              >
                <template #item="{ element: clientJourney }">
                  <div
                    class="bg-white border border-gray-200 rounded-lg p-4 cursor-move hover:shadow-md transition-shadow"
                    @click="viewClient(clientJourney)"
                  >
                    <!-- Client Info -->
                    <div class="flex items-start justify-between mb-3">
                      <div class="flex-1">
                        <h4 class="font-semibold text-gray-900 mb-1">
                          {{ clientJourney.client_first_name }} {{ clientJourney.client_last_name }}
                        </h4>
                        <p class="text-xs text-gray-600">{{ clientJourney.client_email }}</p>
                      </div>
                      <span
                        :class="[
                          'px-2 py-1 rounded text-xs font-medium',
                          clientJourney.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                          clientJourney.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                          clientJourney.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        ]"
                      >
                        {{ clientJourney.priority }}
                      </span>
                    </div>

                    <!-- Progress Info -->
                    <div class="space-y-2 text-xs text-gray-600">
                      <div v-if="clientJourney.matter_name" class="flex items-center">
                        <IconFolder class="w-3 h-3 mr-1" />
                        {{ clientJourney.matter_name }}
                      </div>
                      <div v-if="clientJourney.step_started_at" class="flex items-center">
                        <IconClock class="w-3 h-3 mr-1" />
                        {{ formatTimeInStep(clientJourney.step_started_at) }}
                      </div>
                      <div v-if="clientJourney.step_progress_status === 'WAITING_CLIENT'" class="flex items-center text-yellow-600">
                        <IconAlertCircle class="w-3 h-3 mr-1" />
                        Waiting on client
                      </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                      <button
                        @click.stop="sendReminder(clientJourney)"
                        class="text-xs text-burgundy-600 hover:text-burgundy-700 font-medium"
                      >
                        Send Reminder
                      </button>
                      <button
                        @click.stop="viewProgress(clientJourney.id)"
                        class="text-xs text-gray-600 hover:text-gray-700 font-medium"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </template>
              </draggable>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-4 gap-4 mt-6">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-2xl font-bold text-gray-900">{{ totalClients }}</div>
        <div class="text-sm text-gray-600">Total Clients</div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-2xl font-bold text-burgundy-600">{{ inProgressClients }}</div>
        <div class="text-sm text-gray-600">In Progress</div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-2xl font-bold text-green-600">{{ completedClients }}</div>
        <div class="text-sm text-gray-600">Completed</div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-2xl font-bold text-gray-900">${{ formatCurrency(totalRevenue) }}</div>
        <div class="text-sm text-gray-600">Total Revenue</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  IconArrowLeft, IconLoader, IconCircleDot, IconRepeat, IconRefreshCw,
  IconFolder, IconClock, IconAlertCircle
} from 'lucide-vue-next'
import draggable from 'vuedraggable'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const refreshing = ref(false)
const filterStatus = ref('')

const journey = ref(null)
const steps = ref([])
const clientJourneys = ref([])

// Computed stats
const totalClients = computed(() => clientJourneys.value.length)
const inProgressClients = computed(() => 
  clientJourneys.value.filter(cj => cj.status === 'IN_PROGRESS').length
)
const completedClients = computed(() => 
  clientJourneys.value.filter(cj => cj.status === 'COMPLETED').length
)
const totalRevenue = computed(() => {
  return clientJourneys.value.reduce((sum, cj) => {
    return sum + (cj.total_price || 0)
  }, 0) / 100 // Convert from cents
})

// Get clients in a specific step
function getClientsInStep(stepId: string) {
  return clientJourneys.value.filter(cj => cj.current_step_id === stepId)
}

// Get total value for clients in a step
function getTotalValue(stepId: string) {
  const clients = getClientsInStep(stepId)
  return clients.reduce((sum, cj) => sum + (cj.total_price || 0), 0) / 100
}

// Fetch kanban data
async function fetchKanbanData() {
  loading.value = true
  try {
    // Get journey and steps
    const journeyData = await $fetch(`/api/journeys/${route.params.id}`)
    journey.value = journeyData.journey
    steps.value = journeyData.steps || []

    // Get all client journeys for this journey
    const { journeys: clientJourneysData } = await $fetch(`/api/journeys/${route.params.id}/clients`, {
      query: { status: filterStatus.value || undefined }
    })
    
    clientJourneys.value = clientJourneysData || []
  } catch (error) {
    console.error('Error fetching kanban data:', error)
  } finally {
    loading.value = false
  }
}

// Refresh data
async function refreshData() {
  refreshing.value = true
  await fetchKanbanData()
  refreshing.value = false
}

// Handle drag and drop
async function onDragEnd(event: any, newStepId: string) {
  const clientJourneyId = event.item.__draggable_context?.element?.id
  if (!clientJourneyId) return

  try {
    // Update client journey to new step
    await $fetch(`/api/client-journeys/${clientJourneyId}/move-to-step`, {
      method: 'POST',
      body: { stepId: newStepId }
    })
    await fetchKanbanData()
  } catch (error) {
    console.error('Error moving client:', error)
    // Revert on error
    await fetchKanbanData()
  }
}

// View client details
function viewClient(clientJourney: any) {
  router.push(`/dashboard/clients/${clientJourney.client_id}`)
}

// View progress
function viewProgress(clientJourneyId: string) {
  router.push(`/dashboard/client-journeys/${clientJourneyId}/progress`)
}

// Send reminder
async function sendReminder(clientJourney: any) {
  try {
    await $fetch(`/api/client-journeys/${clientJourney.id}/send-reminder`, {
      method: 'POST'
    })
    // Show success message
    alert('Reminder sent successfully')
  } catch (error) {
    console.error('Error sending reminder:', error)
  }
}

// Format currency
function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

// Format time in step
function formatTimeInStep(timestamp: number) {
  const now = Date.now()
  const diff = now - timestamp
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

onMounted(() => {
  fetchKanbanData()
})
</script>

