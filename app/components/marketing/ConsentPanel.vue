<template>
  <div class="space-y-4">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-6">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-burgundy-600" />
    </div>

    <template v-else-if="consent">
      <!-- Global Unsubscribe -->
      <UiCard>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-medium text-gray-900">Global Unsubscribe</h3>
            <p class="text-sm text-gray-500">
              {{ consent.globalUnsubscribe
                ? 'This person is globally unsubscribed from all marketing communications.'
                : 'This person may receive marketing communications on opted-in channels.' }}
            </p>
            <p v-if="consent.globalUnsubscribe && consent.globalUnsubscribeSource" class="text-xs text-gray-400 mt-1">
              Source: {{ consent.globalUnsubscribeSource }}
              <span v-if="consent.globalUnsubscribeAt"> &middot; {{ formatDate(consent.globalUnsubscribeAt) }}</span>
            </p>
          </div>
          <UiButton
            v-if="!consent.globalUnsubscribe"
            variant="danger"
            size="sm"
            @click="confirmGlobalUnsubscribe"
            :is-loading="unsubscribing"
          >
            Unsubscribe All
          </UiButton>
          <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Unsubscribed
          </span>
        </div>
      </UiCard>

      <!-- Per-channel consents -->
      <UiCard v-if="consent.consents.length > 0" title="Channel Preferences">
        <div class="divide-y divide-gray-200">
          <div v-for="ch in consent.consents" :key="ch.channelId" class="py-3 flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm text-gray-900">{{ ch.channelName }}</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  :class="ch.channelType === 'EMAIL' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'">
                  {{ ch.channelType }}
                </span>
              </div>
              <p v-if="ch.channelDescription" class="text-xs text-gray-500 mt-0.5">{{ ch.channelDescription }}</p>
            </div>
            <UiToggle
              :model-value="ch.status === 'OPTED_IN'"
              :disabled="consent.globalUnsubscribe"
              @update:model-value="toggleChannel(ch)"
            />
          </div>
        </div>
      </UiCard>

      <p v-else class="text-sm text-gray-500 text-center py-4">
        No marketing channels configured yet.
      </p>
    </template>

    <!-- Global unsubscribe confirmation modal -->
    <UiModal v-model="showConfirmModal" title="Confirm Global Unsubscribe" size="sm">
      <p class="text-sm text-gray-600">
        This will unsubscribe this person from <strong>all</strong> marketing communications.
        This action cannot be easily undone.
      </p>
      <template #footer>
        <UiButton variant="outline" @click="showConfirmModal = false">Cancel</UiButton>
        <UiButton variant="danger" @click="handleGlobalUnsubscribe" :is-loading="unsubscribing">
          Unsubscribe All
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
interface ChannelConsent {
  channelId: string
  channelName: string
  channelType: string
  channelSlug: string
  channelDescription: string | null
  status: string
  consentAt: string | null
  consentSource: string | null
}

interface PersonConsent {
  globalUnsubscribe: boolean
  globalUnsubscribeAt: string | null
  globalUnsubscribeSource: string | null
  consents: ChannelConsent[]
}

const props = defineProps<{
  personId: string
}>()

const toast = useToast()
const loading = ref(true)
const consent = ref<PersonConsent | null>(null)
const showConfirmModal = ref(false)
const unsubscribing = ref(false)

async function fetchConsent() {
  loading.value = true
  try {
    const data = await $fetch<{ consent: PersonConsent }>(`/api/admin/marketing/consent/${props.personId}`)
    consent.value = data.consent
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to load consent data')
  } finally {
    loading.value = false
  }
}

async function toggleChannel(ch: ChannelConsent) {
  const newStatus = ch.status === 'OPTED_IN' ? 'OPTED_OUT' : 'OPTED_IN'
  try {
    await $fetch(`/api/admin/marketing/consent/${props.personId}/${ch.channelId}`, {
      method: 'PUT',
      body: { status: newStatus }
    })
    ch.status = newStatus
    toast.success(`${ch.channelName}: ${newStatus === 'OPTED_IN' ? 'opted in' : 'opted out'}`)
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to update consent')
  }
}

function confirmGlobalUnsubscribe() {
  showConfirmModal.value = true
}

async function handleGlobalUnsubscribe() {
  unsubscribing.value = true
  try {
    await $fetch(`/api/admin/marketing/consent/${props.personId}/global-unsubscribe`, {
      method: 'POST'
    })
    showConfirmModal.value = false
    toast.success('Global unsubscribe applied')
    await fetchConsent()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to unsubscribe')
  } finally {
    unsubscribing.value = false
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

watch(() => props.personId, () => {
  if (props.personId) fetchConsent()
}, { immediate: true })
</script>
