<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header -->
    <div class="bg-[#0A2540] text-white py-6 shadow-lg">
      <div class="max-w-4xl mx-auto px-4">
        <h1 class="text-3xl font-bold">
          Schedule Your Consultation
        </h1>
        <p class="text-slate-300 mt-1">
          Complete your booking
        </p>
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
          Loading booking details...
        </p>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="bg-white rounded-lg shadow-lg p-8 text-center"
      >
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle class="w-8 h-8 text-red-600" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">
          Booking Not Found
        </h2>
        <p class="text-gray-600">
          {{ error }}
        </p>
      </div>

      <!-- Booking Steps -->
      <template v-else-if="booking">
        <!-- Progress -->
        <div class="flex items-center justify-center space-x-4 mb-8">
          <template
            v-for="(step, i) in steps"
            :key="step.label"
          >
            <div
              v-if="i > 0"
              class="h-0.5 w-16"
              :class="i > 0 && activeStepIndex >= i ? 'bg-[#C41E3A]' : 'bg-slate-300'"
            />
            <div :class="activeStepIndex >= i ? 'text-[#C41E3A] font-semibold' : 'text-slate-400'">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                :class="activeStepIndex >= i ? 'bg-[#C41E3A] text-white' : 'bg-slate-200 text-slate-500'"
              >
                {{ i === steps.length - 1 ? '&#10003;' : i + 1 }}
              </div>
              <p class="text-xs mt-2">
                {{ step.label }}
              </p>
            </div>
          </template>
        </div>

        <!-- PENDING_PAYMENT: Payment Step -->
        <div
          v-if="booking.status === 'PENDING_PAYMENT'"
          class="bg-white rounded-lg shadow-lg p-8"
        >
          <h2 class="text-2xl font-bold text-[#0A2540] mb-6">
            Complete Payment
          </h2>
          <p class="text-slate-600 mb-6">
            Please complete your consultation fee payment to proceed with scheduling.
          </p>

          <div class="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center mb-6">
            <p class="text-slate-600 font-medium">
              LawPay Payment Integration
            </p>
            <p class="text-sm text-slate-500">
              Payment processing will appear here
            </p>
          </div>
        </div>

        <!-- PENDING_BOOKING: Slot Picker -->
        <div
          v-else-if="booking.status === 'PENDING_BOOKING'"
          class="bg-white rounded-lg shadow-lg p-8"
        >
          <!-- Attorney selection (when no attorney pre-assigned) -->
          <div
            v-if="!resolvedAttorneyId && eligibleAttorneys.length > 0"
            class="mb-6"
          >
            <h2 class="text-2xl font-bold text-[#0A2540] mb-4">
              Who would you like to meet with?
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                v-for="atty in eligibleAttorneys"
                :key="atty.id"
                class="p-4 border-2 rounded-lg text-left transition-all hover:border-[#C41E3A] hover:bg-red-50"
                :class="pickedAttorneyId === atty.id ? 'border-[#C41E3A] bg-red-50' : 'border-slate-200'"
                @click="selectAttorney(atty.id)"
              >
                <div class="font-semibold text-slate-900">
                  {{ atty.name }}
                </div>
                <div
                  v-if="atty.role === 'LAWYER'"
                  class="text-xs text-slate-500"
                >
                  Attorney
                </div>
              </button>
            </div>
          </div>

          <!-- No eligible attorneys found -->
          <div
            v-else-if="!resolvedAttorneyId && eligibleAttorneys.length === 0 && !loadingAttorneys"
            class="text-center py-8"
          >
            <p class="text-slate-600">
              No available attorneys found for this appointment type. Please contact us for assistance.
            </p>
          </div>

          <!-- Slot picker (once attorney is resolved) -->
          <BookingSlotPicker
            v-if="resolvedAttorneyId"
            :attorney-id="resolvedAttorneyId"
            :timezone="booking.timezone"
            :appointment-type-id="booking.appointmentTypeId"
            @select="handleSlotSelect"
          />

          <div
            v-if="selectedSlot"
            class="mt-6 flex justify-end"
          >
            <button
              :disabled="submitting"
              class="px-8 py-3 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50"
              @click="confirmBooking"
            >
              {{ submitting ? 'Confirming...' : 'Confirm Booking' }}
            </button>
          </div>
        </div>

        <!-- BOOKED: Confirmation -->
        <div
          v-else-if="booking.status === 'BOOKED'"
          class="bg-white rounded-lg shadow-lg p-8"
        >
          <BookingConfirmation
            :booking-id="booking.id"
            :start-time="booking.appointment?.startTime || booking.selectedSlotStart"
            :end-time="booking.appointment?.endTime || booking.selectedSlotEnd"
            :email="booking.email"
            :attorney-name="booking.attorneyName"
            :location="booking.appointment?.location"
            :timezone="booking.timezone"
          />
        </div>

        <!-- CANCELLED -->
        <div
          v-else-if="booking.status === 'CANCELLED'"
          class="bg-white rounded-lg shadow-lg p-8 text-center"
        >
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle class="w-8 h-8 text-gray-400" />
          </div>
          <h2 class="text-xl font-bold text-gray-900 mb-2">
            Booking Cancelled
          </h2>
          <p class="text-gray-600">
            This booking has been cancelled.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { AlertCircle, XCircle } from 'lucide-vue-next'

