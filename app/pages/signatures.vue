<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">E-Signatures</h1>
        <p class="text-gray-600 mt-1">Track and manage document signature requests</p>
      </div>
    </div>

    <!-- Status Summary Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        @click="filterByStatus('PENDING,IDENTITY_REQUIRED')"
        class="bg-white rounded-lg border p-4 cursor-pointer transition-all"
        :class="currentFilter === 'PENDING,IDENTITY_REQUIRED' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Pending</p>
            <p class="text-2xl font-bold text-amber-600">{{ counts.pending + counts.identityRequired }}</p>
          </div>
          <Clock class="w-8 h-8 text-amber-400" />
        </div>
      </div>

      <div
        @click="filterByStatus('SIGNED')"
        class="bg-white rounded-lg border p-4 cursor-pointer transition-all"
        :class="currentFilter === 'SIGNED' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300'"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Signed</p>
            <p class="text-2xl font-bold text-green-600">{{ counts.signed }}</p>
          </div>
          <CheckCircle class="w-8 h-8 text-green-400" />
        </div>
      </div>

      <div
        @click="filterByStatus('EXPIRED')"
        class="bg-white rounded-lg border p-4 cursor-pointer transition-all"
        :class="currentFilter === 'EXPIRED' ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200 hover:border-gray-300'"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Expired</p>
            <p class="text-2xl font-bold text-red-600">{{ counts.expired }}</p>
          </div>
          <AlertCircle class="w-8 h-8 text-red-400" />
        </div>
      </div>

      <div
        @click="filterByStatus('')"
        class="bg-white rounded-lg border p-4 cursor-pointer transition-all"
        :class="currentFilter === '' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">All</p>
            <p class="text-2xl font-bold text-gray-700">{{ totalCount }}</p>
          </div>
          <FileSignature class="w-8 h-8 text-gray-400" />
        </div>
      </div>
    </div>

    <!-- Sessions Table -->
    <UiCard>
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p class="text-gray-500 mt-4">Loading signature sessions...</p>
      </div>

      <div v-else-if="sessions.length === 0" class="text-center py-12">
        <FileSignature class="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p class="text-gray-500">No signature sessions found</p>
        <p class="text-sm text-gray-400 mt-1">
          {{ currentFilter ? 'Try a different filter or ' : '' }}
          <NuxtLink to="/documents" class="text-accent-600 hover:underline">send a document for signature</NuxtLink>
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="session in sessions" :key="session.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <NuxtLink
                  :to="`/documents/${session.documentId}`"
                  class="text-sm font-medium text-gray-900 hover:text-accent-600"
                >
                  {{ session.documentTitle || 'Untitled Document' }}
                </NuxtLink>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">{{ session.signerName }}</div>
                <div class="text-xs text-gray-500">{{ session.signerEmail }}</div>
              </td>
              <td class="px-6 py-4">
                <UiBadge :variant="session.signatureTier === 'ENHANCED' ? 'warning' : 'default'">
                  {{ session.signatureTier }}
                </UiBadge>
              </td>
              <td class="px-6 py-4">
                <UiBadge :variant="getStatusVariant(session.status)">
                  {{ formatStatus(session.status) }}
                </UiBadge>
              </td>
              <td class="px-6 py-4">
                <div v-if="session.status === 'SIGNED'" class="text-sm text-gray-500">
                  Signed {{ formatDate(session.signedAt) }}
                </div>
                <div v-else-if="session.isExpired" class="text-sm text-red-600">
                  Expired {{ formatDate(session.tokenExpiresAt) }}
                </div>
                <div v-else class="text-sm text-gray-500">
                  {{ formatDate(session.tokenExpiresAt) }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <!-- Copy Link -->
                  <button
                    v-if="session.status !== 'SIGNED' && session.status !== 'REVOKED'"
                    @click="copySigningLink(session)"
                    class="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                    title="Copy signing link"
                  >
                    <Copy class="w-4 h-4" />
                  </button>

                  <!-- Resend Email -->
                  <button
                    v-if="canResend(session)"
                    @click="openResendModal(session)"
                    class="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    title="Send reminder email"
                  >
                    <Mail class="w-4 h-4" />
                  </button>

                  <!-- Revoke -->
                  <button
                    v-if="canRevoke(session)"
                    @click="confirmRevoke(session)"
                    class="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                    title="Revoke signing link"
                  >
                    <XCircle class="w-4 h-4" />
                  </button>

                  <!-- View Document -->
                  <NuxtLink
                    :to="`/documents/${session.documentId}`"
                    class="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                    title="View document"
                  >
                    <ExternalLink class="w-4 h-4" />
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <!-- Resend Modal -->
    <UiModal v-model="showResendModal" title="Send Reminder" size="md">
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Send a reminder email to <strong>{{ selectedSession?.signerName }}</strong> for document
          <strong>{{ selectedSession?.documentTitle }}</strong>.
        </p>

        <label class="flex items-center">
          <input
            type="checkbox"
            v-model="resendOptions.extendExpiration"
            class="rounded border-gray-300 text-accent-600 focus:ring-accent-500"
          />
          <span class="ml-2 text-sm text-gray-700">Extend expiration by 48 hours</span>
        </label>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Custom Message (optional)</label>
          <textarea
            v-model="resendOptions.message"
            rows="3"
            placeholder="Add a personal message to include in the reminder..."
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 text-sm"
          ></textarea>
        </div>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="showResendModal = false">
          Cancel
        </UiButton>
        <UiButton @click="sendReminder" :is-loading="resending">
          Send Reminder
        </UiButton>
      </template>
    </UiModal>

    <!-- Revoke Confirmation Modal -->
    <UiModal v-model="showRevokeModal" title="Revoke Signing Link" size="sm">
      <div class="space-y-4">
        <div class="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <AlertTriangle class="w-6 h-6 text-red-600" />
        </div>
        <p class="text-center text-gray-600">
          Are you sure you want to revoke the signing link for <strong>{{ selectedSession?.documentTitle }}</strong>?
        </p>
        <p class="text-center text-sm text-gray-500">
          The signer will no longer be able to use this link. You can create a new signing session later if needed.
        </p>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="showRevokeModal = false">
          Cancel
        </UiButton>
        <UiButton variant="danger" @click="revokeSession" :is-loading="revoking">
          Revoke Link
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import {
  Clock,
  CheckCircle,
  AlertCircle,
  FileSignature,
  Copy,
  Mail,
  XCircle,
  ExternalLink,
  AlertTriangle
} from 'lucide-vue-next'

const toast = useToast()

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

interface SignatureSession {
  id: string
  documentId: string
  documentTitle: string
  signerId: string
  signerName: string
  signerEmail: string
  signatureTier: 'STANDARD' | 'ENHANCED'
  status: string
  signingToken: string
  tokenExpiresAt: string
  signedAt: string | null
  isExpired: boolean
  createdAt: string
}

const loading = ref(true)
const sessions = ref<SignatureSession[]>([])
const counts = ref({ pending: 0, identityRequired: 0, signed: 0, expired: 0, revoked: 0 })
const currentFilter = ref('')

// Resend modal
const showResendModal = ref(false)
const selectedSession = ref<SignatureSession | null>(null)
const resending = ref(false)
const resendOptions = ref({
  extendExpiration: true,
  message: ''
})

// Revoke modal
const showRevokeModal = ref(false)
const revoking = ref(false)

const totalCount = computed(() => {
  return counts.value.pending + counts.value.identityRequired + counts.value.signed + counts.value.expired + counts.value.revoked
})

const fetchSessions = async (status?: string) => {
  loading.value = true
  try {
    const query = status ? `?status=${status}` : ''
    const response = await $fetch<{
      sessions: SignatureSession[]
      counts: typeof counts.value
    }>(`/api/signature-sessions${query}`)

    sessions.value = response.sessions
    counts.value = response.counts
  } catch (error) {
    console.error('Failed to fetch signature sessions:', error)
  } finally {
    loading.value = false
  }
}

const filterByStatus = (status: string) => {
  currentFilter.value = status
  fetchSessions(status)
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'SIGNED': return 'success'
    case 'PENDING': return 'warning'
    case 'IDENTITY_REQUIRED': return 'warning'
    case 'EXPIRED': return 'danger'
    case 'REVOKED': return 'default'
    default: return 'default'
  }
}

