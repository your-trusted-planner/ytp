<template>
  <div class="bg-white rounded-lg shadow-sm border border-slate-200">
    <!-- Header -->
    <div class="border-b border-slate-200 px-6 py-4">
      <h3 class="text-lg font-semibold text-slate-900">Notary Documents</h3>
      <p class="text-sm text-slate-600 mt-1">
        {{ isStaff ? 'Manage offline notarization workflow' : 'Documents requiring notarization' }}
      </p>
    </div>

    <!-- Documents List -->
    <div class="p-6">
      <div v-if="notaryDocuments.length > 0" class="space-y-4">
        <div
          v-for="doc in notaryDocuments"
          :key="doc.id"
          class="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <h4 class="font-medium text-slate-900">{{ doc.document_title }}</h4>
              <p v-if="doc.document_description" class="text-sm text-slate-600 mt-1">
                {{ doc.document_description }}
              </p>
            </div>
            <span
              :class="getStatusClass(doc.status)"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            >
              {{ getStatusLabel(doc.status) }}
            </span>
          </div>

          <!-- Status Timeline -->
          <div class="mb-4">
            <div class="flex items-center space-x-2">
              <div
                v-for="(step, index) in getTimelineSteps(doc.status)"
                :key="index"
                class="flex items-center"
              >
                <div
                  :class="step.complete ? 'bg-[#C41E3A] text-white' : 'bg-slate-200 text-slate-500'"
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                >
                  {{ step.complete ? '✓' : index + 1 }}
                </div>
                <div
                  v-if="index < getTimelineSteps(doc.status).length - 1"
                  :class="step.complete ? 'bg-[#C41E3A]' : 'bg-slate-200'"
                  class="w-12 h-1 mx-1"
                ></div>
              </div>
            </div>
            <div class="flex justify-between text-xs text-slate-500 mt-2">
              <span>Pending</span>
              <span>Downloaded</span>
              <span>Notarized</span>
              <span>Uploaded</span>
            </div>
          </div>

          <!-- Actions based on status and role -->
          <div class="space-y-3">
            <!-- Download Action (Staff only, if PENDING) -->
            <div v-if="isStaff && doc.status === 'PENDING'" class="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-900">Ready for download</p>
                <p class="text-xs text-slate-600">Download to send for offline notarization</p>
              </div>
              <button
                @click="markAsDownloaded(doc.id)"
                class="px-4 py-2 bg-[#C41E3A] text-white rounded-lg text-sm font-semibold hover:bg-[#a31830] transition-colors"
              >
                <svg class="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Download
              </button>
            </div>

            <!-- Awaiting Notarization (Client view) -->
            <div v-if="doc.status === 'DOWNLOADED' && !isStaff" class="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-blue-800">Awaiting Notarization</h3>
                  <div class="mt-1 text-sm text-blue-700">
                    <p>Your document has been prepared for notarization. Our staff will contact you with next steps.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Upload Form (Staff only, if DOWNLOADED) -->
            <div v-if="isStaff && doc.status === 'DOWNLOADED'" class="bg-slate-50 p-4 rounded-lg">
              <h5 class="text-sm font-semibold text-slate-900 mb-3">Upload Notarized Document</h5>
              
              <div class="space-y-3">
                <div>
                  <label class="block text-xs font-medium text-slate-700 mb-1">Notarized PDF</label>
                  <input
                    type="file"
                    accept=".pdf"
                    @change="handleFileSelect($event, doc.id)"
                    class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#C41E3A] file:text-white hover:file:bg-[#a31830]"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-slate-700 mb-1">Notary Name</label>
                    <input
                      v-model="uploadForms[doc.id].notaryName"
                      type="text"
                      class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-700 mb-1">Commission Number</label>
                    <input
                      v-model="uploadForms[doc.id].notaryCommission"
                      type="text"
                      class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-slate-700 mb-1">State</label>
                    <input
                      v-model="uploadForms[doc.id].notaryState"
                      type="text"
                      maxlength="2"
                      placeholder="e.g., WY"
                      class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-slate-700 mb-1">Expiration Date</label>
                    <input
                      v-model="uploadForms[doc.id].notaryExpiration"
                      type="date"
                      class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-medium text-slate-700 mb-1">Notes (optional)</label>
                  <textarea
                    v-model="uploadForms[doc.id].notes"
                    :rows="2"
                    class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                  ></textarea>
                </div>

                <button
                  @click="uploadNotarizedDocument(doc.id)"
                  :disabled="!uploadForms[doc.id].file || uploading"
                  class="w-full px-4 py-2 bg-[#C41E3A] text-white rounded-lg text-sm font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ uploading ? 'Uploading...' : 'Upload Notarized Document' }}
                </button>
              </div>
            </div>

            <!-- Completed -->
            <div v-if="doc.status === 'UPLOADED' || doc.status === 'COMPLETED'" class="bg-green-50 border border-green-200 p-3 rounded-lg">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <div class="ml-3 flex-1">
                  <h3 class="text-sm font-medium text-green-800">Notarization Complete</h3>
                  <div class="mt-1 text-sm text-green-700">
                    <p>Document has been notarized and uploaded.</p>
                    <div v-if="doc.notary_name" class="mt-2 text-xs space-y-1">
                      <p><strong>Notary:</strong> {{ doc.notary_name }}</p>
                      <p v-if="doc.notary_commission_number"><strong>Commission:</strong> {{ doc.notary_commission_number }}</p>
                      <p v-if="doc.notary_state"><strong>State:</strong> {{ doc.notary_state }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Timestamps -->
          <div class="mt-3 pt-3 border-t border-slate-200">
            <div class="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div v-if="doc.downloaded_at">
                <span class="font-medium">Downloaded:</span>
                {{ formatDate(doc.downloaded_at) }}
              </div>
              <div v-if="doc.uploaded_at">
                <span class="font-medium">Uploaded:</span>
                {{ formatDate(doc.uploaded_at) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-slate-900">No notary documents</h3>
        <p class="mt-1 text-sm text-slate-500">
          Documents requiring notarization will appear here.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  clientJourneyId?: string
  isStaff?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isStaff: false,
})

const notaryDocuments = ref<any[]>([])
const uploading = ref(false)
const uploadForms = ref<Record<string, any>>({})

onMounted(async () => {
  await loadNotaryDocuments()
})

const loadNotaryDocuments = async () => {
  try {
    // In production, fetch from API
    // const response = await $fetch(`/api/notary/documents?journeyId=${props.clientJourneyId}`)
    // notaryDocuments.value = response.documents || []
    
    // Sample data for now
    notaryDocuments.value = []
  } catch (error) {
    console.error('Failed to load notary documents:', error)
  }
}

const handleFileSelect = (event: Event, docId: string) => {
  const target = event.target as HTMLInputElement
  if (!uploadForms.value[docId]) {
    uploadForms.value[docId] = {}
  }
  uploadForms.value[docId].file = target.files?.[0]
}

const markAsDownloaded = async (docId: string) => {
  try {
    await $fetch('/api/notary/download', {
      method: 'POST',
      body: {
        documentId: docId,
        clientJourneyId: props.clientJourneyId,
      },
    })
    await loadNotaryDocuments()
  } catch (error) {
    console.error('Failed to mark as downloaded:', error)
    alert('Failed to update status. Please try again.')
  }
}

const uploadNotarizedDocument = async (docId: string) => {
  const form = uploadForms.value[docId]
  if (!form?.file) return

  uploading.value = true
  try {
    // In production, upload file to R2 first, then call API
    // For now, simulate
    const formData = new FormData()
    formData.append('file', form.file)
    
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    await $fetch('/api/notary/upload', {
      method: 'POST',
      body: {
        notaryRecordId: docId,
        notarizedPdfPath: '/path/to/uploaded/file.pdf', // From R2 upload
        notaryName: form.notaryName,
        notaryCommissionNumber: form.notaryCommission,
        notaryState: form.notaryState,
        notaryExpirationDate: form.notaryExpiration,
        notes: form.notes,
      },
    })

    await loadNotaryDocuments()
    delete uploadForms.value[docId]
  } catch (error) {
    console.error('Failed to upload:', error)
    alert('Failed to upload document. Please try again.')
  } finally {
    uploading.value = false
  }
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-slate-100 text-slate-800'
    case 'DOWNLOADED':
      return 'bg-blue-100 text-blue-800'
    case 'UPLOADED':
    case 'COMPLETED':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-slate-100 text-slate-800'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'Ready to Download'
    case 'DOWNLOADED':
      return 'Awaiting Notarization'
    case 'UPLOADED':
      return 'Notarized & Uploaded'
    case 'COMPLETED':
      return 'Complete'
    default:
      return status
  }
}

const getTimelineSteps = (status: string) => {
  const steps = [
    { complete: true },
    { complete: ['DOWNLOADED', 'UPLOADED', 'COMPLETED'].includes(status) },
    { complete: ['UPLOADED', 'COMPLETED'].includes(status) },
    { complete: status === 'COMPLETED' },
  ]
  return steps
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

