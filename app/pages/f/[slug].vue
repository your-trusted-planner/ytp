<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header -->
    <div class="bg-[#0A2540] text-white py-6 shadow-lg">
      <div class="max-w-3xl mx-auto px-4">
        <h1 class="text-3xl font-bold">
          {{ formDefinition?.name || 'Form' }}
        </h1>
        <p
          v-if="formDefinition?.description"
          class="text-slate-300 mt-1"
        >
          {{ formDefinition.description }}
        </p>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 py-8">
      <!-- Loading -->
      <div
        v-if="loading"
        class="text-center py-12"
      >
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#C41E3A]" />
        <p class="text-slate-500 mt-3">
          Loading...
        </p>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="bg-white rounded-lg shadow-lg p-8 text-center"
      >
        <h2 class="text-xl font-bold text-gray-900 mb-2">
          Not Found
        </h2>
        <p class="text-gray-600">
          {{ error }}
        </p>
      </div>

      <!-- Submitted -->
      <div
        v-else-if="submitted"
        class="bg-white rounded-lg shadow-lg p-8 text-center"
      >
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle class="w-8 h-8 text-green-600" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">
          Thank You!
        </h2>
        <p class="text-gray-600">
          {{ successMessage }}
        </p>
      </div>

      <!-- Form -->
      <div
        v-else-if="formDefinition"
        class="bg-white rounded-lg shadow-lg p-8"
      >
        <FormRenderer
          :definition="formDefinition"
          submit-label="Submit"
          :submitting="submitting"
          persistence-mode="local"
          :show-turnstile="true"
          @submit="handleSubmit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CheckCircle } from 'lucide-vue-next'
import type { FormDefinition, FormSubmissionPayload } from '~/types/form'

definePageMeta({
  layout: false
})

const route = useRoute()
const slug = route.params.slug as string

const formDefinition = ref<FormDefinition | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const submitting = ref(false)
const submitted = ref(false)
const successMessage = ref('Your response has been submitted.')

// Capture UTM params from URL
const utmSource = route.query.utm_source as string | undefined
const utmMedium = route.query.utm_medium as string | undefined
const utmCampaign = route.query.utm_campaign as string | undefined

onMounted(async () => {
  try {
    formDefinition.value = await $fetch<FormDefinition>(`/api/public/forms/${slug}`)
  } catch (err: any) {
    error.value = err.data?.message || 'This form is not available.'
  } finally {
    loading.value = false
  }
})

async function handleSubmit(payload: FormSubmissionPayload) {
  submitting.value = true
  try {
    const result = await $fetch<{ success: boolean; message: string }>(`/api/public/forms/${slug}/submit`, {
      method: 'POST',
      body: {
        responses: payload.responses,
        personFields: payload.personFields,
        turnstileToken: payload.turnstileToken,
        utmSource,
        utmMedium,
        utmCampaign
      }
    })
    successMessage.value = result.message
    submitted.value = true
  } catch (err: any) {
    const toast = useToast()
    toast.error(err.data?.message || 'Failed to submit form. Please try again.')
  } finally {
    submitting.value = false
  }
}
</script>
