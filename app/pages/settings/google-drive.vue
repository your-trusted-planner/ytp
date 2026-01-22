<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-start gap-4">
        <IconsGoogleDrive :size="40" class="mt-1" />
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Google Drive Integration</h1>
          <p class="text-gray-600 mt-1">Configure automatic file sync to Google Drive Shared Drives</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading configuration...</p>
    </div>

    <template v-else>
      <!-- Connection Status -->
      <UiCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Connection Status</h2>
              <p class="text-sm text-gray-600 mt-1">Google Drive integration status</p>
            </div>
            <div class="flex items-center space-x-3">
              <UiBadge :variant="config?.isEnabled ? 'success' : 'default'">
                {{ config?.isEnabled ? 'Enabled' : 'Disabled' }}
              </UiBadge>
              <UiBadge v-if="config?.hasPrivateKey" variant="info">
                Credentials Configured
              </UiBadge>
            </div>
          </div>
        </template>

        <div v-if="connectionTestResult" class="mb-4">
          <div
            class="p-3 rounded-lg"
            :class="connectionTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'"
          >
            <div class="flex items-start space-x-3">
              <Check v-if="connectionTestResult.success" class="w-5 h-5 text-green-600 mt-0.5" />
              <AlertCircle v-else class="w-5 h-5 text-red-600 mt-0.5" />
              <div class="flex-1">
                <p
                  :class="connectionTestResult.success ? 'text-green-800' : 'text-red-800'"
                  class="whitespace-pre-wrap"
                >
                  {{ connectionTestResult.success ? connectionTestResult.message : connectionTestResult.error }}
                </p>
                <p v-if="connectionTestResult.driveName" class="text-sm text-green-600 mt-1">
                  Connected to: {{ connectionTestResult.driveName }}
                </p>

                <!-- Accessible Drives List -->
                <div v-if="connectionTestResult.accessibleDrives?.length" class="mt-3 pt-3 border-t border-gray-200">
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
                          @click="form.sharedDriveId = drive.id"
                          class="text-xs text-burgundy-600 hover:text-burgundy-800"
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
          <UiButton variant="outline" @click="testConnection" :is-loading="testing">
            <RefreshCw class="w-4 h-4 mr-2" />
            Test Connection
          </UiButton>
          <UiButton
            v-if="config && !config.rootFolderId && config.isEnabled && config.hasPrivateKey"
            @click="createRootFolder"
            :is-loading="creatingFolder"
          >
            <FolderPlus class="w-4 h-4 mr-2" />
            Create Root Folder
          </UiButton>
          <div v-if="config?.rootFolderId" class="flex items-center text-sm text-gray-600">
            <Check class="w-4 h-4 text-green-600 mr-2" />
            Root folder created
          </div>
        </div>
      </UiCard>

      <!-- Configuration Form -->
      <UiCard>
        <template #header>
          <h2 class="text-lg font-semibold text-gray-900">Configuration</h2>
          <p class="text-sm text-gray-600 mt-1">Service account and sync settings</p>
        </template>

        <form @submit.prevent="saveConfiguration" class="space-y-6">
          <!-- Enable Toggle -->
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 class="font-medium text-gray-900">Enable Google Drive Integration</h3>
              <p class="text-sm text-gray-600">Automatically sync files to Google Drive</p>
            </div>
            <UiToggle v-model="form.isEnabled" />
          </div>

          <!-- Service Account Credentials -->
          <div class="space-y-4">
            <h3 class="font-medium text-gray-900">Service Account Credentials</h3>

            <UiInput
              v-model="form.serviceAccountEmail"
              label="Service Account Email"
              placeholder="service-account@project.iam.gserviceaccount.com"
              :required="form.isEnabled"
            />

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Service Account Private Key
              </label>
              <textarea
                v-model="form.serviceAccountPrivateKey"
                rows="4"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-burgundy-500 focus:ring-burgundy-500 font-mono text-sm"
                placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              />
              <p class="text-sm text-gray-600 mt-1">
                Paste the private key from your service account JSON file. Leave empty to keep existing key.
              </p>
            </div>
          </div>

          <!-- Shared Drive Settings -->
          <div class="space-y-4">
            <h3 class="font-medium text-gray-900">Shared Drive Settings</h3>

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
            <h3 class="font-medium text-gray-900">Sync Settings</h3>

            <div class="space-y-3">
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">Generated Documents</p>
                  <p class="text-sm text-gray-600">Sync documents created from templates</p>
                </div>
                <UiToggle v-model="form.syncGeneratedDocuments" />
              </div>

              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">Client Uploads</p>
                  <p class="text-sm text-gray-600">Sync files uploaded by clients</p>
                </div>
                <UiToggle v-model="form.syncClientUploads" />
              </div>

              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">Signed Documents</p>
                  <p class="text-sm text-gray-600">Sync documents after e-signature</p>
                </div>
                <UiToggle v-model="form.syncSignedDocuments" />
              </div>
            </div>
          </div>

          <!-- Matter Subfolders -->
          <div class="space-y-4">
            <h3 class="font-medium text-gray-900">Matter Subfolders</h3>
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
                  @click="removeSubfolder(index)"
                  class="p-2 text-gray-400 hover:text-red-600"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              @click="addSubfolder"
              class="text-sm text-burgundy-600 hover:text-burgundy-800"
            >
              + Add subfolder
            </button>
          </div>

          <!-- Save Button -->
          <div class="flex justify-end pt-4 border-t">
            <UiButton type="submit" :is-loading="saving">
              Save Configuration
            </UiButton>
          </div>
        </form>
      </UiCard>

      <!-- Setup Instructions -->
      <UiCard>
        <template #header>
          <h2 class="text-lg font-semibold text-gray-900">Setup Instructions</h2>
        </template>

        <div class="prose prose-sm max-w-none">
          <ol class="space-y-3">
            <li>
              <strong>Create a Shared Drive</strong> in Google Workspace Admin Console or Google Drive
            </li>
            <li>
              <strong>Create a Service Account</strong> in Google Cloud Console with Google Drive API enabled
            </li>
            <li>
              <strong>Configure Domain-Wide Delegation</strong> (optional) in Workspace Admin for the service account
            </li>
            <li>
              <strong>Add the service account</strong> as a Content Manager on the Shared Drive
            </li>
            <li>
              <strong>Copy the Shared Drive ID</strong> from the URL and paste above
            </li>
            <li>
              <strong>Test the connection</strong> to verify permissions
            </li>
            <li>
              <strong>Create the root folder</strong> using the button above
            </li>
          </ol>

          <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-sm text-blue-800">
              <strong>Required Scope:</strong> <code>https://www.googleapis.com/auth/drive</code>
            </p>
          </div>
        </div>
      </UiCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Check, AlertCircle, RefreshCw, FolderPlus, Trash2 } from 'lucide-vue-next'

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
  accessibleDrives?: Array<{ id: string; name: string }>
}

