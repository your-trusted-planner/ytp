<template>
  <div class="border rounded-lg bg-white overflow-hidden">
    <!-- Header -->
    <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Signature class="w-4 h-4 text-gray-600" />
        <div>
          <h4 class="text-sm font-semibold text-gray-800">
            {{ actionItem.title }}
          </h4>
          <p
            v-if="actionItem.description"
            class="text-xs text-gray-500 mt-0.5"
          >
            {{ actionItem.description }}
          </p>
        </div>
      </div>
      <span
        v-if="actionItem.status === 'COMPLETE'"
        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
      >
        Completed
      </span>
      <span
        v-else-if="config.requiresNotarization"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"
      >
        <Stamp class="w-3 h-3" />
        Notarization required
      </span>
    </div>

    <!-- Document Checklist -->
    <div class="p-4">
      <!-- Staff notes -->
      <p
        v-if="config.notes && actionItem.status !== 'COMPLETE'"
        class="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-4"
      >
        {{ config.notes }}
      </p>

      <div class="space-y-3">
        <div
          v-for="(doc, idx) in config.documents"
          :key="idx"
          class="flex items-center gap-3 p-3 rounded-lg border transition-colors"
          :class="getDocUpload(idx) ? 'border-green-200 bg-green-50' : 'border-gray-200'"
        >
          <!-- Document info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <FileText class="w-4 h-4 text-gray-500 shrink-0" />
              <span class="text-sm font-medium text-gray-900 truncate">{{ doc.label }}</span>
            </div>
            <!-- Upload status -->
            <div
              v-if="getDocUpload(idx)"
              class="flex items-center gap-2 mt-1 ml-6"
            >
              <CheckCircle class="w-3.5 h-3.5 text-green-600" />
              <span class="text-xs text-green-700">{{ getDocUpload(idx)!.original_file_name }}</span>
              <span
                v-if="getDocUpload(idx)!.google_drive_sync_status === 'SYNCED'"
                class="text-xs text-blue-600"
              >
                (synced to Drive)
              </span>
              <span
                v-else-if="getDocUpload(idx)!.google_drive_sync_status === 'PENDING'"
                class="text-xs text-gray-500"
              >
                (syncing...)
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div
            v-if="actionItem.status !== 'COMPLETE'"
            class="flex items-center gap-2 shrink-0"
          >
            <a
              v-if="getDocUpload(idx)"
              :href="`/api/document-uploads/${getDocUpload(idx)!.id}/download`"
              target="_blank"
              class="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View
            </a>
            <label
              class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              :class="getDocUpload(idx)
                ? 'border-gray-300 text-gray-600 hover:bg-gray-100'
                : 'border-burgundy-300 text-burgundy-700 bg-burgundy-50 hover:bg-burgundy-100'"
            >
              <Upload class="w-3.5 h-3.5" />
              {{ getDocUpload(idx) ? 'Replace' : 'Upload scan' }}
              <input
                type="file"
                class="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
                @change="handleUpload($event, idx)"
              >
            </label>
          </div>
        </div>
      </div>

      <!-- Upload progress -->
      <div
        v-if="uploading"
        class="mt-3 flex items-center gap-2 text-sm text-gray-600"
      >
        <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-burgundy-500" />
        Uploading...
      </div>

      <!-- Complete button (staff only, when not already complete) -->
      <div
        v-if="actionItem.status !== 'COMPLETE'"
        class="mt-4 pt-4 border-t flex items-center justify-between"
      >
        <p class="text-xs text-gray-500">
          {{ uploads.length }} of {{ config.documents.length }} scan{{ config.documents.length !== 1 ? 's' : '' }} uploaded
        </p>
        <button
          :disabled="completing"
          class="px-4 py-2 text-sm font-medium text-white bg-burgundy-600 rounded-lg hover:bg-burgundy-700 disabled:opacity-50 transition-colors"
          @click="handleComplete"
        >
          {{ completing ? 'Completing...' : 'Mark as Signed' }}
        </button>
      </div>

      <!-- Completed state -->
      <div
        v-if="actionItem.status === 'COMPLETE'"
        class="mt-3 pt-3 border-t"
      >
        <p class="text-xs text-gray-500">
          {{ uploads.length }} scan{{ uploads.length !== 1 ? 's' : '' }} uploaded
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Signature, Stamp, FileText, Upload, CheckCircle } from 'lucide-vue-next'

const toast = useToast()

const props = defineProps<{
  actionItem: {
    id: string
    title: string
    description?: string
    config?: string
    status: string
    client_journey_id?: string
  }
}>()

const emit = defineEmits<{
  completed: []
}>()

const uploading = ref(false)
const completing = ref(false)
const uploads = ref<any[]>([])

const config = computed(() => {
  if (!props.actionItem.config) return { documents: [], requiresNotarization: false, notes: '' }
  try {
    return JSON.parse(props.actionItem.config)
  } catch {
    return { documents: [], requiresNotarization: false, notes: '' }
  }
})

// Map uploads to document indices by matching the document category pattern
function getDocUpload(docIdx: number): any | null {
  return uploads.value.find(u => u.document_category === `wet_sign_doc_${docIdx}`) || null
}

// Fetch existing uploads for this action item
async function fetchUploads() {
  try {
    const data = await $fetch<{ uploads: any[] }>(`/api/action-items/${props.actionItem.id}/uploads`)
    uploads.value = data.uploads
  } catch { /* ignore */ }
}

async function handleUpload(event: Event, docIdx: number) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('actionItemId', props.actionItem.id)
    formData.append('documentCategory', `wet_sign_doc_${docIdx}`)
    if (props.actionItem.client_journey_id) {
      formData.append('clientJourneyId', props.actionItem.client_journey_id)
    }

    await $fetch('/api/document-uploads', {
      method: 'POST',
      body: formData
    })

    // Refresh uploads
    await fetchUploads()
    toast.success(`Scan uploaded for "${config.value.documents[docIdx]?.label}"`)
  } catch (err: any) {
    toast.error('Failed to upload scan')
    console.error('Upload failed:', err)
  } finally {
    uploading.value = false
    input.value = '' // Reset file input
  }
}

async function handleComplete() {
  completing.value = true
  try {
    // Build verification evidence
    const evidence = {
      documents: config.value.documents.map((doc: any, idx: number) => {
        const upload = getDocUpload(idx)
        return {
          label: doc.label,
          uploadId: upload?.id || null,
          fileName: upload?.original_file_name || null,
          googleDriveFileId: upload?.google_drive_file_id || null,
          googleDriveFileUrl: upload?.google_drive_file_url || null
        }
      }),
      requiresNotarization: config.value.requiresNotarization,
      totalUploads: uploads.value.length,
      completedAt: new Date().toISOString()
    }

    await $fetch(`/api/action-items/${props.actionItem.id}/complete`, {
      method: 'POST',
      body: { verificationEvidence: evidence }
    })

    toast.success('Documents marked as signed')
    emit('completed')
  } catch (err: any) {
    toast.error('Failed to complete action item')
    console.error('Complete failed:', err)
  } finally {
    completing.value = false
  }
}

onMounted(() => {
  fetchUploads()
})
</script>
