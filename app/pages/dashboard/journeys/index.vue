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
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ journey.name }}</h3>
            <p v-if="journey.description" class="text-sm text-gray-600">{{ journey.description }}</p>
          </div>
          <div
            :class="[
              'px-2 py-1 rounded text-xs font-medium',
              journey.is_template ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
            ]"
          >
            {{ journey.is_template ? 'Template' : 'Active' }}
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

    <!-- Create/Edit Journey Modal -->
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
          rows="3"
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

        <div class="flex items-center">
          <input
            v-model="form.isTemplate"
            type="checkbox"
            id="isTemplate"
            class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
          />
          <label for="isTemplate" class="ml-2 block text-sm text-gray-900">
            This is a template (not an active journey)
          </label>
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
  </div>
</template>

<script setup lang="ts">
import { Plus as IconPlus, Loader as IconLoader, Map as IconMap, Folder as IconFolder, List as IconList, Users as IconUsers, Clock as IconClock } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const showCreateModal = ref(false)
const journeys = ref([])
const serviceCatalog = ref([])

const form = ref({
  name: '',
  description: '',
  serviceCatalogId: '',
  estimatedDurationDays: null,
  isTemplate: false
})

// Fetch journeys
async function fetchJourneys() {
  loading.value = true
  try {
    const { journeys: data } = await $fetch('/api/journeys')
    journeys.value = data
  } catch (error) {
    console.error('Error fetching journeys:', error)
  } finally {
    loading.value = false
  }
}

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

// Edit journey
function editJourney(journey: any) {
  // TODO: Implement edit modal
  console.log('Edit journey:', journey)
}

// Duplicate journey
async function duplicateJourney(journey: any) {
  form.value = {
    name: `${journey.name} (Copy)`,
    description: journey.description || '',
    serviceCatalogId: journey.service_catalog_id || '',
    estimatedDurationDays: journey.estimated_duration_days,
    isTemplate: Boolean(journey.is_template)
  }
  showCreateModal.value = true
}

onMounted(() => {
  fetchJourneys()
  fetchServiceCatalog()
})
</script>

