<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        Zoom Phone SMS
      </h1>
      <p class="text-gray-600 mt-1">
        Send SMS messages to clients via your Zoom Phone account
      </p>
    </div>

    <ClientOnly>
      <div>
        <div
          v-if="loading"
          class="text-center py-12 text-gray-500"
        >
          Loading configuration...
        </div>

        <div
          v-else
          class="space-y-4"
        >
          <UiCard>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div
                  class="w-12 h-12 rounded-lg flex items-center justify-center"
                  :class="status?.configured ? 'bg-blue-100' : 'bg-gray-100'"
                >
                  <MessageSquare
                    class="w-6 h-6"
                    :class="status?.configured ? 'text-blue-600' : 'text-gray-400'"
                  />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">
                    Zoom Phone
                  </h3>
                  <p class="text-sm text-gray-500">
                    Server-to-Server OAuth — account-wide SMS delivery
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UiBadge
                  v-if="status?.dryRun"
                  variant="warning"
                >
                  Dry Run
                </UiBadge>
                <UiBadge
                  v-if="status?.status === 'CONNECTED'"
                  variant="success"
                >
                  Connected
                </UiBadge>
                <UiBadge
                  v-else-if="status?.status === 'ERROR'"
                  variant="danger"
                >
                  Error
                </UiBadge>
                <UiBadge
                  v-else-if="status?.configured"
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
                  v-if="!showForm"
                  variant="outline"
                  size="sm"
                  @click="openForm"
                >
                  {{ status?.configured ? 'Update' : 'Configure' }}
                </UiButton>
              </div>
            </div>

            <!-- Configuration Form -->
            <div
              v-if="showForm"
              class="mt-4 border-t border-gray-200 pt-4 space-y-4"
            >
              <div class="text-sm text-gray-600 space-y-2">
                <p>
                  Create a Server-to-Server OAuth app at
                  <a
                    href="https://marketplace.zoom.us/develop/create"
                    target="_blank"
                    rel="noopener"
                    class="text-accent-600 underline"
                  >marketplace.zoom.us</a>
                  and add these granular scopes:
                </p>
                <ul class="list-disc pl-5 space-y-0.5 text-xs">
                  <li><code class="bg-gray-100 px-1 rounded">phone:read:sms_message:admin</code> — send SMS (yes, it's a "read" scope that grants write, per Zoom's current design)</li>
                  <li><code class="bg-gray-100 px-1 rounded">phone:read:list_account_numbers:admin</code> — list account phone numbers (for Test Connection)</li>
                </ul>
                <p class="text-xs text-amber-700">
                  Note: the legacy <code class="bg-gray-100 px-1 rounded">phone_sms:write:admin</code> and
                  <code class="bg-gray-100 px-1 rounded">phone:write:admin</code> scopes are retired and
                  won't appear in the scope selector. If <code class="bg-gray-100 px-1 rounded">phone:read:list_account_numbers:admin</code>
                  is also missing, try <code class="bg-gray-100 px-1 rounded">number_management:read:list_numbers:admin</code>
                  — Zoom's Number Management API is the replacement for the deprecated <code class="bg-gray-100 px-1 rounded">/phone/numbers</code> endpoint.
                </p>
              </div>

              <UiInput
                v-model="form.accountId"
                label="Account ID"
                placeholder="Your Zoom account ID"
                required
              />
              <UiInput
                v-model="form.clientId"
                label="Client ID"
                placeholder="Your S2S app client ID"
                required
              />
              <UiInput
                v-model="form.clientSecret"
                label="Client Secret"
                type="password"
                :placeholder="status?.hasCredentials ? '(unchanged — enter to replace)' : 'Your S2S app client secret'"
                :required="!status?.hasCredentials"
              />
              <UiInput
                v-model="form.fromPhoneNumber"
                label="From Phone Number"
                placeholder="+15551234567"
                required
              />
              <p class="text-xs text-gray-400 -mt-2">
                Must be a phone number assigned to your Zoom Phone account and registered in an approved
                10DLC campaign before production sending.
              </p>

              <div class="flex items-center gap-2">
                <UiButton
                  :is-loading="saving"
                  @click="saveConfig"
                >
                  Save Credentials
                </UiButton>
                <UiButton
                  v-if="status?.configured"
                  variant="outline"
                  :is-loading="testing"
                  @click="testConnection"
                >
                  Test Connection
                </UiButton>
                <UiButton
                  variant="outline"
                  @click="showForm = false"
                >
                  Cancel
                </UiButton>
              </div>
            </div>

            <!-- Status info when not editing -->
            <div
              v-else-if="status?.configured"
              class="mt-4 border-t border-gray-200 pt-4 space-y-1"
            >
              <p
                v-if="status?.fromPhoneNumber"
                class="text-sm text-gray-600"
              >
                From number: <code class="text-xs bg-gray-100 px-1 rounded">{{ status.fromPhoneNumber }}</code>
              </p>
              <p
                v-if="status?.lastTestedAt"
                class="text-xs text-gray-400"
              >
                Last tested: {{ new Date(status.lastTestedAt).toLocaleString() }}
                <span
                  v-if="status.lastErrorMessage"
                  class="text-red-500 ml-1"
                >
                  ({{ status.lastErrorMessage }})
                </span>
              </p>
              <div class="pt-2">
                <UiButton
                  variant="outline"
                  size="sm"
                  :is-loading="testing"
                  @click="testConnection"
                >
                  Test Connection
                </UiButton>
              </div>
            </div>
          </UiCard>

          <UiCard v-if="status?.dryRun">
            <div class="flex items-start gap-3">
              <AlertTriangle class="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div class="text-sm text-gray-700">
                <p class="font-medium">
                  Dry-run mode is active
                </p>
                <p class="mt-1 text-gray-600">
                  SMS sends will be logged with synthetic message IDs but will not actually be delivered
                  via Zoom. This is useful for testing flows before 10DLC campaign approval. Set
                  <code class="text-xs bg-gray-100 px-1 rounded">ZOOM_PHONE_SMS_DRY_RUN=false</code>
                  (or remove the environment variable) to enable live delivery.
                </p>
              </div>
            </div>
          </UiCard>
        </div>
      </div>
    </ClientOnly>

    <UiCard>
      <div class="flex items-start space-x-3">
        <Info class="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div class="text-sm text-gray-600">
          <p>
            Zoom Phone SMS delivery uses Server-to-Server OAuth so messages send from your firm's phone
            number regardless of which staff member triggered them. Credentials are encrypted at rest
            using AES-256-GCM. Outbound SMS to US recipients requires an approved 10DLC brand and campaign.
          </p>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MessageSquare, Info, AlertTriangle } from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const toast = useToast()

