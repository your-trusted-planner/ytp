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
import { ref, watch } from 'vue'

interface Journey {
  id: string
  name: string
  description?: string
  service_catalog_id?: string
  estimated_duration_days?: number
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
  serviceCatalogId: '',
  estimatedDurationDays: null as number | null
})

// Watch for journey changes to populate form
watch(() => props.journey, (journey) => {
  if (journey) {
    form.value = {
      name: journey.name,
      description: journey.description || '',
      serviceCatalogId: journey.service_catalog_id || '',
      estimatedDurationDays: journey.estimated_duration_days || null
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
        serviceCatalogId: form.value.serviceCatalogId,
        isActive: true,
        estimatedDurationDays: form.value.estimatedDurationDays
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
