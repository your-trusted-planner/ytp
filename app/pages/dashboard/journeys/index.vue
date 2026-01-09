<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold text-gray-900">Client Journeys</h1>
          <UiHelpLink topic="journeys-workflows" title="Learn about journeys and workflows" />
        </div>
        <p class="text-gray-600 mt-1">Manage workflows and client experiences</p>
      </div>
      <UiButton @click="showCreateModal = true">
        <IconPlus class="w-4 h-4 mr-2" />
        Create Journey
      </UiButton>
    </div>

    <!-- Journey Type Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeFilter = 'all'"
          :class="[
            activeFilter === 'all'
              ? 'border-burgundy-500 text-burgundy-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          ]"
        >
          All Journeys
        </button>
        <button
          @click="activeFilter = 'SERVICE'"
          :class="[
            activeFilter === 'SERVICE'
              ? 'border-burgundy-500 text-burgundy-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          ]"
        >
          Service Journeys
        </button>
        <button
          @click="activeFilter = 'ENGAGEMENT'"
          :class="[
            activeFilter === 'ENGAGEMENT'
              ? 'border-burgundy-500 text-burgundy-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
          ]"
        >
          Engagement Journeys
        </button>
      </nav>
    </div>

    <!-- Journeys Grid -->
    <div v-if="loading" class="flex justify-center py-12">
      <IconLoader class="w-8 h-8 animate-spin text-burgundy-600" />
    </div>

    <div v-else-if="journeys.length === 0" class="text-center py-12">
      <IconMap class="w-16 h-16 mx-auto text-gray-400 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No journeys yet</h3>
      <p class="text-gray-600 mb-4">Create your first client journey to get started</p>
      <UiButton @click="showCreateModal = true">Create Journey</UiButton>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="journey in journeys"
        :key="journey.id"
        class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        @click="openJourney(journey.id)"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <!-- Inline editable journey name -->
            <div class="flex items-center gap-2 mb-1">
              <UiEditableText
                v-model="journey.name"
                tag="h3"
                display-class="text-lg font-semibold text-gray-900"
                input-class="text-lg font-semibold"
                :custom-cursor="pencilCursor"
                :transform="(v) => v.toString().trim()"
                @save="saveJourneyName(journey, $event)"
                @click.stop
              />
              <UiBadge v-if="journey.journey_type === 'ENGAGEMENT'" variant="primary">
                Engagement
              </UiBadge>
            </div>
            <p v-if="journey.description" class="text-sm text-gray-600">{{ journey.description }}</p>
          </div>
        </div>

        <div class="space-y-2 text-sm">
          <div v-if="journey.service_name" class="flex items-center text-gray-600">
            <IconFolder class="w-4 h-4 mr-2" />
            {{ journey.service_name }}
          </div>
          <div class="flex items-center text-gray-600">
            <IconList class="w-4 h-4 mr-2" />
            {{ journey.step_count || 0 }} steps
          </div>
          <div class="flex items-center text-gray-600">
            <IconUsers class="w-4 h-4 mr-2" />
            {{ journey.active_clients || 0 }} active clients
          </div>
          <div v-if="journey.estimated_duration_days" class="flex items-center text-gray-600">
            <IconClock class="w-4 h-4 mr-2" />
            {{ journey.estimated_duration_days }} days estimated
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-100 flex justify-end space-x-2">
          <button
            @click.stop="editJourney(journey)"
            class="text-sm text-gray-600 hover:text-burgundy-600"
          >
            Edit
          </button>
          <button
            @click.stop="duplicateJourney(journey)"
            class="text-sm text-gray-600 hover:text-burgundy-600"
          >
            Duplicate
          </button>
        </div>
      </div>
    </div>

    <!-- Create Journey Modal -->
    <UiModal v-model="showCreateModal" title="Create Journey" size="lg">
      <form @submit.prevent="createJourney" class="space-y-4">
        <UiInput
          v-model="form.name"
          label="Journey Name"
          placeholder="e.g., Trust Formation Journey"
          required
        />

        <UiTextarea
          v-model="form.description"
          label="Description"
          placeholder="Describe the purpose of this journey..."
          :rows="3"
        />

        <UiSelect
          v-model="form.serviceCatalogId"
          label="Associated Service (Optional)"
        >
          <option value="">-- Select Service --</option>
          <option v-for="service in serviceCatalog" :key="service.id" :value="service.id">
            {{ service.name }}
          </option>
        </UiSelect>

        <UiInput
          v-model.number="form.estimatedDurationDays"
          type="number"
          label="Estimated Duration (Days)"
          placeholder="e.g., 30"
        />

        <!-- Journey Type Selector -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Journey Type</label>
          <div class="space-y-3">
            <label class="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                   :class="form.journeyType === 'SERVICE' ? 'border-burgundy-500 bg-burgundy-50' : 'border-gray-300'">
              <input
                type="radio"
                v-model="form.journeyType"
                value="SERVICE"
                class="mt-1 h-4 w-4 text-burgundy-600 focus:ring-burgundy-500"
              />
              <div class="ml-3">
                <div class="font-medium text-gray-900">Service Journey</div>
                <div class="text-sm text-gray-600">
                  For actual legal service delivery (trust creation, LLC formation, etc.)
                </div>
              </div>
            </label>

            <label class="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                   :class="form.journeyType === 'ENGAGEMENT' ? 'border-burgundy-500 bg-burgundy-50' : 'border-gray-300'">
              <input
                type="radio"
                v-model="form.journeyType"
                value="ENGAGEMENT"
                class="mt-1 h-4 w-4 text-burgundy-600 focus:ring-burgundy-500"
              />
              <div class="ml-3">
                <div class="font-medium text-gray-900">Engagement Journey</div>
                <div class="text-sm text-gray-600">
                  For initial client onboarding and engagement letter process
                </div>
              </div>
            </label>
          </div>

          <!-- Warning for ENGAGEMENT type -->
          <div v-if="form.journeyType === 'ENGAGEMENT'" class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-sm text-blue-800">
              <strong>Note:</strong> Engagement journeys can only use these action types:
              Draft Document, E-Sign, Payment, Meeting, Review, Upload, Decision
            </p>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <UiButton type="button" variant="ghost" @click="showCreateModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="saving">
            Create Journey
          </UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Edit Journey Modal -->
    <JourneyEditModal
      v-model="showEditModal"
      :journey="editingJourney"
      :service-catalog="serviceCatalog"
      @save="handleJourneySaved"
    />
  </div>
