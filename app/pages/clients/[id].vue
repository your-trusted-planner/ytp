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
        <DriveStatusBadge
          v-if="clientProfile"
          :status="clientProfile.google_drive_sync_status"
          :folder-url="clientProfile.google_drive_folder_url"
          :show-label="true"
        />
        <UiButton variant="outline" size="sm" @click="openEditModal">
          <Edit class="w-4 h-4 mr-1" />
          Edit Client
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

        <!-- Google Drive Status -->
        <DriveStatusSection
          v-if="clientProfile"
          :sync-status="clientProfile.google_drive_sync_status"
          :folder-url="clientProfile.google_drive_folder_url"
          :last-sync-at="clientProfile.google_drive_last_sync_at"
          :sync-error="clientProfile.google_drive_sync_error"
          entity-type="client"
          :entity-id="clientId"
          @synced="handleDriveSynced"
        />

        <!-- People & Relationships -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900">People & Relationships</h3>
            <UiButton size="sm" variant="outline" @click="showAddRelationshipModal = true">
              <Plus class="w-4 h-4 mr-1" />
              Add Person
            </UiButton>
          </div>

          <div v-if="relationships.length === 0" class="text-center py-8 text-gray-500 text-sm">
            No relationships yet
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="rel in relationships"
              :key="rel.id"
              class="border border-gray-100 rounded p-3 hover:bg-gray-50 transition-colors"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="font-medium text-gray-900">{{ rel.person.fullName }}</div>
                  <div class="text-sm text-burgundy-600 mt-1">
                    {{ formatRelationshipType(rel.relationshipType) }}
                    <span v-if="rel.ordinal > 0" class="text-gray-500">(#{{ rel.ordinal }})</span>
                  </div>
                  <div v-if="rel.person.email || rel.person.phone" class="text-xs text-gray-600 mt-1 space-y-0.5">
                    <div v-if="rel.person.email">{{ rel.person.email }}</div>
                    <div v-if="rel.person.phone">{{ rel.person.phone }}</div>
                  </div>
                </div>
                <button
                  @click="removeRelationship(rel.id)"
                  class="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
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
            <UiButton size="sm" @click="$router.push(`/matters?createNew=true&clientId=${clientId}`)">
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
              @click="$router.push(`/matters/${matter.id}`)"
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
          <div class="mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Active Journeys</h3>
            <p class="text-sm text-gray-500 mt-1">Journeys are automatically created when services with journey templates are added to matters</p>
          </div>

          <div v-if="journeys.length === 0" class="text-center py-8 text-gray-500">
            No active journeys yet. Add a service to a matter to begin.
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

    <!-- Add Relationship Modal -->
    <UiModal v-model="showAddRelationshipModal" title="Add Person & Relationship" size="lg">
      <form @submit.prevent="addRelationship" class="space-y-4">
        <!-- Choose existing person or create new -->
        <div class="border-b pb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Person
          </label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input
                type="radio"
                v-model="relationshipForm.mode"
                value="existing"
                class="mr-2"
              />
              Select existing person
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                v-model="relationshipForm.mode"
                value="new"
                class="mr-2"
              />
              Create new person
            </label>
          </div>
        </div>

        <!-- Select existing person -->
        <div v-if="relationshipForm.mode === 'existing'">
          <UiSelect v-model="relationshipForm.personId" label="Select Person" required>
            <option value="">-- Select a person --</option>
            <option v-for="person in availablePeople" :key="person.id" :value="person.id">
              {{ person.fullName }} <span v-if="person.email">({{ person.email }})</span>
            </option>
          </UiSelect>
        </div>

        <!-- Create new person -->
        <div v-if="relationshipForm.mode === 'new'" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UiInput
              v-model="relationshipForm.newPerson.firstName"
              label="First Name"
              required
            />
            <UiInput
              v-model="relationshipForm.newPerson.lastName"
              label="Last Name"
              required
            />
          </div>

          <UiInput
            v-model="relationshipForm.newPerson.email"
            label="Email"
            type="email"
          />

          <UiInput
            v-model="relationshipForm.newPerson.phone"
            label="Phone"
            type="tel"
          />
        </div>

        <!-- Relationship details -->
        <div class="border-t pt-4 space-y-4">
          <h4 class="font-semibold text-gray-900">Relationship Details</h4>

          <UiSelect v-model="relationshipForm.relationshipType" label="Relationship Type" required>
            <option value="">-- Select type --</option>
            <optgroup label="Family">
              <option value="SPOUSE">Spouse</option>
              <option value="EX_SPOUSE">Ex-Spouse</option>
              <option value="PARTNER">Partner</option>
              <option value="CHILD">Child</option>
              <option value="STEPCHILD">Stepchild</option>
              <option value="GRANDCHILD">Grandchild</option>
              <option value="PARENT">Parent</option>
              <option value="SIBLING">Sibling</option>
            </optgroup>
            <optgroup label="Professional">
              <option value="FINANCIAL_ADVISOR">Financial Advisor</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="INSURANCE_AGENT">Insurance Agent</option>
              <option value="ATTORNEY">Attorney</option>
            </optgroup>
            <optgroup label="Business">
              <option value="BUSINESS_PARTNER">Business Partner</option>
              <option value="BUSINESS_ASSOCIATE">Business Associate</option>
            </optgroup>
          </UiSelect>

          <UiInput
            v-if="['CHILD', 'STEPCHILD', 'SIBLING'].includes(relationshipForm.relationshipType)"
            v-model.number="relationshipForm.ordinal"
            label="Order (e.g., 1 for first child, 2 for second child)"
            type="number"
            min="0"
          />

          <UiTextarea
            v-model="relationshipForm.notes"
            label="Notes (optional)"
            :rows="2"
          />
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <UiButton type="button" variant="ghost" @click="showAddRelationshipModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="savingRelationship">
            Add Relationship
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Plus, Loader, Edit, X, FolderSync } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const clientId = route.params.id as string

