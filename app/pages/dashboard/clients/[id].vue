<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <button @click="$router.back()" class="text-gray-600 hover:text-gray-900">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 v-if="client" class="text-2xl font-bold text-gray-900">
            {{ client.first_name }} {{ client.last_name }}
          </h1>
          <p v-if="client" class="text-gray-600 mt-1">{{ client.email }}</p>
        </div>
      </div>
      <div v-if="client" class="flex items-center space-x-3">
        <UiBadge :variant="client.status === 'ACTIVE' ? 'success' : 'default'">
          {{ client.status }}
        </UiBadge>
        <UiButton size="sm" @click="showStartJourneyModal = true">
          <Plus class="w-4 h-4 mr-1" />
          Start Journey
        </UiButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <Loader class="w-8 h-8 animate-spin text-burgundy-600" />
    </div>

    <!-- Client Details -->
    <div v-else-if="client" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Client Info -->
      <div class="lg:col-span-1 space-y-6">
        <!-- Basic Info Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div class="space-y-3 text-sm">
            <div>
              <span class="text-gray-600">Name:</span>
              <span class="ml-2 font-medium">{{ client.first_name }} {{ client.last_name }}</span>
            </div>
            <div>
              <span class="text-gray-600">Email:</span>
              <span class="ml-2">{{ client.email }}</span>
            </div>
            <div v-if="client.phone">
              <span class="text-gray-600">Phone:</span>
              <span class="ml-2">{{ client.phone }}</span>
            </div>
            <div v-if="clientProfile">
              <span class="text-gray-600">Address:</span>
              <div class="ml-2 mt-1">
                <div v-if="clientProfile.address">{{ clientProfile.address }}</div>
                <div v-if="clientProfile.city || clientProfile.state">
                  {{ clientProfile.city }}, {{ clientProfile.state }} {{ clientProfile.zip_code }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Active Journeys</span>
              <span class="font-semibold text-burgundy-600">{{ activeJourneys }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Documents</span>
              <span class="font-semibold">{{ totalDocuments }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Appointments</span>
              <span class="font-semibold">{{ totalAppointments }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Activity -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Active Journeys -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Active Journeys</h3>
            <UiButton size="sm" @click="showStartJourneyModal = true">
              <Plus class="w-4 h-4 mr-1" />
              Start Journey
            </UiButton>
          </div>

          <div v-if="journeys.length === 0" class="text-center py-8 text-gray-500">
            No active journeys. Click "Start Journey" to begin.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="journey in journeys"
              :key="journey.id"
              class="p-4 border border-gray-200 rounded-lg hover:border-burgundy-500 transition-colors cursor-pointer"
              @click="viewJourney(journey.id)"
            >
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="font-semibold text-gray-900">{{ journey.journey_name }}</h4>
                  <p v-if="journey.current_step_name" class="text-sm text-gray-600 mt-1">
                    Current: {{ journey.current_step_name }}
                  </p>
                </div>
                <UiBadge :variant="journey.status === 'IN_PROGRESS' ? 'primary' : 'default'">
                  {{ journey.status }}
                </UiBadge>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Documents -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h3>
          <div v-if="documents.length === 0" class="text-center py-8 text-gray-500">
            No documents yet
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="doc in documents"
              :key="doc.id"
              class="flex justify-between items-center p-3 border border-gray-100 rounded hover:bg-gray-50"
            >
              <div>
                <div class="font-medium text-gray-900">{{ doc.title }}</div>
                <div class="text-xs text-gray-600">{{ formatDate(doc.created_at) }}</div>
              </div>
              <UiBadge>{{ doc.status }}</UiBadge>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <div class="space-y-3">
            <UiTextarea
              v-model="newNote"
              placeholder="Add a note about this client..."
              :rows="3"
            />
            <UiButton @click="addNote" :loading="savingNote" size="sm">
              Add Note
            </UiButton>
          </div>

          <div v-if="notes.length > 0" class="mt-4 space-y-2">
            <div
              v-for="note in notes"
              :key="note.id"
              class="p-3 bg-gray-50 rounded text-sm"
            >
              <div class="text-gray-700">{{ note.content }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ formatDate(note.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Start Journey Modal -->
    <UiModal v-model="showStartJourneyModal" title="Start Client on Journey" size="md">
      <div class="space-y-4">
        <UiSelect v-model="selectedJourneyId" label="Select Journey *" required>
          <option value="">-- Choose Journey --</option>
          <option v-for="journey in availableJourneys" :key="journey.id" :value="journey.id">
            {{ journey.name }} ({{ journey.step_count || 0 }} steps)
          </option>
        </UiSelect>

        <UiSelect v-model="journeyPriority" label="Priority">
          <option value="LOW">Low</option>
          <option value="MEDIUM" selected>Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </UiSelect>

        <div class="flex justify-end space-x-3 pt-4">
          <UiButton type="button" variant="ghost" @click="showStartJourneyModal = false">
            Cancel
          </UiButton>
          <UiButton @click="startJourney" :loading="startingJourney">
            Start Journey
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Plus, Loader } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const clientId = route.params.id as string

const loading = ref(true)
const savingNote = ref(false)
const startingJourney = ref(false)
const showStartJourneyModal = ref(false)

const client = ref<any>(null)
const clientProfile = ref<any>(null)
const journeys = ref<any[]>([])
const documents = ref<any[]>([])
const notes = ref<any[]>([])
const availableJourneys = ref<any[]>([])

const newNote = ref('')
const selectedJourneyId = ref('')
const journeyPriority = ref('MEDIUM')

// Computed stats
const activeJourneys = computed(() => journeys.value.filter(j => j.status === 'IN_PROGRESS').length)
const totalDocuments = computed(() => documents.value.length)
const totalAppointments = computed(() => 0) // TODO: Implement appointments

// Fetch client data
async function fetchClient() {
  loading.value = true
  try {
    const [clientData, journeysData, docsData, notesData] = await Promise.all([
      $fetch(`/api/clients/${clientId}`),
      $fetch(`/api/client-journeys/client/${clientId}`).catch(() => ({ journeys: [] })),
      $fetch(`/api/clients/${clientId}/documents`).catch(() => ({ documents: [] })),
      $fetch(`/api/clients/${clientId}/notes`).catch(() => ({ notes: [] }))
    ])

    client.value = clientData.client
    clientProfile.value = clientData.profile
    journeys.value = journeysData.journeys || []
    documents.value = docsData.documents || []
    notes.value = notesData.notes || []
  } catch (error) {
    console.error('Error fetching client:', error)
  } finally {
    loading.value = false
  }
}

// Fetch available journeys
async function fetchAvailableJourneys() {
  try {
    const { journeys: data } = await $fetch('/api/journeys')
    availableJourneys.value = data || []
  } catch (error) {
    console.error('Error fetching journeys:', error)
  }
}

// View journey
function viewJourney(journeyId: string) {
  router.push(`/dashboard/my-journeys/${journeyId}`)
}

// Start client on journey
async function startJourney() {
  if (!selectedJourneyId.value) {
    alert('Please select a journey')
    return
  }

  startingJourney.value = true
  try {
    await $fetch('/api/client-journeys', {
      method: 'POST',
      body: {
        clientId: clientId,
        journeyId: selectedJourneyId.value,
        priority: journeyPriority.value
      }
    })

    showStartJourneyModal.value = false
    selectedJourneyId.value = ''
    
    // Refresh client data
    await fetchClient()
  } catch (error) {
    console.error('Error starting journey:', error)
    alert(`Error: ${error.message || 'Failed to start journey'}`)
  } finally {
    startingJourney.value = false
  }
}

// Add note
async function addNote() {
  if (!newNote.value.trim()) return

  savingNote.value = true
  try {
    await $fetch(`/api/clients/${clientId}/notes`, {
      method: 'POST',
      body: {
        content: newNote.value
      }
    })

    newNote.value = ''
    
    // Refresh notes
    const { notes: data } = await $fetch(`/api/clients/${clientId}/notes`)
    notes.value = data || []
  } catch (error) {
    console.error('Error adding note:', error)
  } finally {
    savingNote.value = false
  }
}

// Format date
function formatDate(timestamp: number) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

onMounted(() => {
  fetchClient()
  fetchAvailableJourneys()
})
</script>

