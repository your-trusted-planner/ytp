<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header -->
    <div class="bg-[#0A2540] text-white py-6 shadow-lg">
      <div class="max-w-4xl mx-auto px-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">
              E-Signature
            </h1>
            <p class="text-slate-300 mt-1">
              Secure document signing
            </p>
          </div>
          <div class="flex items-center text-sm text-slate-300">
            <svg
              class="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Secure Connection
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Loading Skeleton -->
      <div
        v-if="pending"
        class="bg-white rounded-lg shadow-lg p-8"
      >
        <!-- Step indicator skeleton -->
        <div class="flex items-center justify-center mb-8">
          <div class="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          <div class="w-12 h-0.5 bg-slate-200 animate-pulse" />
          <div class="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          <div class="w-12 h-0.5 bg-slate-200 animate-pulse" />
          <div class="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
        </div>
        <!-- Title skeleton -->
        <div class="h-6 w-2/3 bg-slate-200 rounded animate-pulse mb-3" />
        <div class="h-4 w-1/3 bg-slate-200 rounded animate-pulse mb-6" />
        <!-- Content skeleton -->
        <div class="space-y-3">
          <div class="h-3 w-full bg-slate-100 rounded animate-pulse" />
          <div class="h-3 w-full bg-slate-100 rounded animate-pulse" />
          <div class="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
          <div class="h-3 w-full bg-slate-100 rounded animate-pulse" />
          <div class="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
          <div class="h-3 w-full bg-slate-100 rounded animate-pulse" />
          <div class="h-3 w-4/5 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-white rounded-lg shadow-lg p-8 text-center"
      >
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            class="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-slate-900 mb-2">
          {{ errorTitle }}
        </h2>
        <p class="text-slate-600 mb-6">
          {{ errorMessage }}
        </p>
        <p class="text-sm text-slate-500">
          If you believe this is an error,
          please contact our office:
        </p>
        <p class="text-sm text-slate-600 mt-2 font-medium">
          {{ contactEmail }}
          <span v-if="contactPhone">
            &middot; {{ contactPhone }}
          </span>
        </p>
      </div>

      <!-- Pending Review State (Manual verification submitted) -->
      <div
        v-else-if="pendingReview"
        class="bg-white rounded-lg shadow-lg p-8 text-center"
      >
        <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            class="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-slate-900 mb-2">
          Verification Pending
        </h2>
        <p class="text-slate-600 mb-6">
          Your ID has been submitted for review. You'll receive an email once it's approved and you can proceed with signing.
        </p>
        <p class="text-sm text-slate-500 mt-4">
          <span
            v-if="pollChecking"
            class="inline-flex items-center gap-1"
          >
            <span class="animate-spin w-3 h-3 border border-amber-400 border-t-transparent rounded-full inline-block" />
            Checking status...
          </span>
          <span v-else>
            We'll check automatically &mdash;
            or reload the page.
          </span>
        </p>
      </div>

      <!-- Signing Ceremony (includes identity verification when required) -->
      <SignatureSigningCeremony
        v-else-if="sessionData"
        :document="sessionData.document"
        :signer="sessionData.signer"
        :token="token"
        :requires-identity-verification="sessionData.session?.requiresIdentityVerification"
        :identity-verified="sessionData.session?.identityVerified"
        :verification-mode="sessionData.session?.verificationMode"
        :stored-signature="sessionData.signer?.storedSignature"
        @signed="handleSigned"
        @error="handleError"
        @identity-verified="handleIdentityVerified"
        @pending-review="handlePendingReview"
      />
    </div>

    <!-- Footer -->
    <div class="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
      <p>
        This signing session is secured with end-to-end encryption.
        Your signature will be legally binding under ESIGN and UETA laws.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'

definePageMeta({
  layout: false,
})

const route = useRoute()
const token = computed(
  () => route.params.token as string,
)

const {
  data: sessionData,
  pending,
  error,
  refresh,
} = await useFetch(
  `/api/signature/${token.value}`,
  { key: `signature-session-${token.value}` },
)

// Contact info from runtime config
const config = useRuntimeConfig()
const contactEmail = computed(
  () => (config.public as any).contactEmail
    || 'support@yourtrustedplanner.com',
)
const contactPhone = computed(
  () => (config.public as any).contactPhone
    || '',
)

const errorTitle = computed(() => {
  if (!error.value) return ''
  const code = error.value.statusCode
  if (code === 404) return 'Session Not Found'
  if (code === 410)
    return 'Session Expired or Completed'
  return 'Unable to Load Document'
})

const errorMessage = computed(() => {
  if (!error.value) return ''
  return error.value.data?.message
    || error.value.message
    || 'An unexpected error occurred.'
})

// Pending review state + auto-polling
const pendingReview = ref(false)
const pollChecking = ref(false)

const { pause: pausePoll } = useIntervalFn(
  async () => {
    if (!pendingReview.value) return
    pollChecking.value = true
    try {
      await refresh()
      if (
        sessionData.value
        ?.session?.identityVerified
      ) {
        pendingReview.value = false
        pausePoll()
      }
    }
    catch { /* ignore poll errors */ }
    finally {
      pollChecking.value = false
    }
  },
  15_000,
  { immediate: false },
)

const handleSigned = (certificate: any) => {
  console.log('Signed:', certificate)
}

const handleError = (message: string) => {
  console.error('Signing error:', message)
}

const handleIdentityVerified = (
  data: { method: string, verifiedAt: string },
) => {
  console.log('Identity verified:', data)
}

const handlePendingReview = () => {
  pendingReview.value = true
}
</script>