interface ZoomPhoneStatus {
  configured: boolean
  status: string
  hasCredentials: boolean
  fromPhoneNumber: string | null
  lastTestedAt: string | null
  lastErrorMessage: string | null
  dryRun: boolean
}

const loading = ref(true)
const status = ref<ZoomPhoneStatus | null>(null)
const showForm = ref(false)
const saving = ref(false)
const testing = ref(false)

const form = ref({
  accountId: '',
  clientId: '',
  clientSecret: '',
  fromPhoneNumber: ''
})

const loadStatus = async () => {
  loading.value = true
  try {
    status.value = await $fetch<ZoomPhoneStatus>('/api/admin/zoom-phone')
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Failed to load Zoom Phone status')
  }
  finally {
    loading.value = false
  }
}

const openForm = () => {
  // Reset form — we don't pre-fill credentials (they're encrypted)
  form.value = {
    accountId: '',
    clientId: '',
    clientSecret: '',
    fromPhoneNumber: ''
  }
  showForm.value = true
}

const saveConfig = async () => {
  saving.value = true
  try {
    await $fetch('/api/admin/zoom-phone', {
      method: 'PUT',
      body: form.value
    })
    toast.success('Zoom Phone credentials saved')
    showForm.value = false
    await loadStatus()
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Failed to save credentials')
  }
  finally {
    saving.value = false
  }
}

const testConnection = async () => {
  testing.value = true
  try {
    const result = await $fetch<{ success: boolean, message: string }>('/api/admin/zoom-phone/test', {
      method: 'POST'
    })
    toast.success(result.message)
    await loadStatus()
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Zoom Phone test failed')
    await loadStatus()
  }
  finally {
    testing.value = false
  }
}

onMounted(() => {
  loadStatus()
})
</script>
