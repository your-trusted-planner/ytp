<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <button @click="$router.back()" class="text-gray-600 hover:text-gray-900">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 v-if="matter" class="text-2xl font-bold text-gray-900">
            {{ matter.title }}
          </h1>
          <div v-if="matter" class="flex items-center space-x-3 mt-1">
            <span class="text-gray-600">Matter #: {{ matter.matterNumber }}</span>
            <UiBadge :variant="getStatusVariant(matter.status)">
              {{ matter.status }}
            </UiBadge>
            <DriveStatusBadge
              v-if="isDriveConfigured"
              :status="matter.googleDriveSyncStatus"
              :folder-url="matter.googleDriveFolderUrl"
              :show-label="true"
            />
          </div>
        </div>
      </div>
      <UiButton v-if="matter" @click="showEditModal = true" variant="outline">
        Edit Matter
      </UiButton>
    </div>

    <!-- Loading -->
    <div v-if="matterStore.loading" class="flex justify-center py-12">
      <Loader class="w-8 h-8 animate-spin text-burgundy-600" />
    </div>

    <!-- Matter Details -->
    <div v-else-if="matter">
      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              activeTab === tab.id
                ? 'border-burgundy-500 text-burgundy-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="mt-6">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Matter Info Card -->
            <UiCard class="lg:col-span-2">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Matter Details</h3>
              <div class="space-y-3 text-sm">
                <div>
                  <span class="text-gray-600">Title:</span>
                  <span class="ml-2 font-medium">{{ matter.title }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Matter Number:</span>
                  <span class="ml-2 font-medium">{{ matter.matterNumber }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Status:</span>
                  <UiBadge :variant="getStatusVariant(matter.status)" class="ml-2">
                    {{ matter.status }}
                  </UiBadge>
                </div>
                <div>
                  <span class="text-gray-600">Client:</span>
                  <span class="ml-2 font-medium">{{ matterStore.clientName }}</span>
                </div>
                <div v-if="matterStore.leadAttorneyName">
                  <span class="text-gray-600">Lead Attorney:</span>
                  <span class="ml-2 font-medium">{{ matterStore.leadAttorneyName }}</span>
                </div>
                <div v-if="matter.engagementJourneyName">
                  <span class="text-gray-600">Engagement Journey:</span>
                  <span class="ml-2 font-medium">{{ matter.engagementJourneyName }}</span>
                  <button
                    v-if="matter.engagementJourneyId"
                    @click="viewEngagementJourney(matter.engagementJourneyId)"
                    class="ml-2 text-burgundy-600 hover:text-burgundy-800 text-sm"
                  >
                    View Progress
                  </button>
                </div>
                <div v-if="matter.description">
                  <span class="text-gray-600">Description:</span>
                  <p class="ml-2 mt-1">{{ matter.description }}</p>
                </div>
              </div>
            </UiCard>

            <!-- Quick Stats Card -->
            <UiCard>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Engaged Services</span>
                  <span class="font-semibold text-burgundy-600">{{ matterStore.services.length }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Active Journeys</span>
                  <span class="font-semibold">{{ matterStore.journeys.length }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Total Payments</span>
                  <span class="font-semibold">{{ formatCurrency(matterStore.totalPayments) }}</span>
                </div>
              </div>
            </UiCard>

            <!-- Google Drive Status (only shown if Drive integration is configured) -->
            <DriveStatusSection
              v-if="isDriveConfigured"
              :sync-status="matter.googleDriveSyncStatus"
              :folder-url="matter.googleDriveFolderUrl"
              :last-sync-at="matter.googleDriveLastSyncAt"
              :sync-error="matter.googleDriveSyncError"
              entity-type="matter"
              :entity-id="matterId"
              @synced="handleDriveSynced"
            />
          </div>
        </div>

        <!-- Services Tab -->
        <div v-if="activeTab === 'services'">
          <UiCard>
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Engaged Services</h3>
              <UiButton size="sm" @click="showAddServiceModal = true">
                <Plus class="w-4 h-4 mr-1" />
                Add Service
              </UiButton>
            </div>
            <MatterServicesTable :services="servicesForTable" />
          </UiCard>
        </div>

        <!-- Journeys Tab -->
        <div v-if="activeTab === 'journeys'">
          <UiCard>
            <div class="mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Client Journeys</h3>
              <p class="text-sm text-gray-500 mt-1">Journeys are automatically created when you add a service with an associated journey template</p>
            </div>

            <div v-if="matterStore.journeys.length === 0" class="text-center py-8 text-gray-500">
              No journeys started yet. Add a service to begin.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="journey in matterStore.journeys"
                :key="journey.id"
                class="p-4 border border-gray-200 rounded-lg hover:border-burgundy-500 transition-colors cursor-pointer"
                @click="viewJourney(journey.id)"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-semibold text-gray-900">{{ journey.journeyName }}</h4>
                    <p v-if="journey.serviceName" class="text-sm text-gray-600 mt-1">
                      Service: {{ journey.serviceName }}
                    </p>
                    <p v-if="journey.currentStepName" class="text-sm text-gray-600">
                      Current: {{ journey.currentStepName }}
                    </p>
                  </div>
                  <UiBadge :variant="getJourneyStatusVariant(journey.status)">
                    {{ journey.status }}
                  </UiBadge>
                </div>
              </div>
            </div>
          </UiCard>
        </div>

        <!-- Payments Tab -->
        <div v-if="activeTab === 'payments'">
          <UiCard>
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Payment History</h3>
              <UiButton size="sm" disabled>
                <Plus class="w-4 h-4 mr-1" />
                Record Payment
              </UiButton>
            </div>
            <p class="text-sm text-gray-500 mb-4">Payment management will be available in Phase 3</p>
            <MatterPaymentsTable :payments="paymentsForTable" />
          </UiCard>
        </div>

        <!-- Documents Tab -->
        <div v-if="activeTab === 'documents'" class="space-y-4">
          <!-- View Toggle -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                @click="setDocumentView('local')"
                :class="[
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  documentView === 'local'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                ]"
              >
                <Database class="w-4 h-4 inline-block mr-1.5" />
                System Documents
              </button>
              <button
                @click="setDocumentView('drive')"
                :disabled="!matterStore.hasDriveFolder"
                :class="[
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  documentView === 'drive'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900',
                  !matterStore.hasDriveFolder && 'opacity-50 cursor-not-allowed'
                ]"
              >
                <IconsGoogleDrive :size="16" class="inline-block mr-1.5" />
                Google Drive
              </button>
            </div>
            <UiButton
              v-if="documentView === 'local'"
              size="sm"
              variant="outline"
              @click="matterStore.fetchDocuments()"
              :is-loading="matterStore.loadingDocuments"
            >
              <RefreshCw class="w-4 h-4 mr-1" />
              Refresh
            </UiButton>
          </div>

          <!-- Local Documents View -->
          <UiCard v-if="documentView === 'local'">
            <div v-if="matterStore.loadingDocuments" class="flex justify-center py-8">
              <Loader class="w-6 h-6 animate-spin text-burgundy-600" />
            </div>
            <MatterDocumentsTable
              v-else
              :documents="matterStore.documents"
              :uploads="matterStore.uploads"
              @download="handleDownloadDocument"
              @view="handleViewDocument"
              @download-upload="handleDownloadUpload"
            />
          </UiCard>

          <!-- Google Drive View -->
          <UiCard v-else-if="documentView === 'drive'">
            <div v-if="!matterStore.hasDriveFolder" class="text-center py-8">
              <FolderX class="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p class="text-gray-500 mb-4">This matter is not synced to Google Drive yet</p>
              <UiButton size="sm" @click="activeTab = 'overview'">
                Go to Overview to Sync
              </UiButton>
            </div>
            <DriveTreeBrowser
              v-else
              :root-folder-id="matter.googleDriveFolderId!"
              :root-folder-name="matter.title"
              :folder-url="matter.googleDriveFolderUrl"
            />
          </UiCard>
        </div>

        <!-- Notes Tab -->
        <div v-if="activeTab === 'notes'">
          <UiCard>
            <EntityNotes
              entity-type="matter"
              :entity-id="matterId"
            />
          </UiCard>
        </div>
      </div>
    </div>

    <!-- Add Service Modal -->
    <UiModal v-model="showAddServiceModal" title="Add Service to Matter" size="md">
      <form @submit.prevent="handleAddService" class="space-y-4">
        <UiSelect v-model="newServiceForm.catalogId" label="Select Service" required>
          <option value="">Choose a service...</option>
          <option v-for="item in catalog" :key="item.id" :value="item.id">
            {{ item.name }} ({{ formatCurrency(item.price) }})
          </option>
        </UiSelect>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="showAddServiceModal = false">
          Cancel
        </UiButton>
        <UiButton @click="handleAddService" :is-loading="addingService">
          Add Service
        </UiButton>
      </template>
    </UiModal>

    <!-- Edit Matter Modal -->
    <MatterFormModal
      v-model="showEditModal"
      :editing-matter="matterForEditModal"
      :clients="clients"
      :lawyers="lawyers"
      :engagement-journeys="engagementJourneys"
      :catalog="catalog"
      @save="handleMatterSaved"
      @cancel="showEditModal = false"
    />

  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Plus, Loader, Database, RefreshCw, FolderX } from 'lucide-vue-next'
import { formatCurrency } from '~/utils/format'
import { useMatterStore } from '~/stores/useMatterStore'
import { usePreferencesStore } from '~/stores/usePreferencesStore'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const matterId = route.params.id as string

// Use stores
const matterStore = useMatterStore()
const preferencesStore = usePreferencesStore()

// App config store (includes Google Drive status)
const appConfigStore = useAppConfigStore()
const isDriveConfigured = computed(() => appConfigStore.isDriveConfigured)

// Local UI state (not in store)
const activeTab = ref('overview')
const showAddServiceModal = ref(false)
const showEditModal = ref(false)
const documentView = ref<'local' | 'drive'>('local') // Default, will sync from store after hydration

// Form data for modals
const catalog = ref<any[]>([])
const clients = ref<any[]>([])
const lawyers = ref<any[]>([])
const engagementJourneys = ref<any[]>([])

// Service addition state
const addingService = ref(false)
const newServiceForm = ref({
  catalogId: ''
})

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'services', label: 'Services' },
  { id: 'journeys', label: 'Journeys' },
  { id: 'payments', label: 'Payments' },
  { id: 'documents', label: 'Documents' },
  { id: 'notes', label: 'Notes' }
]

