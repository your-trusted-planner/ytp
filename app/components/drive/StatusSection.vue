<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <div class="flex justify-between items-start mb-4">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <IconsGoogleDrive :size="20" />
        Google Drive
      </h3>
      <DriveStatusBadge :status="syncStatus" :folder-url="folderUrl" :show-label="true" />
    </div>

    <div class="space-y-3 text-sm">
      <!-- Folder Link -->
      <div v-if="folderUrl && syncStatus === 'SYNCED'" class="flex items-center justify-between">
        <span class="text-gray-600">Folder:</span>
        <a
          :href="folderUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-burgundy-600 hover:text-burgundy-800 flex items-center gap-1.5"
        >
          <IconsGoogleDrive :size="14" />
          Open in Drive
          <ExternalLink class="w-3.5 h-3.5" />
        </a>
      </div>

      <!-- Last Sync Time -->
      <div v-if="lastSyncAt && syncStatus === 'SYNCED'" class="flex items-center justify-between">
        <span class="text-gray-600">Last synced:</span>
        <span class="text-gray-900">{{ formatRelativeTime(lastSyncAt) }}</span>
      </div>

      <!-- Error Message -->
      <div v-if="syncError && syncStatus === 'ERROR'" class="mt-3">
        <div class="bg-red-50 border border-red-200 rounded-lg p-3">
          <div class="flex items-start gap-2">
            <AlertTriangle class="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p class="text-sm font-medium text-red-800">Sync Error</p>
              <p class="text-sm text-red-700 mt-1">{{ syncError }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Not Synced Message -->
      <div v-if="syncStatus === 'NOT_SYNCED' || !syncStatus" class="mt-3">
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p class="text-sm text-gray-600">
            This {{ entityType }} is not synced to Google Drive yet.
            Click "Sync Now" to create a folder.
          </p>
        </div>
      </div>

      <!-- Sync Buttons -->
      <div class="mt-4 pt-3 border-t border-gray-100 space-y-2">
        <UiButton
          size="sm"
          variant="outline"
          :is-loading="isSyncing"
          @click="handleSync(false)"
          class="w-full"
        >
          <RefreshCw v-if="!isSyncing" class="w-4 h-4 mr-2" />
          {{ syncStatus === 'SYNCED' ? 'Verify Folder' : 'Sync Now' }}
        </UiButton>

        <!-- Force Resync - shown when there's an existing folder or error -->
        <UiButton
          v-if="syncStatus === 'SYNCED' || syncStatus === 'ERROR'"
          size="sm"
          variant="ghost"
          :is-loading="isSyncing"
          @click="handleSync(true)"
          class="w-full text-gray-600"
        >
          <RefreshCw v-if="!isSyncing" class="w-4 h-4 mr-2" />
          Force New Folder
        </UiButton>
        <p v-if="syncStatus === 'SYNCED' || syncStatus === 'ERROR'" class="text-xs text-gray-500 text-center">
          Use "Force New Folder" to create a new folder in the currently configured drive
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ExternalLink, AlertTriangle, RefreshCw } from 'lucide-vue-next'
import { ref } from 'vue'

type SyncStatus = 'SYNCED' | 'NOT_SYNCED' | 'ERROR' | null | undefined

const props = defineProps<{
  syncStatus?: SyncStatus
  folderUrl?: string | null
  lastSyncAt?: number | null
  syncError?: string | null
  entityType: 'client' | 'matter'
  entityId: string
}>()

const emit = defineEmits<{
  (e: 'synced', data: { folderId: string; folderUrl: string }): void
}>()

const toast = useToast()
const isSyncing = ref(false)

async function handleSync(force = false) {
  isSyncing.value = true
  try {
    const baseEndpoint = props.entityType === 'client'
      ? `/api/google-drive/sync/client/${props.entityId}`
      : `/api/google-drive/sync/matter/${props.entityId}`

    const endpoint = force ? `${baseEndpoint}?force=true` : baseEndpoint

    const response = await $fetch<{
      success: boolean
      folderId?: string
      folderUrl?: string
      message?: string
      error?: string
      alreadyExists?: boolean
    }>(endpoint, {
      method: 'POST'
    })

    if (response.success && response.folderId && response.folderUrl) {
      const message = response.alreadyExists
        ? `${props.entityType === 'client' ? 'Client' : 'Matter'} folder verified`
        : `${props.entityType === 'client' ? 'Client' : 'Matter'} folder synced to Google Drive`
      toast.success(message)
      emit('synced', {
        folderId: response.folderId,
        folderUrl: response.folderUrl
      })
    } else if (response.success) {
      // Success but missing folder info - still emit with what we have
      toast.success(response.message || 'Sync completed')
      if (response.folderId) {
        emit('synced', {
          folderId: response.folderId,
          folderUrl: response.folderUrl || ''
        })
      }
    } else {
      toast.error(response.error || 'Failed to sync to Google Drive')
    }
  } catch (error: any) {
    console.error('Sync error:', error)
    toast.error(error.data?.message || error.message || 'Failed to sync to Google Drive')
  } finally {
    isSyncing.value = false
  }
}

function formatRelativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Unknown'

  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}
</script>
