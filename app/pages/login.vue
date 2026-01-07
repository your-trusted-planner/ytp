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
        <p class="text-gray-300 mt-2 text-lg">Client Portal</p>
      </div>

      <!-- Login Form -->
      <div class="bg-white shadow-xl rounded-lg p-8">
        <h2 class="text-2xl font-semibold text-navy-900 mb-6">
          Sign In
        </h2>

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

          <UiInput
            v-model="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />

          <UiButton
            type="submit"
            class="w-full"
            size="lg"
            :is-loading="isLoading"
          >
            Sign In
          </UiButton>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Don't have an account?
            <a
              href="https://yourtrustedplanner.com/contact"
              class="text-accent-500 hover:text-accent-600 font-medium"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>

      <div class="mt-6 text-center text-sm text-gray-300">
        <p>© 2025 Meuli Law Office, PC. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: false
})

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

// Check for session invalidation messages
onMounted(() => {
  const reason = route.query.reason as string
  if (reason === 'deleted') {
    error.value = 'Your account has been deleted. Please contact support for assistance.'
  } else if (reason === 'disabled') {
    error.value = 'Your account has been disabled. Please contact support for assistance.'
  } else if (reason === 'invalid') {
    error.value = 'Your session has expired. Please sign in again.'
  }
})

const handleSubmit = async () => {
  error.value = ''
  isLoading.value = true

  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    })

    if (response.user) {
      await router.push('/dashboard')
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Invalid email or password'
  } finally {
    isLoading.value = false
  }
}
</script>