// Computed from store
const matter = computed(() => matterStore.currentMatter)

// Transform services to snake_case for the existing table component
// (can be removed once we update the table component to use camelCase)
const servicesForTable = computed(() => {
  return matterStore.services.map(s => ({
    catalog_id: s.catalogId,
    name: s.name,
    category: s.category,
    price: s.price,
    status: s.status,
    engaged_at: s.engagedAt,
    assigned_attorney_name: s.assignedAttorneyName
  }))
})

// Transform payments to snake_case for the existing table component
const paymentsForTable = computed(() => {
  return matterStore.payments.map(p => ({
    id: p.id,
    payment_type: p.paymentType,
    amount: p.amount,
    status: p.status,
    paid_at: p.paidAt
  }))
})

// Transform matter for edit modal (expects snake_case)
const matterForEditModal = computed(() => {
  if (!matter.value) return null
  return {
    id: matter.value.id,
    client_id: matter.value.clientId,
    title: matter.value.title,
    matter_number: matter.value.matterNumber,
    description: matter.value.description,
    status: matter.value.status,
    lead_attorney_id: matter.value.leadAttorneyId,
    engagement_journey_id: matter.value.engagementJourneyId
  }
})

// Fetch service catalog (for add service modal)
async function fetchCatalog() {
  try {
    const response = await $fetch<any>('/api/catalog')
    catalog.value = response.services || response || []
  } catch (error) {
    console.error('Failed to fetch catalog:', error)
  }
}