const formatStatus = (status: string) => {
  switch (status) {
    case 'IDENTITY_REQUIRED': return 'Identity Required'
    default: return status.charAt(0) + status.slice(1).toLowerCase()
  }
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const canResend = (session: SignatureSession) => {
  return ['PENDING', 'IDENTITY_REQUIRED', 'EXPIRED'].includes(session.status)
}

const canRevoke = (session: SignatureSession) => {
  return ['PENDING', 'IDENTITY_REQUIRED'].includes(session.status) && !session.isExpired
}

const copySigningLink = async (session: SignatureSession) => {
  const baseUrl = window.location.origin
  const link = `${baseUrl}/sign/${session.signingToken}`
  try {
    await navigator.clipboard.writeText(link)
    toast.success('Signing link copied to clipboard')
  } catch (err) {
    // Fallback
    prompt('Copy this link:', link)
  }
}

const openResendModal = (session: SignatureSession) => {
  selectedSession.value = session
  resendOptions.value = {
    extendExpiration: true,
    message: ''
  }
  showResendModal.value = true
}

const sendReminder = async () => {
  if (!selectedSession.value) return

  resending.value = true
  try {
    await $fetch(`/api/signature-sessions/${selectedSession.value.id}/resend`, {
      method: 'POST',
      body: resendOptions.value
    })

    showResendModal.value = false
    await fetchSessions(currentFilter.value)
    toast.success('Reminder sent successfully')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to send reminder')
  } finally {
    resending.value = false
  }
}

const confirmRevoke = (session: SignatureSession) => {
  selectedSession.value = session
  showRevokeModal.value = true
}

const revokeSession = async () => {
  if (!selectedSession.value) return

  revoking.value = true
  try {
    await $fetch(`/api/signature-sessions/${selectedSession.value.id}/revoke`, {
      method: 'POST'
    })

    showRevokeModal.value = false
    await fetchSessions(currentFilter.value)
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to revoke session')
  } finally {
    revoking.value = false
  }
}

onMounted(() => {
  fetchSessions()
})
</script>
