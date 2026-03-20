<template>
  <div class="space-y-6">
    <!-- Back link -->
    <NuxtLink
      to="/settings/google-workspace"
      class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
    >
      <ArrowLeft class="w-4 h-4 mr-1" />
      Back to Google Workspace
    </NuxtLink>

    <div class="flex justify-between items-center">
      <div class="flex items-start gap-4">
        <IconsGoogleDrive
          :size="40"
          class="mt-1"
        />
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            Google Drive Integration
          </h1>
          <p class="text-gray-600 mt-1">
            Configure automatic file sync to Google Drive Shared Drives
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="text-center py-12"
    >
      <p class="text-gray-500">
        Loading configuration...
      </p>
    </div>

    <!-- Service account check (after loading completes) -->
    <div
      v-else-if="!serviceAccountReady"
      class="p-6 border-2 border-dashed border-yellow-300 rounded-lg bg-yellow-50 text-center"
    >
      <p class="text-yellow-800 font-medium">
        Service account not configured
      </p>
      <p class="text-sm text-yellow-600 mt-1">
        Set up credentials in Google Workspace settings first.
      </p>
      <NuxtLink to="/settings/google-workspace">
        <UiButton
          size="sm"
          variant="outline"
          class="mt-3"
        >Go to Google Workspace</UiButton>
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Connection Status -->
      <UiCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">
                Connection Status
              </h2>
              <p class="text-sm text-gray-600 mt-1">
                Google Drive integration status
              </p>
            </div>
            <div class="flex items-center space-x-3">
              <UiBadge :variant="config?.isEnabled ? 'success' : 'default'">
                {{ config?.isEnabled ? 'Enabled' : 'Disabled' }}
              </UiBadge>
              <UiBadge
                v-if="config?.hasPrivateKey"
                variant="info"
              >
                Credentials Configured
              </UiBadge>
            </div>
          </div>
        </template>

        <div
          v-if="connectionTestResult"
          class="mb-4"
        >
          <div
            class="p-3 rounded-lg"
            :class="connectionTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'"
          >
            <div class="flex items-start space-x-3">
              <Check
                v-if="connectionTestResult.success"
                class="w-5 h-5 text-green-600 mt-0.5"
              />
              <AlertCircle
                v-else
                class="w-5 h-5 text-red-600 mt-0.5"
              />
              <div class="flex-1">
                <p
                  :class="connectionTestResult.success ? 'text-green-800' : 'text-red-800'"
                  class="whitespace-pre-wrap"
                >
                  {{ connectionTestResult.success ? connectionTestResult.message : connectionTestResult.error }}
                </p>
                <p
                  v-if="connectionTestResult.driveName"
                  class="text-sm text-green-600 mt-1"
                >
                  Connected to: {{ connectionTestResult.driveName }}
                </p>

                <!-- Accessible Drives List -->
                <div
                  v-if="connectionTestResult.accessibleDrives?.length"
                  class="mt-3 pt-3 border-t border-gray-200"
                >
                  <p class="text-sm font-medium text-gray-700 mb-2">
                    Accessible Shared Drives ({{ connectionTestResult.accessibleDrives.length }}):
                  </p>
                  <ul class="space-y-1">
                    <li
                      v-for="drive in connectionTestResult.accessibleDrives"
                      :key="drive.id"
                      class="text-sm flex items-center justify-between bg-white p-2 rounded border"
                    >
                      <span class="font-medium">{{ drive.name }}</span>
                      <div class="flex items-center gap-2">
                        <code class="text-xs bg-gray-100 px-2 py-0.5 rounded">{{ drive.id }}</code>
                        <button
                          type="button"
                          class="text-xs text-burgundy-600 hover:text-burgundy-800"
                          @click="form.sharedDriveId = drive.id"
                        >
                          Use this
                        </button>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex space-x-3">
          <UiButton
            variant="outline"
            :is-loading="testing"
            @click="testConnection"
          >
            <RefreshCw class="w-4 h-4 mr-2" />
            Test Connection
          </UiButton>
          <UiButton
            v-if="config && !config.rootFolderId && config.isEnabled && config.hasPrivateKey"
            :is-loading="creatingFolder"
            @click="createRootFolder"
          >
            <FolderPlus class="w-4 h-4 mr-2" />
            Create Root Folder
          </UiButton>
          <div
            v-if="config?.rootFolderId"
            class="flex items-center text-sm text-gray-600"
          >
            <Check class="w-4 h-4 text-green-600 mr-2" />
            Root folder created
          </div>
        </div>
      </UiCard>

      <!-- Configuration Form (Drive-specific settings only) -->
      <UiCard>
        <template #header>
          <h2 class="text-lg font-semibold text-gray-900">
            Drive Settings
          </h2>
          <p class="text-sm text-gray-600 mt-1">
            Shared Drive, sync, and folder configuration.
            Service account credentials are managed in
            <NuxtLink
              to="/settings/google-workspace"
              class="text-blue-600 hover:text-blue-700 underline"
            >Google Workspace settings</NuxtLink>.
          </p>
        </template>

        <form
          class="space-y-6"
          @submit.prevent="saveConfiguration"
        >
          <!-- Enable Toggle -->
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 class="font-medium text-gray-900">
                Enable Google Drive Integration
              </h3>
              <p class="text-sm text-gray-600">
                Automatically sync files to Google Drive
              </p>
            </div>
            <UiToggle v-model="form.isEnabled" />
          </div>

          <!-- Shared Drive Settings -->
          <div class="space-y-4">
            <h3 class="font-medium text-gray-900">
              Shared Drive Settings
            </h3>

            <UiInput
              v-model="form.sharedDriveId"
              label="Shared Drive ID"
              placeholder="0ABcDefGhIjKlMnOpQrStUv"
              :required="form.isEnabled"
            >
              <template #description>
                The ID of the Shared Drive. Found in the URL: drive.google.com/drive/folders/<strong>[ID]</strong>
              </template>
            </UiInput>

            <UiInput
              v-model="form.rootFolderName"
              label="Root Folder Name"
              placeholder="YTP Client Files"
              required
            >
              <template #description>
                Name for the root folder that will contain all client folders
              </template>
            </UiInput>

            <UiInput
              v-model="form.impersonateEmail"
              label="Impersonate Email (Optional)"
              placeholder="admin@yourdomain.com"
            >
              <template #description>
                If using domain-wide delegation, specify a user email to impersonate
              </template>
            </UiInput>
          </div>

          <!-- Sync Settings -->
          <div class="space-y-4">
            <h3 class="font-medium text-gray-900">
              Sync Settings
            </h3>

            <div class="space-y-3">
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">
                    Generated Documents
                  </p>
                  <p class="text-sm text-gray-600">
                    Sync documents created from templates
                  </p>
                </div>
                <UiToggle v-model="form.syncGeneratedDocuments" />
              </div>

              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">
                    Client Uploads
                  </p>
                  <p class="text-sm text-gray-600">
                    Sync files uploaded by clients
                  </p>
                </div>
                <UiToggle v-model="form.syncClientUploads" />
              </div>

              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">
                    Signed Documents
                  </p>
                  <p class="text-sm text-gray-600">
                    Sync documents after e-signature
                  </p>
                </div>
                <UiToggle v-model="form.syncSignedDocuments" />
              </div>
            </div>
          </div>

          <!-- Matter Subfolders -->
          <div class="space-y-4">
            <h3 class="font-medium text-gray-900">
              Matter Subfolders
            </h3>
            <p class="text-sm text-gray-600">
              These folders will be created automatically inside each matter folder
            </p>

            <div class="space-y-2">
              <div
                v-for="(subfolder, index) in form.matterSubfolders"
                :key="index"
                class="flex items-center space-x-2"
              >
                <UiInput
                  v-model="form.matterSubfolders[index]"
                  placeholder="Folder name"
                  class="flex-1"
                />
                <button
                  type="button"
                  class="p-2 text-gray-400 hover:text-red-600"
                  @click="removeSubfolder(index)"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              class="text-sm text-burgundy-600 hover:text-burgundy-800"
              @click="addSubfolder"
            >
              + Add subfolder
            </button>
          </div>

          <!-- Save Button -->
          <div class="flex justify-end pt-4 border-t">
            <UiButton
              type="submit"
              :is-loading="saving"
            >
              Save Configuration
            </UiButton>
          </div>
        </form>
      </UiCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Check, AlertCircle, RefreshCw, FolderPlus, Trash2 } from 'lucide-vue-next'