const config = ref<DriveConfig | null>(null)
const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const creatingFolder = ref(false)
const connectionTestResult = ref<ConnectionTestResult | null>(null)

const form = ref({
  isEnabled: false,
  serviceAccountEmail: '',
  serviceAccountPrivateKey: '',
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
    const response = await $fetch<{ success: boolean; config: DriveConfig | null }>('/api/admin/google-drive/config')
    config.value = response.config

    if (response.config) {
      form.value = {
        isEnabled: response.config.isEnabled,
        serviceAccountEmail: response.config.serviceAccountEmail || '',
        serviceAccountPrivateKey: '', // Don't populate for security
        sharedDriveId: response.config.sharedDriveId || '',
        rootFolderName: response.config.rootFolderName,
        impersonateEmail: response.config.impersonateEmail || '',
        matterSubfolders: response.config.matterSubfolders,
        syncGeneratedDocuments: response.config.syncGeneratedDocuments,
        syncClientUploads: response.config.syncClientUploads,
        syncSignedDocuments: response.config.syncSignedDocuments
      }
    }
  } catch (error) {
    console.error('Failed to fetch config:', error)
  } finally {
    loading.value = false
  }
}

async function saveConfiguration() {
  saving.value = true
  try {
    await $fetch('/api/admin/google-drive/configure', {
      method: 'POST',
      body: {
        ...form.value,
        // Only include private key if it was changed
        ...(form.value.serviceAccountPrivateKey ? { serviceAccountPrivateKey: form.value.serviceAccountPrivateKey } : {})
      }
    })

    // Clear the private key field after saving
    form.value.serviceAccountPrivateKey = ''

    // Refresh config
    await fetchConfig()

    alert('Configuration saved successfully')
  } catch (error: any) {
    console.error('Failed to save configuration:', error)
    alert(error.data?.message || 'Failed to save configuration')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  connectionTestResult.value = null

  try {
    const response = await $fetch<ConnectionTestResult>('/api/admin/google-drive/test', {
      method: 'POST',
      body: form.value.serviceAccountPrivateKey ? {
        serviceAccountEmail: form.value.serviceAccountEmail,
        serviceAccountPrivateKey: form.value.serviceAccountPrivateKey,
        sharedDriveId: form.value.sharedDriveId,
        impersonateEmail: form.value.impersonateEmail || null
      } : {}
    })

    connectionTestResult.value = response
  } catch (error: any) {
    connectionTestResult.value = {
      success: false,
      error: error.data?.message || 'Failed to test connection'
    }
  } finally {
    testing.value = false
  }
}

async function createRootFolder() {
  creatingFolder.value = true

  try {
    const response = await $fetch<{ success: boolean; message: string; folderId?: string }>('/api/admin/google-drive/create-root-folder', {
      method: 'POST'
    })

    alert(response.message)
    await fetchConfig()
  } catch (error: any) {
    console.error('Failed to create root folder:', error)
    alert(error.data?.message || 'Failed to create root folder')
  } finally {
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
