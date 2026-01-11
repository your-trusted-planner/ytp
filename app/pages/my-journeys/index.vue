<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-2xl font-bold text-gray-900">My Journeys</h1>
        <UiHelpLink topic="client-journeys" title="Learn about your journeys" />
      </div>
      <p class="text-gray-600 mt-1">Track your progress through each service</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <IconLoader class="w-8 h-8 animate-spin text-burgundy-600" />
    </div>

    <!-- Empty State -->
    <div v-else-if="journeys.length === 0" class="text-center py-12 bg-white rounded-lg border border-gray-200">
      <IconMap class="w-16 h-16 mx-auto text-gray-400 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No active journeys</h3>
      <p class="text-gray-600">You don't have any active journeys yet. Your lawyer will start one when you begin a new service.</p>
    </div>

    <!-- Journeys List -->
    <div v-else class="space-y-6">
      <div
        v-for="journey in journeys"
        :key="journey.id"
        class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
      >
        <!-- Journey Header -->
        <div class="p-6 border-b border-gray-100">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <h3 class="text-xl font-semibold text-gray-900">{{ journey.journey_name }}</h3>
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-medium',
                    journey.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    journey.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    journey.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  ]"
                >
                  {{ formatStatus(journey.status) }}
                </span>
              </div>
              <p v-if="journey.journey_description" class="text-gray-600 mb-3">{{ journey.journey_description }}</p>
              <div class="flex items-center space-x-4 text-sm text-gray-500">
                <span v-if="journey.matter_name" class="flex items-center">
                  <IconFolder class="w-4 h-4 mr-1" />
                  {{ journey.matter_name }}
                </span>
                <span v-if="journey.current_step_name" class="flex items-center">
                  <IconMapPin class="w-4 h-4 mr-1" />
                  Current: {{ journey.current_step_name }}
                </span>
              </div>
            </div>
            <button
              @click="viewProgress(journey.id)"
              class="flex items-center px-4 py-2 text-sm font-medium text-burgundy-600 hover:bg-burgundy-50 rounded-lg transition-colors"
            >
              View Progress
              <IconChevronRight class="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="px-6 py-4 bg-gray-50">
          <div class="flex items-center justify-between text-sm mb-2">
            <span class="text-gray-600">Journey Progress</span>
            <span class="font-medium text-gray-900">{{ calculateProgress(journey) }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-burgundy-600 h-2 rounded-full transition-all"
              :style="{ width: calculateProgress(journey) + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  Loader as IconLoader, Map as IconMap, Folder as IconFolder, MapPin as IconMapPin, ChevronRight as IconChevronRight
} from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const router = useRouter()
const { data: sessionData } = await useFetch('/api/auth/session')
const user = computed(() => sessionData.value?.user)

const loading = ref(true)
const journeys = ref([])

// Fetch client journeys
async function fetchJourneys() {
  loading.value = true
  try {
    const { journeys: data } = await $fetch(`/api/client-journeys/client/${user.value.id}`)
    journeys.value = data
  } catch (error) {
    console.error('Error fetching journeys:', error)
  } finally {
    loading.value = false
  }
}

// Calculate progress percentage
function calculateProgress(journey: any) {
  if (!journey.total_steps || journey.total_steps === 0) return 0
  const completedSteps = journey.current_step_order || 0
  return Math.round((completedSteps / journey.total_steps) * 100)
}

// Format status for display
function formatStatus(status: string) {
  const map = {
    'NOT_STARTED': 'Not Started',
    'IN_PROGRESS': 'In Progress',
    'COMPLETED': 'Completed',
    'PAUSED': 'Paused',
    'CANCELLED': 'Cancelled'
  }
  return map[status] || status
}

// View journey progress
function viewProgress(journeyId: string) {
  router.push(`/my-journeys/${journeyId}`)
}

onMounted(() => {
  fetchJourneys()
})
</script>

