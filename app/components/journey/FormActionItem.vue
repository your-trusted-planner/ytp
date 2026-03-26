<template>
  <div class="border rounded-lg bg-white overflow-hidden">
    <!-- Header -->
    <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
      <div>
        <h4 class="text-sm font-semibold text-gray-800">
          {{ actionItem.title }}
        </h4>
        <p
          v-if="actionItem.description"
          class="text-xs text-gray-500 mt-0.5"
        >
          {{ actionItem.description }}
        </p>
      </div>
      <span
        v-if="actionItem.status === 'COMPLETE'"
        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
      >
        Completed
      </span>
    </div>

    <!-- Form -->
    <div
      v-if="actionItem.status !== 'COMPLETE'"
      class="p-4"
    >
      <div
        v-if="loading"
        class="text-center py-8"
      >
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-accent-500" />
        <p class="text-sm text-gray-500 mt-2">Loading form...</p>
      </div>

      <div
        v-else-if="formDefinition"
      >
        <FormRenderer
          :definition="formDefinition"
          submit-label="Submit"
          :submitting="submitting"
          persistence-mode="server"
          :action-item-id="actionItem.id"
          :client-journey-id="actionItem.client_journey_id"
          @submit="handleSubmit"
        />
      </div>

      <div
        v-else
        class="text-center py-8 text-gray-400"
      >
        <p class="text-sm">Form not available</p>
      </div>
    </div>

    <!-- Completed state -->
    <div
      v-else
      class="p-4 text-center text-gray-500"
    >
      <p class="text-sm">This form has been submitted. Thank you!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { FormDefinition, FormSubmissionPayload } from '~/types/form'

const props = defineProps<{
  actionItem: {
    id: string
    title: string
    description?: string
    config?: string
    status: string
    client_journey_id?: string
  }
}>()

const emit = defineEmits<{
  completed: [actionItemId: string]
}>()

const loading = ref(true)
const submitting = ref(false)
const formDefinition = ref<FormDefinition | null>(null)
const toast = useToast()

onMounted(async () => {
  // Parse config to get formId
  let config: { formId?: string } = {}
  if (props.actionItem.config) {
    try {
      config = JSON.parse(props.actionItem.config)
    } catch { /* ignore */ }
  }

  if (!config.formId) {
    loading.value = false
    return
  }

  try {
    formDefinition.value = await $fetch<FormDefinition>(`/api/admin/forms/${config.formId}`)
  } catch {
    // Form may have been deleted or user lacks access
  } finally {
    loading.value = false
  }
})

async function handleSubmit(payload: FormSubmissionPayload) {
  let config: { formId?: string } = {}
  if (props.actionItem.config) {
    try { config = JSON.parse(props.actionItem.config) } catch { /* */ }
  }
  if (!config.formId) return

  submitting.value = true
  try {
    await $fetch(`/api/forms/${config.formId}/submit`, {
      method: 'POST',
      body: {
        data: payload.responses,
        actionItemId: props.actionItem.id,
        clientJourneyId: props.actionItem.client_journey_id,
        personFields: payload.personFields
      }
    })
    toast.success('Form submitted successfully')
    emit('completed', props.actionItem.id)
  } catch (err: any) {
    toast.error(err.data?.message || 'Failed to submit form')
  } finally {
    submitting.value = false
  }
}
</script>
