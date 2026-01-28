<template>
  <UiModal v-model="isOpen" title="Edit Journey" size="lg">
    <form @submit.prevent="handleSubmit" class="space-y-4">
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

      <!-- Service Catalog Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ form.journeyType === 'ENGAGEMENT' ? 'Available Services (client chooses at end)' : 'Associated Service' }}
        </label>
        <p class="text-sm text-gray-500 mb-3">
          {{ form.journeyType === 'ENGAGEMENT'
            ? 'Select which services this engagement journey can lead to'
            : 'Select the service this journey delivers' }}
        </p>
        <div class="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
          <label
            v-for="service in serviceCatalog"
            :key="service.id"
            class="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            :class="{ 'bg-burgundy-50': form.catalogIds.includes(service.id) }"
          >
            <input
              type="checkbox"
              :value="service.id"
              v-model="form.catalogIds"
              class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
            />
            <div class="ml-3">
              <div class="text-sm font-medium text-gray-900">{{ service.name }}</div>
              <div v-if="service.category" class="text-xs text-gray-500">{{ service.category }}</div>
            </div>
          </label>
          <div v-if="serviceCatalog.length === 0" class="p-3 text-sm text-gray-500 text-center">
            No services in catalog
          </div>
        </div>
        <p v-if="form.catalogIds.length > 0" class="mt-2 text-sm text-gray-600">
          {{ form.catalogIds.length }} service{{ form.catalogIds.length === 1 ? '' : 's' }} selected
        </p>
      </div>

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
        <UiButton type="button" variant="ghost" @click="handleCancel">
          Cancel
        </UiButton>
        <UiButton type="submit" :loading="saving">
          Save Changes
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface CatalogItem {
  id: string
  name: string
  category?: string
}

interface Journey {
  id: string
  name: string
  description?: string
  catalog_items?: CatalogItem[]
  estimated_duration_days?: number
  journey_type?: string
}

interface Props {
  modelValue: boolean
  journey: Journey | null
  serviceCatalog?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  serviceCatalog: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [journey: Journey, data: any]
  'cancel': []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const saving = ref(false)
const form = ref({
  name: '',
  description: '',
  catalogIds: [] as string[],
  estimatedDurationDays: null as number | null,
  journeyType: 'SERVICE' as 'SERVICE' | 'ENGAGEMENT'
})

// Watch for journey changes to populate form
watch(() => props.journey, (journey) => {
  if (journey) {
    // Extract catalog IDs from catalog_items array
    const catalogIds = journey.catalog_items?.map(item => item.id) || []
    form.value = {
      name: journey.name,
      description: journey.description || '',
      catalogIds,
      estimatedDurationDays: journey.estimated_duration_days || null,
      journeyType: (journey.journey_type as 'SERVICE' | 'ENGAGEMENT') || 'SERVICE'
    }
  }
}, { immediate: true })

async function handleSubmit() {
  if (!props.journey) return

  saving.value = true
  try {
    await $fetch(`/api/journeys/${props.journey.id}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        description: form.value.description,
        catalogIds: form.value.catalogIds,
        isActive: true,
        estimatedDurationDays: form.value.estimatedDurationDays,
        journeyType: form.value.journeyType
      }
    })

    emit('save', props.journey, form.value)
    isOpen.value = false
  } catch (error) {
    console.error('Error updating journey:', error)
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}
</script>