</template>

<script setup lang="ts">
import { Plus as IconPlus, Loader as IconLoader, Map as IconMap, Folder as IconFolder, List as IconList, Users as IconUsers, Clock as IconClock } from 'lucide-vue-next'
import { createSquarePenCursor } from '~/utils/createCursor'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

// Create custom pencil cursor
const pencilCursor = createSquarePenCursor({
  color: '#101010',
  size: 20
})

const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const journeys = ref([])
const serviceCatalog = ref([])
const editingJourney = ref(null)
const activeFilter = ref('all') // 'all', 'SERVICE', 'ENGAGEMENT'

const form = ref({
  name: '',
  description: '',
  serviceCatalogId: '',
  estimatedDurationDays: null,
  journeyType: 'SERVICE' // NEW - default to SERVICE
})

// Fetch journeys
async function fetchJourneys() {
  loading.value = true
  try {
    const params = activeFilter.value !== 'all'
      ? { type: activeFilter.value }
      : {}
    const { journeys: data } = await $fetch('/api/journeys', { params })
    journeys.value = data
  } catch (error) {
    console.error('Error fetching journeys:', error)
  } finally {
    loading.value = false
  }
}

// Watch for filter changes
watch(activeFilter, () => {
  fetchJourneys()
})

// Fetch service catalog for dropdown
async function fetchServiceCatalog() {
  try {
    const { catalog: data } = await $fetch('/api/service-catalog')
    serviceCatalog.value = data
  } catch (error) {
    console.error('Error fetching service catalog:', error)
  }
}

// Create journey
async function createJourney() {
  saving.value = true
  try {
    const { journey } = await $fetch('/api/journeys', {
      method: 'POST',
      body: form.value
    })
    showCreateModal.value = false
    // Navigate to journey builder
    router.push(`/dashboard/journeys/${journey.id}`)
  } catch (error) {
    console.error('Error creating journey:', error)
  } finally {
    saving.value = false
  }
}

// Open journey builder
function openJourney(id: string) {
  router.push(`/dashboard/journeys/${id}`)
}

// Edit journey - open edit modal
function editJourney(journey: any) {
  editingJourney.value = journey
  showEditModal.value = true
}

// Handle journey saved from modal
async function handleJourneySaved(journey: any, data: any) {
  // Update local state
  journey.name = data.name
  journey.description = data.description
  journey.service_catalog_id = data.serviceCatalogId
  journey.estimated_duration_days = data.estimatedDurationDays

  // Refresh to get updated service name
  await fetchJourneys()
}

// Duplicate journey
async function duplicateJourney(journey: any) {
  form.value = {
    name: `${journey.name} (Copy)`,
    description: journey.description || '',
    serviceCatalogId: journey.service_catalog_id || '',
    estimatedDurationDays: journey.estimated_duration_days,
    journeyType: journey.journey_type || 'SERVICE'
  }
  showCreateModal.value = true
}

// Save journey name (called by EditableText component)
async function saveJourneyName(journey: any, newName: string | number) {
  try {
    await $fetch(`/api/journeys/${journey.id}`, {
      method: 'PUT',
      body: {
        name: newName.toString(),
        description: journey.description,
        serviceCatalogId: journey.service_catalog_id,
        isActive: Boolean(journey.is_active),
        estimatedDurationDays: journey.estimated_duration_days
      }
    })
  } catch (error) {
    console.error('Error updating journey name:', error)
    // Revert to old name on error
    journey.name = journey.name
  }
}

onMounted(() => {
  fetchJourneys()
  fetchServiceCatalog()
})
</script>
