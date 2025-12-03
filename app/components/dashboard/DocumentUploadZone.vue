<template>
  <div class="space-y-4">
    <!-- Upload Zone -->
    <div
      @drop.prevent="handleDrop"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      :class="[
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
        isDragging 
          ? 'border-burgundy-500 bg-burgundy-50' 
          : 'border-gray-300 hover:border-gray-400'
      ]"
      @click="$refs.fileInput.click()"
    >
      <input
        ref="fileInput"
        type="file"
        :multiple="allowMultiple"
        :accept="acceptedTypes"
        @change="handleFileSelect"
        class="hidden"
      />

      <IconUpload class="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <p class="text-lg font-medium text-gray-900 mb-1">
        {{ isDragging ? 'Drop files here' : 'Click to upload or drag and drop' }}
      </p>
      <p class="text-sm text-gray-600">
        {{ acceptedTypesLabel }}
      </p>
      <p v-if="maxSize" class="text-xs text-gray-500 mt-1">
        Max file size: {{ formatFileSize(maxSize) }}
      </p>
    </div>

    <!-- Category Selection -->
    <div v-if="showCategorySelect">
      <label class="block text-sm font-medium text-gray-700 mb-2">Document Category</label>
      <select
        v-model="selectedCategory"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burgundy-500"
      >
        <option value="">-- Select Category --</option>
        <option value="Legal">Legal Documents</option>
        <option value="Financial">Financial Statements</option>
        <option value="Identity">Identity Documents</option>
        <option value="Address">Proof of Address</option>
        <option value="Other">Other</option>
      </select>
    </div>

    <!-- Upload Progress -->
    <div v-if="uploading" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-blue-900">Uploading {{ uploadingFileName }}...</span>
        <span class="text-sm text-blue-700">{{ uploadProgress }}%</span>
      </div>
      <div class="w-full bg-blue-200 rounded-full h-2">
        <div
          class="bg-blue-600 h-2 rounded-full transition-all"
          :style="{ width: uploadProgress + '%' }"
        ></div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex items-start">
        <IconAlertCircle class="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-sm font-medium text-red-900">Upload failed</p>
          <p class="text-sm text-red-700 mt-1">{{ errorMessage }}</p>
        </div>
      </div>
    </div>

    <!-- Uploaded Files List -->
    <div v-if="uploadedFiles.length > 0" class="space-y-2">
      <h4 class="text-sm font-medium text-gray-900">Uploaded Files</h4>
      <div
        v-for="file in uploadedFiles"
        :key="file.id"
        class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
      >
        <div class="flex items-center space-x-3">
          <IconCheck class="w-5 h-5 text-green-600" />
          <div>
            <p class="text-sm font-medium text-gray-900">{{ file.original_file_name }}</p>
            <p class="text-xs text-gray-600">{{ formatFileSize(file.file_size) }} • {{ file.document_category }}</p>
          </div>
        </div>
        <button
          @click="$emit('file-uploaded', file)"
          class="text-sm text-burgundy-600 hover:text-burgundy-700"
        >
          View
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Upload as IconUpload, AlertCircle as IconAlertCircle, Check as IconCheck } from 'lucide-vue-next'

const props = defineProps({
  clientJourneyId: {
    type: String,
    default: null
  },
  actionItemId: {
    type: String,
    default: null
  },
  allowMultiple: {
    type: Boolean,
    default: true
  },
  acceptedTypes: {
    type: String,
    default: '.pdf,.doc,.docx,.jpg,.jpeg,.png'
  },
  acceptedTypesLabel: {
    type: String,
    default: 'PDF, DOC, DOCX, JPG, PNG up to 10MB'
  },
  maxSize: {
    type: Number,
    default: 10 * 1024 * 1024 // 10MB
  },
  showCategorySelect: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['file-uploaded', 'upload-complete'])

const isDragging = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadingFileName = ref('')
const errorMessage = ref('')
const selectedCategory = ref('')
const uploadedFiles = ref([])

// Handle file drop
function handleDrop(e: DragEvent) {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  uploadFiles(files)
}

// Handle file selection
function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  uploadFiles(files)
}

// Upload files
async function uploadFiles(files: File[]) {
  errorMessage.value = ''
  
  for (const file of files) {
    // Validate file size
    if (props.maxSize && file.size > props.maxSize) {
      errorMessage.value = `File "${file.name}" exceeds maximum size of ${formatFileSize(props.maxSize)}`
      continue
    }

    // Upload file
    await uploadFile(file)
  }

  emit('upload-complete', uploadedFiles.value)
}

// Upload single file
async function uploadFile(file: File) {
  uploading.value = true
  uploadingFileName.value = file.name
  uploadProgress.value = 0

  try {
    const formData = new FormData()
    formData.append('file', file)
    if (props.clientJourneyId) {
      formData.append('clientJourneyId', props.clientJourneyId)
    }
    if (props.actionItemId) {
      formData.append('actionItemId', props.actionItemId)
    }
    if (selectedCategory.value) {
      formData.append('documentCategory', selectedCategory.value)
    }

    // Simulate progress (in real implementation, use XHR or fetch with progress tracking)
    const progressInterval = setInterval(() => {
      uploadProgress.value = Math.min(uploadProgress.value + 10, 90)
    }, 200)

    const { upload } = await $fetch('/api/document-uploads', {
      method: 'POST',
      body: formData
    })

    clearInterval(progressInterval)
    uploadProgress.value = 100

    uploadedFiles.value.push(upload)
    emit('file-uploaded', upload)

    // Reset after a short delay
    setTimeout(() => {
      uploading.value = false
      uploadProgress.value = 0
      uploadingFileName.value = ''
    }, 1000)
  } catch (error) {
    console.error('Upload error:', error)
    errorMessage.value = error.message || 'Failed to upload file'
    uploading.value = false
  }
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
</script>