import { useAppConfigStore } from '~/stores/appConfig'

const toast = useToast()
const appConfigStore = useAppConfigStore() // used by saveConfiguration to refresh global state

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

interface DriveConfig {
  id: string
  isEnabled: boolean
  serviceAccountEmail: string | null
  hasPrivateKey: boolean
  sharedDriveId: string | null
  rootFolderId: string | null
  rootFolderName: string
  impersonateEmail: string | null
  matterSubfolders: string[]
  syncGeneratedDocuments: boolean
  syncClientUploads: boolean
  syncSignedDocuments: boolean
}

interface ConnectionTestResult {
  success: boolean
  message?: string
  error?: string
  driveName?: string
  accessibleDrives?: Array<{ id: string, name: string }>
}

const config = ref<DriveConfig | null>(null)
const loading = ref(true)
const serviceAccountReady = ref(false)
const saving = ref(false)
const testing = ref(false)
const creatingFolder = ref(false)
const connectionTestResult = ref<ConnectionTestResult | null>(null)

const form = ref({
  isEnabled: false,
  sharedDriveId: '',
  rootFolderName: 'YTP Client Files',
  impersonateEmail: '',
  matterSubfolders: ['Generated Documents', 'Client Uploads', 'Signed Documents', 'Correspondence'],
  syncGeneratedDocuments: true,
  syncClientUploads: true,
  syncSignedDocuments: true
})