// Fetch clients for dropdown
async function fetchClients() {
  try {
    const response = await $fetch<{ clients: any[] }>('/api/clients')
    clients.value = response.clients || response
  } catch (error) {
    console.error('Failed to fetch clients:', error)
  }
}

// Fetch lawyers for dropdown
async function fetchLawyers() {
  try {
    const response = await $fetch<{ lawyers: any[] }>('/api/matters/lawyers')
    lawyers.value = response.lawyers || []
  } catch (error) {
    console.error('Failed to fetch lawyers:', error)
  }
}

// Fetch engagement journey templates
async function fetchEngagementJourneys() {
  try {
    const response = await $fetch<{ engagementJourneys: any[] }>('/api/journeys/engagement-templates')
    engagementJourneys.value = response.engagementJourneys || []
  } catch (error) {
    console.error('Failed to fetch engagement journeys:', error)
  }
}

// Add service to matter
async function handleAddService() {
  if (!newServiceForm.value.catalogId) return

  addingService.value = true
  try {
    await $fetch(`/api/matters/${matterId}/services`, {
      method: 'POST',
      body: { catalogId: newServiceForm.value.catalogId }
    })

    // Refresh services in store
    await matterStore.refreshServices()

    // Reset form and close modal
    showAddServiceModal.value = false
    newServiceForm.value.catalogId = ''
    toast.success('Service added successfully')
  } catch (error: any) {
    console.error('Failed to add service:', error)

    if (error.statusCode === 409) {
      toast.error('This service is already engaged for this matter')
    } else if (error.statusCode === 404) {
      toast.error('Service not found in catalog')
    } else {
      toast.error(error.data?.message || 'Failed to add service')
    }
  } finally {
    addingService.value = false
  }
}

