<template>
  <div class="min-h-screen flex items-center justify-center bg-navy-900 px-4">
    <div class="max-w-md w-full">
      <!-- Logo and Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center mb-6 bg-white rounded-lg p-6">
          <img
            src="/ytp-logo.webp"
            alt="Your Trusted Planner"
            class="h-16 w-auto"
          />
        </div>
        <p class="text-gray-300 mt-2 text-lg">Reset Password</p>
      </div>

      <ClientOnly>
        <div class="bg-white shadow-xl rounded-lg p-8">
          <!-- Loading State -->
          <div v-if="isValidating" class="text-center py-8">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-accent-500 mx-auto mb-4"></div>
            <p class="text-gray-600">Validating reset link...</p>
          </div>

          <!-- Invalid Token State -->
          <div v-else-if="tokenError" class="text-center">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 class="text-2xl font-semibold text-navy-900 mb-4">Invalid Reset Link</h2>
            <p class="text-gray-600 mb-6">{{ tokenError }}</p>
            <NuxtLink
              to="/forgot-password"
              class="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent-500 hover:bg-accent-600"
            >
              Request New Reset Link
            </NuxtLink>
            <div class="mt-4">
              <NuxtLink
                to="/login"
                class="text-sm text-gray-500 hover:text-gray-700"
              >
                Back to Login
              </NuxtLink>
            </div>
          </div>

          <!-- Success State -->
          <div v-else-if="resetSuccess" class="text-center">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="text-2xl font-semibold text-navy-900 mb-4">Password Reset Complete</h2>
            <p class="text-gray-600 mb-6">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <NuxtLink
              to="/login"
              class="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent-500 hover:bg-accent-600"
            >
              Go to Login
            </NuxtLink>
          </div>

          <!-- Reset Form -->
          <div v-else>
            <h2 class="text-2xl font-semibold text-navy-900 mb-2">Set New Password</h2>
            <p v-if="maskedEmail" class="text-gray-600 mb-6">
              Enter a new password for <strong>{{ maskedEmail }}</strong>
            </p>
            <p v-else class="text-gray-600 mb-6">
              Enter your new password below.
            </p>

            <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-6">
              <UiInput
                v-model="password"
                label="New Password"
                type="password"
                placeholder="Enter new password"
                required
                autocomplete="new-password"
              />

              <UiInput
                v-model="confirmPassword"
                label="Confirm Password"
                type="password"
                placeholder="Confirm new password"
                required
                autocomplete="new-password"
              />

              <div v-if="password.length > 0" class="text-sm">
                <p :class="password.length >= 8 ? 'text-green-600' : 'text-gray-500'">
                  <span v-if="password.length >= 8">&#10003;</span>
                  <span v-else>&#9679;</span>
                  At least 8 characters
                </p>
                <p :class="password === confirmPassword && confirmPassword.length > 0 ? 'text-green-600' : 'text-gray-500'">
                  <span v-if="password === confirmPassword && confirmPassword.length > 0">&#10003;</span>
                  <span v-else>&#9679;</span>
                  Passwords match
                </p>
              </div>

              <UiButton
                type="submit"
                class="w-full"
                size="lg"
                :is-loading="isLoading"
                :disabled="!isFormValid"
              >
                Reset Password
              </UiButton>
            </form>
          </div>
        </div>

        <template #fallback>
          <div class="bg-white shadow-xl rounded-lg p-8">
            <div class="animate-pulse space-y-6">
              <div class="h-8 bg-gray-200 rounded w-48"></div>
              <div class="h-4 bg-gray-200 rounded w-full"></div>
              <div class="space-y-4">
                <div class="h-10 bg-gray-200 rounded"></div>
                <div class="h-10 bg-gray-200 rounded"></div>
                <div class="h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </template>
      </ClientOnly>

      <div class="mt-6 text-center text-sm text-gray-300">
        <p>&copy; 2025 Meuli Law Office, PC. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: false
})

const route = useRoute()
const router = useRouter()

const token = computed(() => route.query.token as string)
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const isLoading = ref(false)
const isValidating = ref(true)
const tokenError = ref('')
const maskedEmail = ref('')
const resetSuccess = ref(false)

const isFormValid = computed(() => {
  return password.value.length >= 8 && password.value === confirmPassword.value
})

// Validate token on mount
onMounted(async () => {
  if (!token.value) {
    tokenError.value = 'No reset token provided. Please use the link from your email.'
    isValidating.value = false
    return
  }

  try {
    const response = await $fetch<{ valid: boolean; email?: string; error?: string }>(
      `/api/auth/verify-reset-token?token=${token.value}`
    )

    if (!response.valid) {
      tokenError.value = response.error || 'This reset link is invalid or has expired.'
    } else {
      maskedEmail.value = response.email || ''
    }
  } catch (err: any) {
    tokenError.value = 'Failed to validate reset link. Please try again.'
  } finally {
    isValidating.value = false
  }
})

const handleSubmit = async () => {
  if (!isFormValid.value) {
    return
  }

  error.value = ''
  isLoading.value = true

  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: token.value,
        password: password.value
      }
    })

    resetSuccess.value = true
  } catch (err: any) {
    error.value = err.data?.message || 'An error occurred. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>
