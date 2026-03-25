<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header -->
    <div class="bg-[#0A2540] text-white py-6 shadow-lg">
      <div class="max-w-4xl mx-auto px-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold">
              {{ appointmentType?.name || 'Book a Consultation' }}
            </h1>
            <p
              v-if="appointmentType?.staff"
              class="text-slate-300 mt-1"
            >
              with {{ appointmentType.staff.name }}
            </p>
          </div>
          <div
            v-if="appointmentType?.consultationFeeEnabled && appointmentType.consultationFee > 0"
            class="text-right"
          >
            <p class="text-sm text-slate-300">
              Consultation Fee
            </p>
            <p class="text-2xl font-bold">
              ${{ (appointmentType.consultationFee / 100).toFixed(0) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-8">
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

      <!-- Error / Not Found -->
      <div
        v-else-if="error"
        class="bg-white rounded-lg shadow-lg p-8 text-center"
      >
        <h2 class="text-xl font-bold text-gray-900 mb-2">
          Not Found
        </h2>
        <p class="text-gray-600 mb-4">
          {{ error }}
        </p>
        <NuxtLink
          to="/book"
          class="text-[#C41E3A] font-medium hover:underline"
        >View all consultations</NuxtLink>
      </div>

      <!-- Booking Form -->
      <template v-else-if="appointmentType">
        <!-- Info Bar -->
        <div class="bg-white rounded-lg shadow p-4 mb-6 flex items-center gap-4 text-sm text-slate-600">
          <span>{{ appointmentType.defaultDurationMinutes }} minutes</span>
          <span v-if="appointmentType.defaultLocation">{{ appointmentType.defaultLocation }}</span>
          <span>with {{ appointmentType.staff.name }}</span>
        </div>

        <!-- New Form System -->
        <div
          v-if="appointmentType.form"
          class="bg-white rounded-lg shadow-lg p-8"
        >
          <h2 class="text-2xl font-bold text-[#0A2540] mb-6">
            {{ appointmentType.form.name || 'Pre-Consultation Questionnaire' }}
          </h2>

          <FormRenderer
            :definition="appointmentType.form"
            :scheduler-context="schedulerContext"
            submit-label="Continue"
            :submitting="submitting"
            @submit="handleFormSubmit"
          />
        </div>

        <!-- Legacy Questionnaire -->
        <div
          v-else
          class="bg-white rounded-lg shadow-lg p-8"
        >
          <h2 class="text-2xl font-bold text-[#0A2540] mb-6">
            Pre-Consultation Questionnaire
          </h2>

          <form
            class="space-y-6"
            @submit.prevent="submitLegacyQuestionnaire"
          >
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">First Name *</label>
                <input
                  v-model="legacyFormData.firstName"
                  type="text"
                  required
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Last Name *</label>
                <input
                  v-model="legacyFormData.lastName"
                  type="text"
                  required
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                >
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
                <input
                  v-model="legacyFormData.email"
                  type="email"
                  required
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                <UiPhoneInput
                  v-model="legacyFormData.phone"
                  class="focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                />
              </div>
            </div>

            <!-- Dynamic Questionnaire -->
            <div
              v-if="appointmentType.questionnaire?.questions"
              class="space-y-6"
            >
              <div
                v-for="(question, index) in appointmentType.questionnaire.questions"
                :key="question.id || index"
                class="space-y-2"
              >
                <label class="block text-sm font-medium text-slate-700">
                  {{ index + 1 }}. {{ question.question }}
                  <span
                    v-if="question.required"
                    class="text-red-500"
                  >*</span>
                </label>

                <input
                  v-if="question.type === 'text'"
                  v-model="legacyResponses[question.id || `q${index}`]"
                  type="text"
                  :required="question.required"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                >

                <textarea
                  v-else-if="question.type === 'textarea'"
                  v-model="legacyResponses[question.id || `q${index}`]"
                  :required="question.required"
                  :rows="4"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                />

                <select
                  v-else-if="question.type === 'select'"
                  v-model="legacyResponses[question.id || `q${index}`]"
                  :required="question.required"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                >
                  <option value="">
                    Select an option
                  </option>
                  <option
                    v-for="option in question.options"
                    :key="option"
                    :value="option"
                  >
                    {{ option }}
                  </option>
                </select>

                <div
                  v-else-if="question.type === 'radio'"
                  class="space-y-2"
                >
                  <label
                    v-for="option in question.options"
                    :key="option"
                    class="flex items-center space-x-2"
                  >
                    <input
                      v-model="legacyResponses[question.id || `q${index}`]"
                      type="radio"
                      :value="option"
                      :required="question.required"
                      class="text-[#C41E3A] focus:ring-[#C41E3A]"
                    >
                    <span class="text-slate-700">{{ option }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="flex justify-end pt-6">
              <button
                type="submit"
                :disabled="submitting"
                class="px-8 py-3 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50"
              >
                {{ submitting ? 'Processing...' : 'Continue' }}
              </button>
            </div>
          </form>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { FormDefinition, FormSubmissionPayload, SchedulerContext } from '~/types/form'

definePageMeta({
  layout: false
})

const route = useRoute()
const toast = useToast()
const slug = route.params.slug as string
const staffSlug = route.params.staffSlug as string

interface StaffSpecificType {
  id: string
  name: string
  slug: string
  description: string | null
  defaultDurationMinutes: number
  color: string
  consultationFee: number
  consultationFeeEnabled: boolean
  defaultLocation: string | null
  form: FormDefinition | null
  questionnaire: { id: string, name: string, questions: any[] } | null
  staff: { id: string, name: string, slug: string }
}

const appointmentType = ref<StaffSpecificType | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const submitting = ref(false)

// Legacy questionnaire state
const legacyFormData = ref({ firstName: '', lastName: '', email: '', phone: '' })
const legacyResponses = ref<Record<string, any>>({})

// Scheduler context — staff member is locked in
const schedulerContext = computed<SchedulerContext>(() => ({
  attorneyIds: appointmentType.value?.staff ? [appointmentType.value.staff.id] : [],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
}))

onMounted(async () => {
  try {
    appointmentType.value = await $fetch<StaffSpecificType>(
      `/api/public/appointment-types/staff/${slug}.${staffSlug}`
    )
  }
  catch (err: any) {
    error.value = err.data?.message || 'This booking link is not available.'
  }
  finally {
    loading.value = false
  }
})

// ── New Form System Submit ───────────────────────────────────────────────────

async function handleFormSubmit(payload: FormSubmissionPayload) {
  if (!appointmentType.value) return
  submitting.value = true

  try {
    const pf = payload.personFields
    const email = pf.email || ''
    const firstName = pf.firstName || ''
    const lastName = pf.lastName || ''

    if (!email || !firstName || !lastName) {
      toast.error('Please fill in your name and email address.')
      submitting.value = false
      return
    }

    const response = await $fetch<{ bookingId: string }>('/api/public/booking/create', {
      method: 'POST',
      body: {
        email,
        firstName,
        lastName,
        phone: pf.phone || undefined,
        appointmentTypeId: appointmentType.value.id,
        formId: appointmentType.value.form!.id,
        formData: payload.responses,
        personFields: payload.personFields,
        attorneyId: appointmentType.value.staff.id
      }
    })

    await navigateTo(`/book/booking/${response.bookingId}`)
  }
  catch (err: any) {
    toast.error(err.data?.message || 'An error occurred. Please try again.')
  }
  finally {
    submitting.value = false
  }
}

// ── Legacy Questionnaire Submit ──────────────────────────────────────────────

async function submitLegacyQuestionnaire() {
  if (!appointmentType.value) return
  submitting.value = true

  try {
    const response = await $fetch<{ bookingId: string }>('/api/public/booking/create', {
      method: 'POST',
      body: {
        email: legacyFormData.value.email,
        firstName: legacyFormData.value.firstName,
        lastName: legacyFormData.value.lastName,
        phone: legacyFormData.value.phone,
        appointmentTypeId: appointmentType.value.id,
        questionnaireId: appointmentType.value.questionnaire?.id,
        responses: legacyResponses.value,
        attorneyId: appointmentType.value.staff.id
      }
    })

    await navigateTo(`/book/booking/${response.bookingId}`)
  }
  catch (err: any) {
    toast.error(err.data?.message || 'An error occurred. Please try again.')
  }
  finally {
    submitting.value = false
  }
}
</script>
