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
        <UiButton variant="outline" size="sm" @click="openEditModal">
          <Edit class="w-4 h-4 mr-1" />
          Edit Client
        </UiButton>
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
              <span class="text-gray-600">Active Matters</span>
              <span class="font-semibold text-burgundy-600">{{ activeMatters }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Services Engaged</span>
              <span class="font-semibold">{{ totalServicesEngaged }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Active Journeys</span>
              <span class="font-semibold">{{ activeJourneys }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Payments</span>
              <span class="font-semibold">${{ (totalPaid / 100).toFixed(0) }} / ${{ (totalExpected / 100).toFixed(0) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Activity -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Active Matters -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Client Matters</h3>
            <UiButton size="sm" @click="$router.push('/dashboard/matters/new?clientId=' + clientId)">
              <Plus class="w-4 h-4 mr-1" />
              Create Matter
            </UiButton>
          </div>

          <div v-if="matters.length === 0" class="text-center py-8 text-gray-500">
            No matters yet. Click "Create Matter" to begin.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="matter in matters"
              :key="matter.id"
              class="p-4 border border-gray-200 rounded-lg hover:border-burgundy-500 transition-colors cursor-pointer"
              @click="$router.push(`/dashboard/matters/${matter.id}`)"
            >
              <div class="flex justify-between items-start mb-3">
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-semibold text-gray-900">{{ matter.title }}</h4>
                    <span class="text-xs text-gray-500">#{{ matter.matter_number }}</span>
                  </div>
                  <p v-if="matter.description" class="text-sm text-gray-600 mt-1">
                    {{ matter.description }}
                  </p>
                </div>
                <UiBadge :variant="matter.status === 'OPEN' ? 'success' : matter.status === 'PENDING' ? 'default' : 'secondary'">
                  {{ matter.status }}
                </UiBadge>
              </div>

              <div class="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span class="text-gray-600">Services:</span>
                  <span class="ml-1 font-medium">{{ matter.services_count || 0 }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Journeys:</span>
                  <span class="ml-1 font-medium">{{ matter.active_journeys_count || 0 }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Paid:</span>
                  <span class="ml-1 font-medium">${{ ((matter.total_paid || 0) / 100).toFixed(0) }} / ${{ ((matter.total_expected || 0) / 100).toFixed(0) }}</span>
                </div>
              </div>

              <div v-if="matter.engaged_services && matter.engaged_services.length > 0" class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="service in matter.engaged_services"
                  :key="service.catalog_id"
                  class="px-2 py-1 bg-burgundy-50 text-burgundy-700 text-xs rounded"
                >
                  {{ service.name }}
                </span>
              </div>
            </div>
          </div>
        </div>

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
                <div class="flex-1">
                  <!-- Matter and Service Context -->
                  <div class="flex items-center gap-2 mb-2 text-xs text-gray-600">
                    <span v-if="journey.matter_title">
                      Matter: {{ journey.matter_title }}
                      <span v-if="journey.matter_number" class="text-gray-500">(#{{ journey.matter_number }})</span>
                    </span>
                    <span v-if="journey.service_name" class="text-gray-500">•</span>
                    <span v-if="journey.service_name">
                      Service: {{ journey.service_name }}
                    </span>
                  </div>

                  <!-- Journey Name -->
                  <h4 class="font-semibold text-gray-900">{{ journey.journey_name }}</h4>

                  <!-- Current Step -->
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
        <!-- Step 1: Select Matter -->
        <UiSelect v-model="selectedMatterId" label="Select Matter *" required @change="selectedCatalogId = ''; selectedJourneyId = ''">
          <option value="">-- Choose Matter --</option>
          <option v-for="matter in matters.filter(m => ['OPEN', 'PENDING'].includes(m.status))" :key="matter.id" :value="matter.id">
            {{ matter.title }} (#{{ matter.matter_number }})
          </option>
        </UiSelect>

        <!-- Step 2: Select Service (filtered by matter) -->
        <UiSelect v-model="selectedCatalogId" label="Select Service *" required :disabled="!selectedMatterId" @change="onServiceSelected">
          <option value="">-- Choose Service --</option>
          <option v-for="service in engagedServices" :key="service.catalog_id" :value="service.catalog_id">
            {{ service.name }}
          </option>
        </UiSelect>

        <!-- Journey auto-selected based on service -->
        <div v-if="selectedJourneyId" class="p-3 bg-gray-50 rounded text-sm">
          <span class="text-gray-600">Journey Template:</span>
          <span class="ml-2 font-medium">{{ availableJourneys.find(j => j.id === selectedJourneyId)?.name }}</span>
          <p class="text-xs text-gray-500 mt-1">This service uses the above workflow</p>
        </div>

        <!-- Priority -->
        <UiSelect v-model="journeyPriority" label="Priority">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </UiSelect>

        <div class="flex justify-end space-x-3 pt-4">
          <UiButton type="button" variant="ghost" @click="showStartJourneyModal = false">
            Cancel
          </UiButton>
          <UiButton @click="startJourney" :loading="startingJourney" :disabled="!selectedMatterId || !selectedCatalogId">
            Start Journey
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Edit Client Modal -->
    <UiModal v-model="showEditModal" title="Edit Client" size="lg">
      <form @submit.prevent="saveClientChanges" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UiInput
            v-model="editForm.first_name"
            label="First Name"
            required
          />
          <UiInput
            v-model="editForm.last_name"
            label="Last Name"
            required
          />
        </div>

        <UiInput
          v-model="editForm.email"
          label="Email"
          type="email"
          required
        />

        <UiInput
          v-model="editForm.phone"
          label="Phone"
          type="tel"
        />

        <UiSelect v-model="editForm.status" label="Status">
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </UiSelect>

        <div class="border-t pt-4 mt-4">
          <h4 class="font-semibold text-gray-900 mb-3">Address Information</h4>

          <div class="space-y-4">
            <UiInput
              v-model="editForm.address"
              label="Street Address"
            />

            <div class="grid grid-cols-3 gap-4">
              <UiInput
                v-model="editForm.city"
                label="City"
                class="col-span-1"
              />
              <UiInput
                v-model="editForm.state"
                label="State"
                class="col-span-1"
              />
              <UiInput
                v-model="editForm.zip_code"
                label="ZIP Code"
                class="col-span-1"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <UiButton type="button" variant="ghost" @click="showEditModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="savingClient">
            Save Changes
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Plus, Loader, Edit } from 'lucide-vue-next'

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
const savingClient = ref(false)
const showStartJourneyModal = ref(false)
const showEditModal = ref(false)

const client = ref<any>(null)
const clientProfile = ref<any>(null)
const matters = ref<any[]>([])
const journeys = ref<any[]>([])
const documents = ref<any[]>([])
const notes = ref<any[]>([])
const availableJourneys = ref<any[]>([])

const newNote = ref('')
const selectedMatterId = ref('')
const selectedCatalogId = ref('')
const selectedJourneyId = ref('')
const journeyPriority = ref('MEDIUM')

const editForm = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  status: 'ACTIVE',
  address: '',
  city: '',
  state: '',
  zip_code: ''
})

// Computed stats
const activeMatters = computed(() => matters.value.filter(m => ['OPEN', 'IN_PROGRESS'].includes(m.status)).length)
const totalServicesEngaged = computed(() => matters.value.reduce((sum, m) => sum + (m.services_count || 0), 0))
const totalPaid = computed(() => matters.value.reduce((sum, m) => sum + (m.total_paid || 0), 0))
const totalExpected = computed(() => matters.value.reduce((sum, m) => sum + (m.total_expected || 0), 0))
const activeJourneys = computed(() => journeys.value.filter(j => j.status === 'IN_PROGRESS').length)
const totalDocuments = computed(() => documents.value.length)

// Computed for Start Journey modal
const engagedServices = computed(() => {
  const selectedMatter = matters.value.find(m => m.id === selectedMatterId.value)
  return selectedMatter?.engaged_services || []
})

// Fetch client data
async function fetchClient() {
  loading.value = true
  try {
    const [clientData, mattersData, journeysData, docsData, notesData] = await Promise.all([
      $fetch(`/api/clients/${clientId}`),
      $fetch(`/api/clients/${clientId}/matters`).catch(() => ({ matters: [] })),
      $fetch(`/api/client-journeys/client/${clientId}`).catch(() => ({ journeys: [] })),
      $fetch(`/api/clients/${clientId}/documents`).catch(() => ({ documents: [] })),
      $fetch(`/api/clients/${clientId}/notes`).catch(() => ({ notes: [] }))
    ])

    client.value = clientData.client
    clientProfile.value = clientData.profile
    matters.value = mattersData.matters || []
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

// When service is selected, auto-select the associated journey
function onServiceSelected() {
  if (!selectedCatalogId.value) {
    selectedJourneyId.value = ''
    return
  }

  // Find the journey associated with this service
  const journey = availableJourneys.value.find(j => j.service_catalog_id === selectedCatalogId.value)
  if (journey) {
    selectedJourneyId.value = journey.id
  } else {
    selectedJourneyId.value = ''
  }
}

// Start client on journey
async function startJourney() {
  if (!selectedMatterId.value) {
    alert('Please select a matter')
    return
  }
  if (!selectedCatalogId.value) {
    alert('Please select a service')
    return
  }

  startingJourney.value = true
  try {
    await $fetch('/api/client-journeys', {
      method: 'POST',
      body: {
        clientId: clientId,
        matterId: selectedMatterId.value,
        catalogId: selectedCatalogId.value,
        journeyId: selectedJourneyId.value,
        priority: journeyPriority.value
      }
    })

    showStartJourneyModal.value = false
    selectedMatterId.value = ''
    selectedCatalogId.value = ''
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

// Open edit modal
function openEditModal() {
  if (!client.value) return

  // Populate form with current client data
  editForm.first_name = client.value.first_name || ''
  editForm.last_name = client.value.last_name || ''
  editForm.email = client.value.email || ''
  editForm.phone = client.value.phone || ''
  editForm.status = client.value.status || 'ACTIVE'

  // Populate address data from profile
  editForm.address = clientProfile.value?.address || ''
  editForm.city = clientProfile.value?.city || ''
  editForm.state = clientProfile.value?.state || ''
  editForm.zip_code = clientProfile.value?.zip_code || ''

  showEditModal.value = true
}

// Save client changes
async function saveClientChanges() {
  savingClient.value = true
  try {
    await $fetch(`/api/clients/${clientId}`, {
      method: 'PUT',
      body: {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        status: editForm.status,
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
        zip_code: editForm.zip_code
      }
    })

    showEditModal.value = false

    // Refresh client data
    await fetchClient()
  } catch (error) {
    console.error('Error updating client:', error)
    alert(`Error: ${error.message || 'Failed to update client'}`)
  } finally {
    savingClient.value = false
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

