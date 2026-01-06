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
            <span class="text-gray-600">Matter #: {{ matter.matter_number }}</span>
            <UiBadge :variant="getStatusVariant(matter.status)">
              {{ matter.status }}
            </UiBadge>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
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
                  <span class="ml-2 font-medium">{{ matter.matter_number }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Status:</span>
                  <UiBadge :variant="getStatusVariant(matter.status)" class="ml-2">
                    {{ matter.status }}
                  </UiBadge>
                </div>
                <div>
                  <span class="text-gray-600">Client:</span>
                  <span class="ml-2 font-medium">{{ clientName }}</span>
                </div>
                <div v-if="matter.contract_date">
                  <span class="text-gray-600">Contract Date:</span>
                  <span class="ml-2">{{ formatDate(matter.contract_date) }}</span>
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
                  <span class="font-semibold text-burgundy-600">{{ services.length }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Active Journeys</span>
                  <span class="font-semibold">{{ journeys.length }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Total Payments</span>
                  <span class="font-semibold">{{ formatPrice(totalPayments) }}</span>
                </div>
              </div>
            </UiCard>
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
            <MatterServicesTable :services="services" />
          </UiCard>
        </div>

        <!-- Journeys Tab -->
        <div v-if="activeTab === 'journeys'">
          <UiCard>
            <div class="mb-4">
              <h3 class="text-lg font-semibold text-gray-900">Client Journeys</h3>
              <p class="text-sm text-gray-500 mt-1">Journeys are automatically created when you add a service with an associated journey template</p>
            </div>

            <div v-if="journeys.length === 0" class="text-center py-8 text-gray-500">
              No journeys started yet. Add a service to begin.
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
                    <p v-if="journey.service_name" class="text-sm text-gray-600 mt-1">
                      Service: {{ journey.service_name }}
                    </p>
                    <p v-if="journey.current_step_name" class="text-sm text-gray-600">
                      Current: {{ journey.current_step_name }}
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
            <MatterPaymentsTable :payments="payments" />
          </UiCard>
        </div>

        <!-- Documents Tab -->
        <div v-if="activeTab === 'documents'">
          <UiCard>
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Matter Documents</h3>
            <p class="text-sm text-gray-500">Document management by matter will be implemented in a future phase</p>
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
            {{ item.name }} ({{ formatPrice(item.price) }})
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

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Plus, Loader } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const matterId = route.params.id as string

const loading = ref(true)
const activeTab = ref('overview')
const showAddServiceModal = ref(false)

const matter = ref<any>(null)
const services = ref<any[]>([])
const journeys = ref<any[]>([])
const payments = ref<any[]>([])
const catalog = ref<any[]>([])

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
  { id: 'documents', label: 'Documents' }
]

const clientName = computed(() => {
  if (!matter.value) return ''
  return `${matter.value.client_first_name || ''} ${matter.value.client_last_name || ''}`.trim()
})

const totalPayments = computed(() => {
  return payments.value.reduce((sum, p) => sum + (p.amount || 0), 0)
})

// Fetch matter data
async function fetchMatter() {
  loading.value = true
  try {
    // Fetch matter details
    const { matter: matterData } = await $fetch(`/api/matters/${matterId}`)
    matter.value = matterData

    // Fetch engaged services
    const { services: servicesData } = await $fetch(`/api/matters/${matterId}/services`)
    services.value = servicesData || []

    // Fetch journeys
    const { journeys: journeysData } = await $fetch(`/api/client-journeys/matter/${matterId}`)
    journeys.value = journeysData || []

    // Fetch payments
    const { payments: paymentsData } = await $fetch(`/api/payments/matter/${matterId}`)
    payments.value = paymentsData || []
  } catch (error) {
    console.error('Error fetching matter:', error)
  } finally {
    loading.value = false
  }
}

// Fetch service catalog
async function fetchCatalog() {
  try {
    const response = await $fetch<any>('/api/catalog')
    catalog.value = response.services || response || []
  } catch (error) {
    console.error('Failed to fetch catalog:', error)
  }
}

// Add service to matter
async function handleAddService() {
  if (!newServiceForm.value.catalogId) return

  addingService.value = true
  try {
    const response = await $fetch(`/api/matters/${matterId}/services`, {
      method: 'POST',
      body: { catalogId: newServiceForm.value.catalogId }
    })

    // Refresh services list
    const { services: servicesData } = await $fetch(`/api/matters/${matterId}/services`)
    services.value = servicesData || []

    // Reset form and close modal
    showAddServiceModal.value = false
    newServiceForm.value.catalogId = ''

    console.log('Service engaged successfully:', response.engagement)
  } catch (error: any) {
    console.error('Failed to add service:', error)

    // Handle specific error cases
    if (error.statusCode === 409) {
      alert('This service is already engaged for this matter')
    } else if (error.statusCode === 404) {
      alert('Service not found in catalog')
    } else {
      alert(error.data?.message || 'Failed to add service')
    }
  } finally {
    addingService.value = false
  }
}


function viewJourney(journeyId: string) {
  router.push(`/dashboard/my-journeys/${journeyId}`)
}

function formatDate(timestamp: number) {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatPrice(price: number): string {
  if (!price) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(price)
}

function getStatusVariant(status: string): 'success' | 'primary' | 'default' | 'danger' {
  switch (status) {
    case 'OPEN':
      return 'success'
    case 'PENDING':
      return 'primary'
    case 'CLOSED':
      return 'default'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'default'
  }
}

function getJourneyStatusVariant(status: string): 'success' | 'primary' | 'default' | 'danger' {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'IN_PROGRESS':
      return 'primary'
    case 'PAUSED':
      return 'default'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'default'
  }
}

onMounted(() => {
  fetchMatter()
  fetchCatalog()
})
</script>
