<template>
  <div class="drive-tree-browser">
    <!-- Header with breadcrumb and actions -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2 min-w-0">
        <IconsGoogleDrive :size="20" class="text-gray-600 flex-shrink-0" />
        <nav class="flex items-center gap-1 text-sm overflow-hidden">
          <button
            v-for="(crumb, index) in breadcrumbs"
            :key="crumb.id"
            @click="navigateTo(crumb.id)"
            class="flex items-center gap-1 text-gray-600 hover:text-burgundy-600 truncate"
            :class="{ 'font-medium text-gray-900': index === breadcrumbs.length - 1 }"
          >
            <ChevronRight v-if="index > 0" class="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span class="truncate">{{ crumb.name }}</span>
          </button>
        </nav>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="folderUrl"
          @click="openInDrive"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-burgundy-600 hover:text-burgundy-800 hover:bg-burgundy-50 rounded-lg transition-colors"
        >
          <ExternalLink class="w-4 h-4" />
          Open in Drive
        </button>
        <button
          @click="refresh"
          :disabled="loading"
          class="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && items.length === 0" class="flex items-center justify-center py-12">
      <Loader2 class="w-6 h-6 animate-spin text-burgundy-600" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <AlertTriangle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-sm font-medium text-red-800">Failed to load folder contents</p>
          <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          <button
            @click="refresh"
            class="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="items.length === 0 && !loading" class="text-center py-12">
      <FolderOpen class="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500">This folder is empty</p>
    </div>

    <!-- File/Folder List -->
    <div v-else class="space-y-1">
      <!-- Back button when not at root -->
      <button
        v-if="breadcrumbs.length > 1"
        @click="goBack"
        class="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Back to parent folder</span>
      </button>

      <!-- Items -->
      <div
        v-for="item in items"
        :key="item.id"
        @click="handleItemClick(item)"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
        :class="item.isFolder ? 'hover:bg-gray-50' : 'hover:bg-gray-50'"
      >
        <!-- Icon -->
        <component
          :is="getItemIcon(item)"
          class="w-5 h-5 flex-shrink-0"
          :class="item.isFolder ? 'text-yellow-500' : 'text-gray-400'"
        />

        <!-- Name and details -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 truncate">
            {{ item.name }}
          </div>
          <div v-if="!item.isFolder && item.modifiedTime" class="text-xs text-gray-500">
            Modified {{ formatRelativeTime(item.modifiedTime) }}
            <span v-if="item.size"> &middot; {{ formatFileSize(parseInt(item.size)) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1">
          <a
            v-if="item.webViewLink"
            :href="item.webViewLink"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
            class="p-1.5 text-gray-400 hover:text-burgundy-600 hover:bg-burgundy-50 rounded transition-colors"
            title="Open in Google Drive"
          >
            <ExternalLink class="w-4 h-4" />
          </a>
          <a
            v-if="!item.isFolder && item.webContentLink"
            :href="item.webContentLink"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Download"
          >
            <Download class="w-4 h-4" />
          </a>
          <ChevronRight
            v-if="item.isFolder"
            class="w-4 h-4 text-gray-400"
          />
        </div>
      </div>
    </div>

    <!-- Item count footer -->
    <div v-if="items.length > 0" class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
      {{ items.length }} item{{ items.length === 1 ? '' : 's' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Folder,
  FolderOpen,
  FileText,
  File,
  Image,
  FileSpreadsheet,
  Film,
  Music,
  FileCode,
  Archive,
  ChevronRight,
  ExternalLink,
  Download,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-vue-next'
import { ref, onMounted, watch } from 'vue'

interface DriveItem {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  webContentLink?: string
  modifiedTime?: string
  size?: string
  isFolder: boolean
}

interface Breadcrumb {
  id: string
  name: string
}

interface Props {
  rootFolderId: string
  rootFolderName?: string
  folderUrl?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  rootFolderName: 'Matter Folder'
})

const loading = ref(false)
const error = ref<string | null>(null)
const items = ref<DriveItem[]>([])
const currentFolderId = ref(props.rootFolderId)
const breadcrumbs = ref<Breadcrumb[]>([
  { id: props.rootFolderId, name: props.rootFolderName }
])

async function loadFolder(folderId: string) {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch<{
      folder: { id: string; name: string; webViewLink?: string }
      items: DriveItem[]
      itemCount: number
    }>(`/api/google-drive/browse/${folderId}`)

    items.value = response.items
    currentFolderId.value = folderId
  } catch (err: any) {
    console.error('Failed to load folder:', err)
    error.value = err.data?.message || err.message || 'Failed to load folder contents'
  } finally {
    loading.value = false
  }
}

function handleItemClick(item: DriveItem) {
  if (item.isFolder) {
    // Navigate into folder
    breadcrumbs.value.push({ id: item.id, name: item.name })
    loadFolder(item.id)
  } else if (item.webViewLink) {
    // Open file in Drive
    window.open(item.webViewLink, '_blank')
  }
}

function navigateTo(folderId: string) {
  const index = breadcrumbs.value.findIndex(b => b.id === folderId)
  if (index >= 0) {
    breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
    loadFolder(folderId)
  }
}

function goBack() {
  if (breadcrumbs.value.length > 1) {
    breadcrumbs.value.pop()
    const parent = breadcrumbs.value[breadcrumbs.value.length - 1]
    if (parent) {
      loadFolder(parent.id)
    }
  }
}

function refresh() {
  loadFolder(currentFolderId.value)
}

function openInDrive() {
  if (props.folderUrl) {
    window.open(props.folderUrl, '_blank')
  }
}

function getItemIcon(item: DriveItem) {
  if (item.isFolder) return Folder

  const mimeType = item.mimeType.toLowerCase()

  // Google Docs types
  if (mimeType.includes('google-apps.document')) return FileText
  if (mimeType.includes('google-apps.spreadsheet')) return FileSpreadsheet
  if (mimeType.includes('google-apps.presentation')) return File
  if (mimeType.includes('google-apps.folder')) return Folder

  // Standard types
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.startsWith('audio/')) return Music
  if (mimeType.includes('pdf')) return FileText
  if (mimeType.includes('word') || mimeType.includes('document')) return FileText
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return FileSpreadsheet
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return Archive
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('html')) return FileCode

  return File
}

function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

// Watch for root folder changes
watch(() => props.rootFolderId, (newId) => {
  if (newId) {
    currentFolderId.value = newId
    breadcrumbs.value = [{ id: newId, name: props.rootFolderName }]
    loadFolder(newId)
  }
})

onMounted(() => {
  if (props.rootFolderId) {
    loadFolder(props.rootFolderId)
  }
})
</script>