definePageMeta({
  layout: false // Public page, no auth
})

const route = useRoute()
const toast = useToast()

const bookingId = route.params.bookingId as string

const booking = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const selectedSlot = ref<{ startTime: string, endTime: string } | null>(null)
const submitting = ref(false)
const pickedAttorneyId = ref<string | null>(null)

const resolvedAttorneyId = computed(() => booking.value?.attorneyId || pickedAttorneyId.value)
const eligibleAttorneys = computed(() => booking.value?.eligibleAttorneys || [])
const loadingAttorneys = computed(() => loading.value)

function selectAttorney(id: string) {
  pickedAttorneyId.value = id
  selectedSlot.value = null
}

onMounted(async () => {
  try {
    booking.value = await $fetch(`/api/public/booking/${bookingId}`)

    // Auto-select if only one eligible attorney
    if (!booking.value.attorneyId && booking.value.eligibleAttorneys?.length === 1) {
      pickedAttorneyId.value = booking.value.eligibleAttorneys[0].id
    }
  }
  catch (err: any) {
    error.value = err.data?.message || 'Could not load booking details'
  }
  finally {
    loading.value = false
  }
})

function handleSlotSelect(slot: { startTime: string, endTime: string }) {
  selectedSlot.value = slot
}

async function confirmBooking() {
  if (!selectedSlot.value) return
  submitting.value = true

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    await $fetch('/api/public/booking/book-slot', {
      method: 'POST',
      body: {
        bookingId,
        startTime: selectedSlot.value.startTime,
        endTime: selectedSlot.value.endTime,
        timezone: tz
      }
    })

    // Refresh booking to show confirmation
    booking.value = await $fetch(`/api/public/booking/${bookingId}`)
  }
  catch (err: any) {
    toast.error(err.data?.message || 'Failed to confirm booking. Please try again.')
  }
  finally {
    submitting.value = false
  }
}

// Build steps dynamically — only include Payment if the booking requires it
const hasPaymentStep = computed(() => booking.value?.status === 'PENDING_PAYMENT' || (booking.value && !booking.value.consultationFeePaid))

const steps = computed(() => {
  const s = []
  if (hasPaymentStep.value) s.push({ label: 'Payment', status: 'PENDING_PAYMENT' })
  s.push({ label: 'Schedule', status: 'PENDING_BOOKING' })
  s.push({ label: 'Confirmed', status: 'BOOKED' })
  return s
})

const activeStepIndex = computed(() => {
  if (!booking.value) return 0
  const status = booking.value.status
  const idx = steps.value.findIndex(s => s.status === status)
  return idx >= 0 ? idx : steps.value.length - 1
})
</script>
