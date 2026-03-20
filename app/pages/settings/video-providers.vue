<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        Video Meeting Providers
      </h1>
      <p class="text-gray-600 mt-1">
        Configure video meeting integrations for appointments
      </p>
    </div>

    <ClientOnly>
      <div>
        <!-- Loading -->
        <div
          v-if="loading"
          class="text-center py-12 text-gray-500"
        >
          Loading providers...
        </div>

        <!-- Providers List -->
        <div
          v-else
          class="space-y-4"
        >
          <!-- Zoom -->
          <UiCard>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div
                  class="w-12 h-12 rounded-lg flex items-center justify-center"
                  :class="zoomProvider?.configured ? 'bg-green-100' : 'bg-gray-100'"
                >
                  <Video
                    class="w-6 h-6"
                    :class="zoomProvider?.configured ? 'text-green-600' : 'text-gray-400'"
                  />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">
                    Zoom
                  </h3>
                  <p class="text-sm text-gray-500">
                    Create Zoom meetings automatically when scheduling appointments
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UiBadge
                  v-if="zoomProvider?.status === 'CONNECTED'"
                  variant="success"
                >
                  Connected
                </UiBadge>
                <UiBadge
                  v-else-if="zoomProvider?.configured"
                  variant="info"
                >
                  Configured
                </UiBadge>
                <UiBadge
                  v-else
                  variant="default"
                >
                  Not Configured
                </UiBadge>
                <UiButton
                  v-if="!showZoomForm"
                  variant="outline"
                  size="sm"
                  @click="showZoomForm = true"
                >
                  {{ zoomProvider?.configured ? 'Update' : 'Configure' }}
                </UiButton>
              </div>
            </div>

            <!-- Zoom Configuration Form -->
            <div
              v-if="showZoomForm"
              class="mt-4 border-t border-gray-200 pt-4 space-y-4"
            >
              <p class="text-sm text-gray-600">
                Enter your Zoom OAuth app credentials. These are encrypted and stored securely.
                Create a Zoom OAuth app at
                <a
                  href="https://marketplace.zoom.us"
                  target="_blank"
                  rel="noopener"
                  class="text-accent-600 underline"
                >marketplace.zoom.us</a>.
              </p>

              <UiInput
                v-model="zoomForm.clientId"
                label="Client ID"
                placeholder="Your Zoom OAuth Client ID"
                required
              />
              <UiInput
                v-model="zoomForm.clientSecret"
                label="Client Secret"
                type="password"
                placeholder="Your Zoom OAuth Client Secret"
                required
              />
              <UiInput
                v-model="zoomForm.redirectUri"
                label="Redirect URI"
                :placeholder="defaultRedirectUri"
                required
              />
              <p class="text-xs text-gray-400 -mt-2">
                Set this same URI in your Zoom app's OAuth redirect settings.
              </p>

              <div class="flex items-center gap-2">
                <UiButton
                  :is-loading="savingZoom"
                  @click="saveZoomConfig"
                >
                  Save Credentials
                </UiButton>
                <UiButton
                  v-if="zoomProvider?.configured"
                  variant="outline"
                  :is-loading="testingZoom"
                  @click="testZoom"
                >
                  Test Connection
                </UiButton>
                <UiButton
                  variant="outline"
                  @click="showZoomForm = false"
                >
                  Cancel
                </UiButton>
              </div>
            </div>

            <!-- Status info when not editing -->
            <div
              v-else-if="zoomProvider?.configured"
              class="mt-4 border-t border-gray-200 pt-4"
            >
              <p class="text-sm text-gray-600">
                Zoom integration is active. Staff members can connect their individual Zoom accounts from their
                <NuxtLink
                  to="/profile"
                  class="text-accent-600 underline"
                >Profile page</NuxtLink>.
              </p>
              <p
                v-if="zoomProvider?.lastTestedAt"
                class="text-xs text-gray-400 mt-2"
              >
                Last tested: {{ new Date(zoomProvider.lastTestedAt).toLocaleDateString() }}
                <span
                  v-if="zoomProvider.lastErrorMessage"
                  class="text-red-500 ml-1"
                >
                  ({{ zoomProvider.lastErrorMessage }})
                </span>
              </p>
            </div>
          </UiCard>

          <!-- Google Meet (coming soon) -->
          <UiCard>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Video class="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">
                    Google Meet
                  </h3>
                  <p class="text-sm text-gray-500">
                    Google Meet integration (coming soon)
                  </p>
                </div>
              </div>
              <UiBadge variant="default">
                Coming Soon
              </UiBadge>
            </div>
          </UiCard>
        </div>
      </div>
    </ClientOnly>

    <!-- Info -->
    <UiCard>
      <div class="flex items-start space-x-3">
        <Info class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div class="text-sm text-gray-600">
          <p>
            Video meeting providers allow automatic meeting creation when scheduling appointments.
            Each staff member connects their own account via their
            <NuxtLink
              to="/profile"
              class="text-accent-600 underline"
            >Profile page</NuxtLink>
            to act as the meeting host. Credentials are encrypted at rest using AES-256-GCM.
          </p>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Video, Info } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const toast = useToast()

interface VideoProvider {
  id: string
  name: string
  configured: boolean
  status: string | null
  lastTestedAt: string | null
  lastErrorMessage: string | null
  description: string
}

const loading = ref(true)
const providers = ref<VideoProvider[]>([])
const showZoomForm = ref(false)
const savingZoom = ref(false)
const testingZoom = ref(false)

const zoomForm = ref({
  clientId: '',
  clientSecret: '',
  redirectUri: ''
})

const zoomProvider = computed(() => providers.value.find(p => p.id === 'zoom'))

const defaultRedirectUri = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/api/auth/zoom/callback`
})

async function fetchProviders() {
  loading.value = true
  try {
    providers.value = await $fetch('/api/admin/video-providers')
  }
  catch {
    providers.value = []
  }
  finally {
    loading.value = false
  }
}

async function saveZoomConfig() {
  if (!zoomForm.value.clientId || !zoomForm.value.clientSecret || !zoomForm.value.redirectUri) {
    toast.error('All fields are required')
    return
  }
  savingZoom.value = true
  try {
    await $fetch('/api/admin/video-providers/zoom', {
      method: 'PUT',
      body: zoomForm.value
    })
    toast.success('Zoom credentials saved (encrypted)')
    showZoomForm.value = false
    zoomForm.value = { clientId: '', clientSecret: '', redirectUri: '' }
    await fetchProviders()
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Failed to save Zoom credentials')
  }
  finally {
    savingZoom.value = false
  }
}

async function testZoom() {
  testingZoom.value = true
  try {
    const result = await $fetch<{ message: string }>('/api/admin/video-providers/zoom-test', {
      method: 'POST'
    })
    toast.success(result.message)
    await fetchProviders()
  }
  catch (error: any) {
    toast.error(error.data?.message || 'Zoom test failed')
    await fetchProviders()
  }
  finally {
    testingZoom.value = false
  }
}

onMounted(() => {
  fetchProviders()
  // Pre-fill redirect URI
  if (typeof window !== 'undefined') {
    zoomForm.value.redirectUri = `${window.location.origin}/api/auth/zoom/callback`
  }
})
</script>
