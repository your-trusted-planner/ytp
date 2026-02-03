<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header -->
    <div class="bg-[#0A2540] text-white py-6 shadow-lg">
      <div class="max-w-4xl mx-auto px-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold">Schedule Your Consultation</h1>
            <p class="text-slate-300 mt-1">Wyoming Asset Protection Trust (WYDAPT)</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-slate-300">Consultation Fee</p>
            <p class="text-2xl font-bold">${{ consultationFee / 100 }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Steps -->
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-center space-x-4 mb-8">
        <div :class="stepClass(1)">
          <div :class="stepCircleClass(1)">1</div>
          <p class="text-xs mt-2">Questionnaire</p>
        </div>
        <div class="h-0.5 w-16 bg-slate-300" :class="{ 'bg-[#C41E3A]': currentStep > 1 }"></div>
        <div :class="stepClass(2)">
          <div :class="stepCircleClass(2)">2</div>
          <p class="text-xs mt-2">Payment</p>
        </div>
        <div class="h-0.5 w-16 bg-slate-300" :class="{ 'bg-[#C41E3A]': currentStep > 2 }"></div>
        <div :class="stepClass(3)">
          <div :class="stepCircleClass(3)">3</div>
          <p class="text-xs mt-2">Schedule</p>
        </div>
        <div class="h-0.5 w-16 bg-slate-300" :class="{ 'bg-[#C41E3A]': currentStep > 3 }"></div>
        <div :class="stepClass(4)">
          <div :class="stepCircleClass(4)">✓</div>
          <p class="text-xs mt-2">Confirmed</p>
        </div>
      </div>

      <!-- Step 1: Questionnaire -->
      <div v-if="currentStep === 1" class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-[#0A2540] mb-6">Pre-Consultation Questionnaire</h2>
        <p class="text-slate-600 mb-6">Please answer the following questions to help us prepare for your consultation.</p>

        <form @submit.prevent="submitQuestionnaire" class="space-y-6">
          <!-- Personal Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">First Name *</label>
              <input
                v-model="formData.firstName"
                type="text"
                required
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Last Name *</label>
              <input
                v-model="formData.lastName"
                type="text"
                required
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
              <input
                v-model="formData.email"
                type="email"
                required
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
              <input
                v-model="formData.phone"
                type="tel"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
              />
            </div>
          </div>

          <!-- Questionnaire Questions -->
          <div v-for="(question, index) in questions" :key="question.id" class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">
              {{ index + 1 }}. {{ question.question }}
              <span v-if="question.required" class="text-red-500">*</span>
            </label>

            <!-- Text Input -->
            <input
              v-if="question.type === 'text'"
              v-model="responses[question.id]"
              type="text"
              :required="question.required"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
            />

            <!-- Textarea -->
            <textarea
              v-else-if="question.type === 'textarea'"
              v-model="responses[question.id]"
              :required="question.required"
              :rows="4"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
            ></textarea>

            <!-- Select -->
            <select
              v-else-if="question.type === 'select'"
              v-model="responses[question.id]"
              :required="question.required"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
            >
              <option value="">Select an option</option>
              <option v-for="option in question.options" :key="option" :value="option">
                {{ option }}
              </option>
            </select>

            <!-- Radio -->
            <div v-else-if="question.type === 'radio'" class="space-y-2">
              <label v-for="option in question.options" :key="option" class="flex items-center space-x-2">
                <input
                  v-model="responses[question.id]"
                  type="radio"
                  :value="option"
                  :required="question.required"
                  class="text-[#C41E3A] focus:ring-[#C41E3A]"
                />
                <span class="text-slate-700">{{ option }}</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end pt-6">
            <button
              type="submit"
              :disabled="loading"
              class="px-8 py-3 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ loading ? 'Processing...' : 'Continue to Payment' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Step 2: Payment -->
      <div v-if="currentStep === 2" class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-[#0A2540] mb-6">Consultation Fee Payment</h2>
        <p class="text-slate-600 mb-6">To proceed with booking your consultation, please complete the payment below.</p>

        <div class="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-6">
          <div class="flex justify-between items-center mb-4">
            <span class="text-slate-700">Consultation Fee</span>
            <span class="text-2xl font-bold text-[#0A2540]">${{ consultationFee / 100 }}</span>
          </div>
          <p class="text-sm text-slate-600">
            This fee is non-refundable and is not credited toward the WYDAPT service fee of $18,500.
          </p>
        </div>

        <!-- LawPay Integration Placeholder -->
        <div class="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center mb-6">
          <div class="text-slate-400 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
          </div>
          <p class="text-slate-600 font-medium mb-2">LawPay Payment Form</p>
          <p class="text-sm text-slate-500">Secure payment processing powered by LawPay</p>
        </div>

        <!-- Temporary Button for Demo -->
        <div class="flex justify-between">
          <button
            @click="currentStep = 1"
            class="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
          >
            Back
          </button>
          <button
            @click="processPayment"
            :disabled="loading"
            class="px-8 py-3 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50"
          >
            {{ loading ? 'Processing...' : 'Complete Payment' }}
          </button>
        </div>
      </div>

      <!-- Step 3: Schedule -->
      <div v-if="currentStep === 3" class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-[#0A2540] mb-6">Select Appointment Time</h2>
        <p class="text-slate-600 mb-6">Choose a time that works best for your consultation.</p>

        <!-- Calendar Placeholder -->
        <div class="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center mb-6">
          <div class="text-slate-400 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <p class="text-slate-600 font-medium mb-2">Google Calendar Integration</p>
          <p class="text-sm text-slate-500">Available appointment times will display here</p>
        </div>

        <!-- Time Slot Selection -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <button
            v-for="slot in availableSlots"
            :key="slot.time"
            @click="selectedSlot = slot"
            :class="[
              'p-4 border-2 rounded-lg transition-all',
              selectedSlot?.time === slot.time
                ? 'border-[#C41E3A] bg-red-50'
                : 'border-slate-200 hover:border-slate-300'
            ]"
          >
            <div class="font-semibold text-slate-900">{{ slot.date }}</div>
            <div class="text-sm text-slate-600">{{ slot.time }}</div>
          </button>
        </div>

        <div class="flex justify-between">
          <button
            @click="currentStep = 2"
            class="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
          >
            Back
          </button>
          <button
            @click="confirmBooking"
            :disabled="!selectedSlot || loading"
            class="px-8 py-3 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50"
          >
            {{ loading ? 'Confirming...' : 'Confirm Booking' }}
          </button>
        </div>
      </div>

      <!-- Step 4: Confirmation -->
      <div v-if="currentStep === 4" class="bg-white rounded-lg shadow-lg p-8 text-center">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-[#0A2540] mb-4">Consultation Confirmed!</h2>
        <p class="text-slate-600 mb-8">Thank you for scheduling your consultation.</p>

        <div class="bg-slate-50 border border-slate-200 rounded-lg p-6 max-w-md mx-auto mb-8">
          <h3 class="font-semibold text-slate-900 mb-4">Appointment Details</h3>
          <div class="space-y-2 text-left">
            <div class="flex justify-between">
              <span class="text-slate-600">Name:</span>
              <span class="font-medium">{{ formData.firstName }} {{ formData.lastName }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Email:</span>
              <span class="font-medium">{{ formData.email }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Date & Time:</span>
              <span class="font-medium">{{ selectedSlot?.date }} at {{ selectedSlot?.time }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Booking ID:</span>
              <span class="font-mono text-sm">{{ bookingId }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <p class="text-slate-600">
            A confirmation email has been sent to <strong>{{ formData.email }}</strong>
          </p>
          <p class="text-sm text-slate-500">
            You will receive a Zoom link 24 hours before your appointment.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const toast = useToast()

definePageMeta({
  layout: false, // No auth required for public page
})

const currentStep = ref(1)
const loading = ref(false)
const consultationFee = ref(37500) // $375 in cents
const bookingId = ref('')
const selectedSlot = ref<any>(null)

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
})

const responses = ref<Record<string, any>>({})

// Sample questions - in production, fetch from API
const questions = ref([
  {
    id: 'q1',
    question: 'What is your primary goal for creating a Wyoming Asset Protection Trust?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'q2',
    question: 'What is your approximate net worth?',
    type: 'select',
    required: true,
    options: ['Under $1M', '$1M - $5M', '$5M - $10M', '$10M - $25M', 'Over $25M'],
  },
  {
    id: 'q3',
    question: 'Are you currently involved in any litigation or legal disputes?',
    type: 'radio',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    id: 'q4',
    question: 'Do you own a business?',
    type: 'radio',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    id: 'q5',
    question: 'Are you married?',
    type: 'radio',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    id: 'q6',
    question: 'Do you have minor children?',
    type: 'radio',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    id: 'q7',
    question: 'What types of assets do you wish to protect? (Select all that apply)',
    type: 'textarea',
    required: true,
  },
  {
    id: 'q8',
    question: 'When would you like to have your trust established?',
    type: 'select',
    required: true,
    options: ['Within 30 days', '1-3 months', '3-6 months', '6-12 months', 'Just exploring'],
  },
  {
    id: 'q9',
    question: 'Do you have an existing estate plan?',
    type: 'radio',
    required: true,
    options: ['Yes', 'No'],
  },
  {
    id: 'q10',
    question: 'How did you hear about us?',
    type: 'select',
    required: false,
    options: ['Google Search', 'Referral', 'Social Media', 'Other'],
  },
])

// Sample available slots - in production, fetch from Google Calendar API
const availableSlots = ref([
  { date: 'Jan 10, 2026', time: '10:00 AM' },
  { date: 'Jan 10, 2026', time: '2:00 PM' },
  { date: 'Jan 11, 2026', time: '10:00 AM' },
  { date: 'Jan 11, 2026', time: '1:00 PM' },
  { date: 'Jan 12, 2026', time: '11:00 AM' },
  { date: 'Jan 12, 2026', time: '3:00 PM' },
])

const stepClass = (step: number) => {
  return currentStep.value >= step ? 'text-[#C41E3A] font-semibold' : 'text-slate-400'
}

const stepCircleClass = (step: number) => {
  const base = 'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold'
  return currentStep.value >= step
    ? `${base} bg-[#C41E3A] text-white`
    : `${base} bg-slate-200 text-slate-500`
}

const submitQuestionnaire = async () => {
  loading.value = true
  try {
    // In production, call API to create booking
    const response = await $fetch('/api/public/booking/create', {
      method: 'POST',
      body: {
        email: formData.value.email,
        firstName: formData.value.firstName,
        lastName: formData.value.lastName,
        phone: formData.value.phone,
        questionnaireId: 'wydapt-questionnaire', // Get from API
        responses: responses.value,
      },
    })
    
    bookingId.value = response.bookingId
    currentStep.value = 2
  } catch (error) {
    console.error('Booking creation failed:', error)
    toast.error('An error occurred. Please try again.')
  } finally {
    loading.value = false
  }
}

const processPayment = async () => {
  loading.value = true
  try {
    // In production, integrate with LawPay
    // For now, simulate payment success
    await new Promise(resolve => setTimeout(resolve, 1500))
    currentStep.value = 3
  } catch (error) {
    console.error('Payment failed:', error)
    toast.error('Payment processing failed. Please try again.')
  } finally {
    loading.value = false
  }
}

const confirmBooking = async () => {
  loading.value = true
  try {
    // In production, create appointment and link to booking
    await new Promise(resolve => setTimeout(resolve, 1000))
    currentStep.value = 4
  } catch (error) {
    console.error('Booking confirmation failed:', error)
    toast.error('An error occurred. Please try again.')
  } finally {
    loading.value = false
  }
}
</script>

