<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8 sm:py-16">
    <div class="w-full max-w-lg">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
          style="background-color: #0A2540;">
          <Mail class="w-6 h-6 text-white" />
        </div>
        <h1 class="text-2xl font-bold" style="color: #0A2540;">Communication Preferences</h1>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="bg-white rounded-lg shadow-sm p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style="border-color: #C41E3A;" />
        <p class="text-gray-500 mt-4">Loading your preferences...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-white rounded-lg shadow-sm p-8 text-center">
        <AlertCircle class="w-12 h-12 text-red-400 mx-auto" />
        <h2 class="text-lg font-medium text-gray-900 mt-4">Unable to load preferences</h2>
        <p class="text-gray-500 mt-2">This link may have expired or is invalid. Please contact us for assistance.</p>
      </div>

      <!-- Preferences form -->
      <template v-else-if="data">
        <!-- Greeting -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
          <p class="text-gray-700">
            Hi <strong>{{ data.firstName }}</strong>,
          </p>
          <p class="text-gray-500 text-sm mt-1">
            Manage your communication preferences below. Changes are saved automatically.
          </p>
        </div>

        <!-- Global unsubscribe -->
        <div v-if="data.consent.globalUnsubscribe" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div class="flex items-center gap-2">
            <ShieldOff class="w-5 h-5 text-red-500 flex-shrink-0" />
            <p class="text-sm text-red-700 font-medium">You are unsubscribed from all marketing communications.</p>
          </div>
        </div>

        <!-- Channel toggles -->
        <div class="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
          <div v-for="ch in data.consent.consents" :key="ch.channelId"
            class="p-4 flex items-center justify-between gap-4">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <component :is="ch.channelType === 'EMAIL' ? Mail : MessageSquare"
                  class="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span class="font-medium text-sm text-gray-900">{{ ch.channelName }}</span>
              </div>
              <p v-if="ch.channelDescription" class="text-xs text-gray-500 mt-1 ml-6">{{ ch.channelDescription }}</p>
            </div>
            <button
              @click="toggleChannel(ch)"
              :disabled="data.consent.globalUnsubscribe || togglingChannel === ch.channelId"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="ch.status === 'OPTED_IN' ? 'bg-[#C41E3A]' : 'bg-gray-200'"
              :style="ch.status === 'OPTED_IN' ? { 'focus-ring-color': '#C41E3A' } : {}"
              role="switch"
              :aria-checked="ch.status === 'OPTED_IN'"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="ch.status === 'OPTED_IN' ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <div v-if="data.consent.consents.length === 0" class="p-6 text-center text-gray-500 text-sm">
            No communication channels are currently configured.
          </div>
        </div>

        <!-- Global unsubscribe button -->
        <div v-if="!data.consent.globalUnsubscribe" class="mt-6 text-center">
          <button
            @click="showUnsubscribeConfirm = true"
            class="text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
          >
            Unsubscribe from all communications
          </button>
        </div>

        <!-- Success toast -->
        <div v-if="savedMessage"
          class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg transition-opacity"
        >
          {{ savedMessage }}
        </div>
      </template>
    </div>

    <!-- Unsubscribe confirmation -->
    <Teleport to="body">
      <div v-if="showUnsubscribeConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50" @click="showUnsubscribeConfirm = false" />
        <div class="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
          <h3 class="text-lg font-medium text-gray-900">Unsubscribe from all?</h3>
          <p class="text-sm text-gray-500 mt-2">
            You will no longer receive any marketing communications from us.
          </p>
          <div class="mt-6 flex justify-end gap-3">
            <button
              @click="showUnsubscribeConfirm = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="handleGlobalUnsubscribe"
              :disabled="globalUnsubscribing"
              class="px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50"
              style="background-color: #C41E3A;"
            >
              {{ globalUnsubscribing ? 'Unsubscribing...' : 'Unsubscribe All' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Footer -->
    <div class="mt-12 text-center text-xs text-gray-400">
      <p>&copy; {{ new Date().getFullYear() }} Trust & Legacy Planning</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Mail, MessageSquare, AlertCircle, ShieldOff } from 'lucide-vue-next'

definePageMeta({
  layout: false,
  auth: false
})

interface ChannelConsent {
  channelId: string
  channelName: string
  channelType: string
  channelSlug: string
  channelDescription: string | null
  status: string
}

interface PreferencesData {
  firstName: string
  lastName: string
  consent: {
    globalUnsubscribe: boolean
    globalUnsubscribeAt: string | null
    globalUnsubscribeSource: string | null
    consents: ChannelConsent[]
  }
}

const route = useRoute()
const token = route.params.token as string

const loading = ref(true)
const error = ref(false)
const data = ref<PreferencesData | null>(null)
const togglingChannel = ref<string | null>(null)
const showUnsubscribeConfirm = ref(false)
const globalUnsubscribing = ref(false)
const savedMessage = ref('')
let savedTimeout: ReturnType<typeof setTimeout> | null = null

async function fetchPreferences() {
  loading.value = true
  error.value = false
  try {
    data.value = await $fetch<PreferencesData>(`/api/public/marketing/preferences/${token}`)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function showSaved(msg: string) {
  savedMessage.value = msg
  if (savedTimeout) clearTimeout(savedTimeout)
  savedTimeout = setTimeout(() => { savedMessage.value = '' }, 2000)
}

async function toggleChannel(ch: ChannelConsent) {
  togglingChannel.value = ch.channelId
  const newStatus = ch.status === 'OPTED_IN' ? 'OPTED_OUT' : 'OPTED_IN'
  try {
    await $fetch(`/api/public/marketing/preferences/${token}`, {
      method: 'PUT',
      body: { channelId: ch.channelId, status: newStatus }
    })
    ch.status = newStatus
    showSaved(newStatus === 'OPTED_IN' ? 'Subscribed' : 'Unsubscribed')
  } catch {
    showSaved('Failed to update')
  } finally {
    togglingChannel.value = null
  }
}

async function handleGlobalUnsubscribe() {
  globalUnsubscribing.value = true
  try {
    await $fetch(`/api/public/marketing/unsubscribe/${token}`, { method: 'POST' })
    showUnsubscribeConfirm.value = false
    await fetchPreferences()
    showSaved('Unsubscribed from all')
  } catch {
    showSaved('Failed to unsubscribe')
  } finally {
    globalUnsubscribing.value = false
  }
}

onMounted(() => {
  fetchPreferences()
})
</script>