const loading = ref(true)
const savingNote = ref(false)
const savingClient = ref(false)
const savingRelationship = ref(false)
const showEditModal = ref(false)
const showAddRelationshipModal = ref(false)

const client = ref<any>(null)
const clientProfile = ref<any>(null)
const matters = ref<any[]>([])
const journeys = ref<any[]>([])
const documents = ref<any[]>([])
const notes = ref<any[]>([])
const relationships = ref<any[]>([])
const availablePeople = ref<any[]>([])

const newNote = ref('')

const relationshipForm = reactive({
  mode: 'existing',
  personId: '',
  relationshipType: '',
  ordinal: 0,
  notes: '',
  newPerson: {
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  }
})

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

// Fetch client data
async function fetchClient() {
  loading.value = true
  try {
    const [clientData, mattersData, journeysData, docsData, notesData, relationshipsData, peopleData] = await Promise.all([
      $fetch(`/api/clients/${clientId}`),
      $fetch(`/api/clients/${clientId}/matters`).catch(() => ({ matters: [] })),
      $fetch(`/api/client-journeys/client/${clientId}`).catch(() => ({ journeys: [] })),
      $fetch(`/api/clients/${clientId}/documents`).catch(() => ({ documents: [] })),
      $fetch(`/api/clients/${clientId}/notes`).catch(() => ({ notes: [] })),
      $fetch(`/api/clients/${clientId}/relationships`).catch(() => ({ relationships: [] })),
      $fetch('/api/people').catch(() => ({ people: [] }))
    ])

    client.value = clientData.client
    clientProfile.value = clientData.profile
    matters.value = mattersData.matters || []
    journeys.value = journeysData.journeys || []
    documents.value = docsData.documents || []
    notes.value = notesData.notes || []
    relationships.value = relationshipsData.relationships || []
    availablePeople.value = peopleData.people || []
  } catch (error) {
    console.error('Error fetching client:', error)
  } finally {
    loading.value = false
  }
}

// View journey
function viewJourney(journeyId: string) {
  router.push(`/my-journeys/${journeyId}`)
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

// Add relationship
async function addRelationship() {
  savingRelationship.value = true
  try {
    let personId = relationshipForm.personId

    // Create new person if needed
    if (relationshipForm.mode === 'new') {
      const newPersonResponse = await $fetch('/api/people', {
        method: 'POST',
        body: {
          firstName: relationshipForm.newPerson.firstName,
          lastName: relationshipForm.newPerson.lastName,
          email: relationshipForm.newPerson.email,
          phone: relationshipForm.newPerson.phone
        }
      })
      personId = newPersonResponse.person.id
    }

    // Create relationship
    await $fetch(`/api/clients/${clientId}/relationships`, {
      method: 'POST',
      body: {
        personId,
        relationshipType: relationshipForm.relationshipType,
        ordinal: relationshipForm.ordinal || 0,
        notes: relationshipForm.notes
      }
    })

    // Reset form and close modal
    showAddRelationshipModal.value = false
    relationshipForm.mode = 'existing'
    relationshipForm.personId = ''
    relationshipForm.relationshipType = ''
    relationshipForm.ordinal = 0
    relationshipForm.notes = ''
    relationshipForm.newPerson = { firstName: '', lastName: '', email: '', phone: '' }

    // Refresh data
    await fetchClient()
  } catch (error) {
    console.error('Error adding relationship:', error)
    alert(`Error: ${error.message || 'Failed to add relationship'}`)
  } finally {
    savingRelationship.value = false
  }
}

// Remove relationship
async function removeRelationship(relationshipId: string) {
  if (!confirm('Are you sure you want to remove this relationship?')) return

  try {
    await $fetch(`/api/clients/${clientId}/relationships/${relationshipId}`, {
      method: 'DELETE'
    })

    // Refresh data
    await fetchClient()
  } catch (error) {
    console.error('Error removing relationship:', error)
    alert(`Error: ${error.message || 'Failed to remove relationship'}`)
  }
}

// Format relationship type
function formatRelationshipType(type: string): string {
  const typeMap: Record<string, string> = {
    SPOUSE: 'Spouse',
    EX_SPOUSE: 'Ex-Spouse',
    PARTNER: 'Partner',
    CHILD: 'Child',
    STEPCHILD: 'Stepchild',
    GRANDCHILD: 'Grandchild',
    PARENT: 'Parent',
    SIBLING: 'Sibling',
    FINANCIAL_ADVISOR: 'Financial Advisor',
    ACCOUNTANT: 'Accountant',
    INSURANCE_AGENT: 'Insurance Agent',
    ATTORNEY: 'Attorney',
    BUSINESS_PARTNER: 'Business Partner',
    BUSINESS_ASSOCIATE: 'Business Associate'
  }
  return typeMap[type] || type
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

// Handle Drive synced
function handleDriveSynced(data: { folderId: string; folderUrl: string }) {
  if (clientProfile.value) {
    clientProfile.value.google_drive_folder_id = data.folderId
    clientProfile.value.google_drive_folder_url = data.folderUrl
    clientProfile.value.google_drive_sync_status = 'SYNCED'
    clientProfile.value.google_drive_sync_error = null
    clientProfile.value.google_drive_last_sync_at = Math.floor(Date.now() / 1000)
  }
}

onMounted(() => {
  fetchClient()
})
</script>