async function fetchConfig() {
  loading.value = true
  try {
    const [driveResponse, wsStatus] = await Promise.all([
      $fetch<{ success: boolean, config: DriveConfig | null }>('/api/admin/google-drive/config'),
      $fetch<{ serviceAccount: { configured: boolean } }>('/api/google-workspace/status').catch(() => null)
    ])

    config.value = driveResponse.config
    serviceAccountReady.value = wsStatus?.serviceAccount?.configured ?? false

    if (driveResponse.config) {
      form.value = {
        isEnabled: driveResponse.config.isEnabled,
        sharedDriveId: driveResponse.config.sharedDriveId || '',
        rootFolderName: driveResponse.config.rootFolderName,
        impersonateEmail: driveResponse.config.impersonateEmail || '',
        matterSubfolders: driveResponse.config.matterSubfolders,
        syncGeneratedDocuments: driveResponse.config.syncGeneratedDocuments,
        syncClientUploads: driveResponse.config.syncClientUploads,
        syncSignedDocuments: driveResponse.config.syncSignedDocuments
      }
    }
  }
  catch (error) {
    console.error('Failed to fetch config:', error)
  }
  finally {
    loading.value = false
  }
}

async function saveConfiguration() {
  saving.value = true
  try {
    await $fetch('/api/admin/google-drive/configure', {
      method: 'POST',
      body: {
        ...form.value
        // No credentials here — managed on the Workspace page
      }
    })

    // Refresh config
    await fetchConfig()
    await appConfigStore.refetch()

    toast.success('Configuration saved successfully')
  }
  catch (error: any) {
    console.error('Failed to save configuration:', error)
    toast.error(error.data?.message || 'Failed to save configuration')
  }
  finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  connectionTestResult.value = null

  try {
    // Always use stored credentials — no private key in this form
    const response = await $fetch<ConnectionTestResult>('/api/admin/google-drive/test', {
      method: 'POST',
      body: {
        sharedDriveId: form.value.sharedDriveId || undefined,
        impersonateEmail: form.value.impersonateEmail || undefined
      }
    })

    connectionTestResult.value = response
  }
  catch (error: any) {
    connectionTestResult.value = {
      success: false,
      error: error.data?.message || 'Failed to test connection'
    }
  }
  finally {
    testing.value = false
  }
}

async function createRootFolder() {
  creatingFolder.value = true

  try {
    const response = await $fetch<{ success: boolean, message: string, folderId?: string }>('/api/admin/google-drive/create-root-folder', {
      method: 'POST'
    })

    toast.success(response.message)
    await fetchConfig()
  }
  catch (error: any) {
    console.error('Failed to create root folder:', error)
    toast.error(error.data?.message || 'Failed to create root folder')
  }
  finally {
    creatingFolder.value = false
  }
}

function addSubfolder() {
  form.value.matterSubfolders.push('')
}

function removeSubfolder(index: number) {
  form.value.matterSubfolders.splice(index, 1)
}

onMounted(() => {
  fetchConfig()
})
</script>
