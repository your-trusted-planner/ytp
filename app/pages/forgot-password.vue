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
        <p class="text-gray-300 mt-2 text-lg">Password Reset</p>
      </div>

      <ClientOnly>
        <div class="bg-white shadow-xl rounded-lg p-8">
          <!-- Success State -->
          <div v-if="emailSent" class="text-center">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="text-2xl font-semibold text-navy-900 mb-4">Check Your Email</h2>
            <p class="text-gray-600 mb-6">
              If an account exists for <strong>{{ submittedEmail }}</strong>, you will receive a password reset link shortly.
            </p>
            <p class="text-sm text-gray-500 mb-6">
              The link will expire in 1 hour. If you don't see the email, check your spam folder.
            </p>
            <NuxtLink
              to="/login"
              class="inline-flex items-center text-accent-500 hover:text-accent-600 font-medium"
            >
              <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </NuxtLink>
          </div>

          <!-- Form State -->
          <div v-else>
            <h2 class="text-2xl font-semibold text-navy-900 mb-2">Forgot Password?</h2>
            <p class="text-gray-600 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-6">
              <UiInput
                v-model="email"
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                required
                autocomplete="email"
              />

              <UiButton
                type="submit"
                class="w-full"
                size="lg"
                :is-loading="isLoading"
              >
                Send Reset Link
              </UiButton>
            </form>

            <div class="mt-6 text-center">
              <NuxtLink
                to="/login"
                class="text-sm text-accent-500 hover:text-accent-600 font-medium"
              >
                Back to Login
              </NuxtLink>
            </div>
          </div>
        </div>

        <template #fallback>
          <div class="bg-white shadow-xl rounded-lg p-8">
            <div class="animate-pulse space-y-6">
              <div class="h-8 bg-gray-200 rounded w-48"></div>
              <div class="h-4 bg-gray-200 rounded w-full"></div>
              <div class="space-y-4">
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
import { ref } from 'vue'

definePageMeta({
  layout: false
})

const email = ref('')
const submittedEmail = ref('')
const error = ref('')
const isLoading = ref(false)
const emailSent = ref(false)

const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true

  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        email: email.value
      }
    })

    submittedEmail.value = email.value
    emailSent.value = true
  } catch (err: any) {
    error.value = err.data?.message || 'An error occurred. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>
