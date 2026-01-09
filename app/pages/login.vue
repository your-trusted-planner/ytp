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
      <ClientOnly>
        <div class="bg-white shadow-xl rounded-lg p-8">
          <h2 class="text-2xl font-semibold text-navy-900 mb-6">
            Sign In
          </h2>

          <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-600">{{ error }}</p>
          </div>

          <!-- OAuth Providers -->
          <div v-if="oauthProviders.length > 0" class="space-y-3 mb-6">
            <button
              v-for="provider in oauthProviders"
              :key="provider.id"
              type="button"
              class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :style="{ backgroundColor: oauthLoading === provider.providerId ? undefined : 'white' }"
              :disabled="oauthLoading !== null"
              @click="handleOAuthSignIn(provider.providerId)"
            >
              <img
                v-if="provider.logoUrl"
                :src="provider.logoUrl"
                :alt="provider.name"
                class="w-5 h-5 object-contain"
              />
              <span
                v-else
                class="w-5 h-5 rounded-full"
                :style="{ backgroundColor: provider.buttonColor }"
              ></span>
              <span class="text-gray-700 font-medium">
                {{ oauthLoading === provider.providerId ? 'Signing in...' : `Continue with ${provider.name}` }}
              </span>
            </button>
          </div>

          <!-- Divider -->
          <div v-if="oauthProviders.length > 0" class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500">or continue with email</span>
            </div>
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

        <template #fallback>
          <div class="bg-white shadow-xl rounded-lg p-8">
            <div class="animate-pulse space-y-6">
              <div class="h-8 bg-gray-200 rounded w-24"></div>
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

interface OAuthProvider {
  id: string
  providerId: string
  name: string
  logoUrl: string | null
  buttonColor: string
  isEnabled: boolean
  displayOrder: number
}

const router = useRouter()
const route = useRoute()
const { signInWithProvider, handleRedirectResult } = useFirebaseAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)
const oauthProviders = ref<OAuthProvider[]>([])
const oauthLoading = ref<string | null>(null)

// Fetch enabled OAuth providers
async function fetchOAuthProviders() {
  try {
    const response = await $fetch<{ providers: OAuthProvider[] }>('/api/oauth-providers/enabled')
    oauthProviders.value = response.providers || []
  } catch (err) {
    console.log('[Login] No OAuth providers available')
    oauthProviders.value = []
  }
}

// Handle OAuth sign-in
async function handleOAuthSignIn(providerId: string) {
  error.value = ''
  oauthLoading.value = providerId

  try {
    const result = await signInWithProvider(providerId)

    if (result.error) {
      error.value = result.error
      return
    }

    if (result.idToken) {
      // Send token to server for verification and session creation
      await verifyAndCreateSession(result.idToken)
    }
    // If no idToken, it means redirect flow was used - will be handled on page load
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to sign in with provider'
  } finally {
    oauthLoading.value = null
  }
}

// Verify Firebase token and create server session
async function verifyAndCreateSession(idToken: string) {
  try {
    const response = await $fetch('/api/auth/firebase', {
      method: 'POST',
      body: { idToken }
    })

    if (response.success) {
      await router.push('/dashboard')
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to complete sign in'
  }
}

// Check for redirect result on page load
async function checkRedirectResult() {
  try {
    const result = await handleRedirectResult()

    if (result.success && result.idToken) {
      oauthLoading.value = 'redirect'
      await verifyAndCreateSession(result.idToken)
    } else if (result.error) {
      error.value = result.error
    }
  } catch (err) {
    console.log('[Login] No redirect result to process')
  } finally {
    oauthLoading.value = null
  }
}

// Check for session invalidation messages
onMounted(async () => {
  const reason = route.query.reason as string
  if (reason === 'deleted') {
    error.value = 'Your account has been deleted. Please contact support for assistance.'
  } else if (reason === 'disabled') {
    error.value = 'Your account has been disabled. Please contact support for assistance.'
  } else if (reason === 'invalid') {
    error.value = 'Your session has expired. Please sign in again.'
  }

  // Fetch OAuth providers
  await fetchOAuthProviders()

  // Check for redirect result (for redirect auth flow)
  await checkRedirectResult()
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