// Edit matter
async function handleMatterSaved() {
  showEditModal.value = false
  await matterStore.refreshMatter()
}

function viewJourney(journeyId: string) {
  router.push(`/my-journeys/${journeyId}`)
}

function viewEngagementJourney(clientJourneyId: string) {
  router.push(`/my-journeys/${clientJourneyId}`)
}

function getStatusVariant(status: string): 'success' | 'info' | 'default' | 'danger' {
  switch (status) {
    case 'OPEN':
      return 'success'
    case 'PENDING':
      return 'info'
    case 'CLOSED':
      return 'default'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'default'
  }
}

function getJourneyStatusVariant(status: string): 'success' | 'info' | 'default' | 'danger' {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'IN_PROGRESS':
      return 'info'
    case 'PAUSED':
      return 'default'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'default'
  }
}

// Document action handlers
function handleDownloadDocument(docId: string) {
  window.open(`/api/documents/${docId}/download`, '_blank')
}

function handleViewDocument(docId: string) {
  router.push(`/documents/${docId}`)
}

function handleDownloadUpload(uploadId: string) {
  window.open(`/api/document-uploads/${uploadId}/download`, '_blank')
}

// Handle Drive synced - update store
function handleDriveSynced(data: { folderId: string; folderUrl: string }) {
  matterStore.updateDriveSync(data)
}

// Set document view and save preference
function setDocumentView(view: 'local' | 'drive') {
  documentView.value = view
  preferencesStore.setDocumentsDefaultView(view)
}

// Watch for tab changes to load documents on demand
watch(activeTab, (newTab) => {
  if (newTab === 'documents' && matterStore.documents.length === 0 && !matterStore.loadingDocuments) {
    matterStore.fetchDocuments()
  }
})

// Fall back to 'local' if preference is 'drive' but matter has no Drive folder
watch(() => matterStore.hasDriveFolder, (hasDriveFolder) => {
  if (!hasDriveFolder && documentView.value === 'drive') {
    documentView.value = 'local'
  }
}, { immediate: true })

// Clear store on unmount (optional - depends on your caching strategy)
onUnmounted(() => {
  // Optionally clear the store when leaving the page
  // matterStore.clearCurrentMatter()
})

onMounted(async () => {
  // Hydrate preferences from localStorage and apply to local state
  preferencesStore.hydrateFromStorage()
  documentView.value = preferencesStore.documentsDefaultView

  // Fetch matter data via store
  await matterStore.fetchMatter(matterId)

  // Fetch dropdown data for modals (these could also be in separate stores)
  await Promise.all([
    fetchCatalog(),
    fetchClients(),
    fetchLawyers(),
    fetchEngagementJourneys()
  ])
})
</script>
