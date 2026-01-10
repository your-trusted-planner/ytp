<template>
  <UiModal
    v-model="isOpen"
    :title="editingMatter ? 'Edit Matter' : 'Add New Matter'"
    size="xl"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Matter Details -->
      <UiInput
        v-model="form.title"
        label="Matter Title"
        placeholder="e.g., Smith Family Trust 2024"
        required
      />

      <UiSelect
        v-model="form.clientId"
        label="Client"
        required
        :disabled="!!editingMatter"
      >
        <option value="">Select Client</option>
        <option v-for="client in clients" :key="client.id" :value="client.id">
          {{ client.firstName }} {{ client.lastName }}
        </option>
      </UiSelect>

      <UiTextarea
        v-model="form.description"
        label="Description"
        placeholder="Brief description of the matter..."
        :rows="3"
      />

      <UiSelect
        v-model="form.status"
        label="Status"
        required
      >
        <option value="PENDING">Pending</option>
        <option value="OPEN">Open</option>
        <option value="CLOSED">Closed</option>
      </UiSelect>

      <!-- Engagement Details Section -->
      <div class="border-t pt-4 mt-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Engagement Details</h3>

        <div class="grid grid-cols-1 gap-4">
          <UiSelect
            v-model="form.leadAttorneyId"
            label="Lead Attorney (Optional)"
          >
            <option value="">-- Select Lead Attorney --</option>
            <option v-for="lawyer in lawyers" :key="lawyer.id" :value="lawyer.id">
              {{ lawyer.firstName }} {{ lawyer.lastName }}
            </option>
          </UiSelect>

          <UiSelect
            v-model="form.engagementJourneyTemplateId"
            label="Engagement Journey (Optional)"
          >
            <option value="">-- Select Engagement Journey --</option>
            <option v-for="journey in engagementJourneys" :key="journey.id" :value="journey.id">
              {{ journey.name }}
              <span v-if="journey.step_count">({{ journey.step_count }} steps)</span>
            </option>
          </UiSelect>

          <p class="text-sm text-gray-600">
            Select an engagement journey template to guide the client through initial onboarding.
          </p>
        </div>
      </div>

      <!-- Services Section (only for new matters) -->
      <div v-if="!editingMatter" class="border-t pt-4 mt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Services</h3>
          <span class="text-sm text-gray-500">(Optional)</span>
        </div>

        <label class="block text-sm font-medium text-gray-700 mb-2">Select Services to Engage</label>
        <div class="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
          <label
            v-for="item in catalog"
            :key="item.id"
            class="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              :value="item.id"
              v-model="selectedServices"
              class="mt-1 h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
            />
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900">{{ item.name }}</div>
              <div class="text-xs text-gray-500">{{ formatCurrency(item.price) }}</div>
            </div>
          </label>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-between w-full">
        <!-- Delete button (left side, only in edit mode) -->
        <div v-if="editingMatter">
          <button
            type="button"
            disabled
            class="px-4 py-2 text-red-600 border border-red-300 rounded-md bg-red-50 opacity-50 cursor-not-allowed"
            title="Matter deletion will be available in a future release. Please close the matter instead."
          >
            Delete Matter
          </button>
        </div>
        <div v-else></div>

        <!-- Action buttons (right side) -->
        <div class="flex space-x-3">
          <UiButton type="button" variant="outline" @click="handleCancel">
            Cancel
          </UiButton>
          <UiButton @click="handleSubmit" :is-loading="saving">
            {{ editingMatter ? 'Update Matter' : 'Create Matter' }}
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/utils/format'

interface Matter {
  id: string
  title: string
  clientId: string
  description?: string
  status: string
  leadAttorneyId?: string
  engagementJourneyId?: string
}

interface Props {
  modelValue: boolean
  editingMatter?: Matter | null
  clients: any[]
  lawyers: any[]
  engagementJourneys: any[]
  catalog: any[]
  defaultClientId?: string
}

const props = withDefaults(defineProps<Props>(), {
  editingMatter: null,
  defaultClientId: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [matterId?: string]
  'cancel': []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const saving = ref(false)
const selectedServices = ref<string[]>([])

const form = ref({
  title: '',
  clientId: '',
  description: '',
  status: 'PENDING',
  leadAttorneyId: '',
  engagementJourneyTemplateId: ''
})

// Watch for editing matter changes
watch(() => props.editingMatter, (matter) => {
  if (matter) {
    form.value = {
      title: matter.title,
      clientId: matter.clientId,
      description: matter.description || '',
      status: matter.status,
      leadAttorneyId: matter.leadAttorneyId || '',
      engagementJourneyTemplateId: matter.engagementJourneyId || ''
    }
  } else {
    // Reset form for new matter, using defaultClientId if provided
    form.value = {
      title: '',
      clientId: props.defaultClientId || '',
      description: '',
      status: 'PENDING',
      leadAttorneyId: '',
      engagementJourneyTemplateId: ''
    }
    selectedServices.value = []
  }
}, { immediate: true })

// Watch for defaultClientId changes (for pre-filling new matter forms)
watch(() => props.defaultClientId, (clientId) => {
  if (!props.editingMatter && clientId) {
    form.value.clientId = clientId
  }
})

async function handleSubmit() {
  if (!form.value.title || !form.value.clientId || !form.value.status) {
    alert('Please fill in all required fields')
    return
  }

  saving.value = true
  try {
    if (props.editingMatter) {
      // Update existing matter
      await $fetch(`/api/matters/${props.editingMatter.id}`, {
        method: 'PUT',
        body: {
          title: form.value.title,
          description: form.value.description,
          status: form.value.status,
          leadAttorneyId: form.value.leadAttorneyId || null,
          engagementJourneyTemplateId: form.value.engagementJourneyTemplateId || null
        }
      })
    } else {
      // Create new matter
      const response = await $fetch('/api/matters', {
        method: 'POST',
        body: {
          title: form.value.title,
          clientId: form.value.clientId,
          description: form.value.description,
          status: form.value.status,
          leadAttorneyId: form.value.leadAttorneyId || undefined,
          engagementJourneyTemplateId: form.value.engagementJourneyTemplateId || undefined,
          serviceIds: selectedServices.value
        }
      })
    }

    emit('save', props.editingMatter?.id)
    isOpen.value = false
  } catch (error: any) {
    console.error('Error saving matter:', error)
    alert(error.data?.message || 'Failed to save matter')
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}
</script>
