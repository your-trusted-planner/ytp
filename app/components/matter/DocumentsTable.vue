<template>
  <div class="space-y-4">
    <div v-if="documents.length === 0 && uploads.length === 0" class="text-center py-8 text-gray-500">
      No documents found for this matter
    </div>

    <!-- Generated Documents Section -->
    <div v-if="documents.length > 0">
      <h4 class="text-sm font-medium text-gray-700 mb-3">Generated Documents</h4>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Document
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Drive
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="doc in documents" :key="doc.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <FileText class="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ doc.title }}</div>
                    <div v-if="doc.description" class="text-xs text-gray-500 truncate max-w-xs">
                      {{ doc.description }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <UiBadge :variant="getDocStatusVariant(doc.status)">
                  {{ formatStatus(doc.status) }}
                </UiBadge>
                <div v-if="doc.signedAt" class="text-xs text-gray-500 mt-1">
                  Signed {{ formatDate(doc.signedAt) }}
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="text-sm text-gray-500">
                  {{ formatDate(doc.createdAt) }}
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <a
                  v-if="doc.googleDriveFileUrl && doc.googleDriveSyncStatus === 'SYNCED'"
                  :href="doc.googleDriveFileUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-sm text-burgundy-600 hover:text-burgundy-800"
                >
                  <IconsGoogleDrive :size="14" />
                  <span>View</span>
                  <ExternalLink class="w-3 h-3" />
                </a>
                <span v-else-if="doc.googleDriveSyncStatus === 'PENDING'" class="text-xs text-gray-500">
                  Syncing...
                </span>
                <span v-else-if="doc.googleDriveSyncStatus === 'ERROR'" class="text-xs text-red-500">
                  Sync failed
                </span>
                <span v-else class="text-xs text-gray-400">-</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="$emit('download', doc.id)"
                    class="text-gray-600 hover:text-gray-900 p-1"
                    title="Download"
                  >
                    <Download class="w-4 h-4" />
                  </button>
                  <button
                    @click="$emit('view', doc.id)"
                    class="text-gray-600 hover:text-gray-900 p-1"
                    title="View details"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Client Uploads Section -->
    <div v-if="uploads.length > 0" :class="{ 'mt-6 pt-6 border-t border-gray-200': documents.length > 0 }">
      <h4 class="text-sm font-medium text-gray-700 mb-3">Client Uploads</h4>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Uploaded
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Drive
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="upload in uploads" :key="upload.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <component :is="getFileIcon(upload.mimeType)" class="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <div class="text-sm font-medium text-gray-900 truncate max-w-xs">
                      {{ upload.originalFileName }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ formatFileSize(upload.fileSize) }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span v-if="upload.documentCategory" class="text-sm text-gray-900">
                  {{ upload.documentCategory }}
                </span>
                <span v-else class="text-sm text-gray-400">-</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <UiBadge :variant="getUploadStatusVariant(upload.status)">
                  {{ formatUploadStatus(upload.status) }}
                </UiBadge>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <div class="text-sm text-gray-500">
                  {{ formatDate(upload.createdAt) }}
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <a
                  v-if="upload.googleDriveFileUrl && upload.googleDriveSyncStatus === 'SYNCED'"
                  :href="upload.googleDriveFileUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-sm text-burgundy-600 hover:text-burgundy-800"
                >
                  <IconsGoogleDrive :size="14" />
                  <span>View</span>
                  <ExternalLink class="w-3 h-3" />
                </a>
                <span v-else-if="upload.googleDriveSyncStatus === 'PENDING'" class="text-xs text-gray-500">
                  Syncing...
                </span>
                <span v-else-if="upload.googleDriveSyncStatus === 'ERROR'" class="text-xs text-red-500">
                  Sync failed
                </span>
                <span v-else class="text-xs text-gray-400">-</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="$emit('downloadUpload', upload.id)"
                    class="text-gray-600 hover:text-gray-900 p-1"
                    title="Download"
                  >
                    <Download class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileText, File, Image, FileSpreadsheet, Download, Eye, ExternalLink } from 'lucide-vue-next'

interface Document {
  id: string
  title: string
  description?: string | null
  status: string
  mimeType?: string | null
  fileSize?: number | null
  requiresNotary?: boolean
  attorneyApproved?: boolean
  readyForSignature?: boolean
  signedAt?: number | null
  googleDriveFileUrl?: string | null
  googleDriveSyncStatus?: string | null
  createdAt: number
  updatedAt: number
}

interface Upload {
  id: string
  fileName: string
  originalFileName: string
  documentCategory?: string | null
  fileSize: number
  mimeType: string
  status: string
  googleDriveFileUrl?: string | null
  googleDriveSyncStatus?: string | null
  createdAt: number
  reviewedAt?: number | null
}

interface Props {
  documents: Document[]
  uploads: Upload[]
}

defineProps<Props>()

defineEmits<{
  (e: 'download', id: string): void
  (e: 'view', id: string): void
  (e: 'downloadUpload', id: string): void
}>()

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'DRAFT': 'Draft',
    'SENT': 'Sent',
    'VIEWED': 'Viewed',
    'SIGNED': 'Signed',
    'COMPLETED': 'Completed'
  }
  return statusMap[status] || status
}

function formatUploadStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING_REVIEW': 'Pending Review',
    'REVIEWED': 'Reviewed',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected',
    'REQUIRES_REVISION': 'Needs Revision'
  }
  return statusMap[status] || status
}

function getDocStatusVariant(status: string): 'success' | 'info' | 'default' | 'danger' {
  switch (status) {
    case 'SIGNED':
    case 'COMPLETED':
      return 'success'
    case 'SENT':
    case 'VIEWED':
      return 'info'
    case 'DRAFT':
      return 'default'
    default:
      return 'default'
  }
}

function getUploadStatusVariant(status: string): 'success' | 'info' | 'default' | 'danger' {
  switch (status) {
    case 'APPROVED':
      return 'success'
    case 'PENDING_REVIEW':
    case 'REVIEWED':
      return 'info'
    case 'REJECTED':
    case 'REQUIRES_REVISION':
      return 'danger'
    default:
      return 'default'
  }
}

function getFileIcon(mimeType: string) {
  if (mimeType?.startsWith('image/')) return Image
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return FileSpreadsheet
  if (mimeType?.includes('pdf') || mimeType?.includes('document') || mimeType?.includes('word')) return FileText
  return File
}
</script>
