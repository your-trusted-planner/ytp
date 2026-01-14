<template>
  <div class="signature-image-manager">
    <div class="bg-white rounded-lg border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-900 mb-2">Stored Signature</h3>
      <p class="text-sm text-slate-600 mb-6">
        Upload a signature image to reuse across documents. You'll need to confirm adoption of your signature each time you sign.
      </p>

      <!-- Current Signature Preview -->
      <div v-if="signatureImage" class="mb-6">
        <div class="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <p class="text-sm font-medium text-slate-700 mb-3">Current Signature:</p>
          <div class="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-center min-h-[100px]">
            <img
              :src="signatureImage"
              alt="Your stored signature"
              class="max-h-24 max-w-full object-contain"
            />
          </div>
          <p v-if="updatedAt" class="text-xs text-slate-500 mt-2">
            Last updated: {{ formatDate(updatedAt) }}
          </p>
        </div>

        <div class="flex gap-3 mt-4">
          <button
            type="button"
            @click="triggerFileUpload"
            class="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
          >
            Replace Signature
          </button>
          <button
            type="button"
            @click="confirmDelete = true"
            class="px-4 py-2 text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      <!-- Upload Area (no signature yet) -->
      <div v-else>
        <div
          class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
          :class="isDragging
            ? 'border-[#C41E3A] bg-red-50'
            : 'border-slate-300 hover:border-[#C41E3A] hover:bg-slate-50'"
          @click="triggerFileUpload"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleFileDrop"
        >
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p class="text-slate-700 font-medium mb-1">Upload Signature Image</p>
          <p class="text-sm text-slate-500">PNG, JPG, or SVG up to 500KB</p>
          <p class="text-xs text-slate-400 mt-2">Click or drag and drop</p>
        </div>
      </div>

      <!-- Hidden File Input -->
      <input
        ref="fileInputRef"
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        class="hidden"
        @change="handleFileSelect"
      />

      <!-- Loading State -->
      <div v-if="isLoading" class="mt-4 flex items-center justify-center py-4">
        <svg class="animate-spin h-6 w-6 text-[#C41E3A] mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-slate-600">{{ loadingMessage }}</span>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-start">
          <svg class="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-start">
          <svg class="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-green-700">{{ successMessage }}</p>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="confirmDelete"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="confirmDelete = false"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 class="text-lg font-semibold text-slate-900 mb-2">Remove Signature?</h3>
          <p class="text-slate-600 mb-6">
            Are you sure you want to remove your stored signature? You'll need to draw or upload a new one when signing documents.
          </p>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="confirmDelete = false"
              class="px-4 py-2 text-slate-700 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="deleteSignature"
              :disabled="isLoading"
              class="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {{ isLoading ? 'Removing...' : 'Remove Signature' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  'updated': [hasSignature: boolean]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const signatureImage = ref<string | null>(null)
const updatedAt = ref<string | null>(null)
const isLoading = ref(false)
const loadingMessage = ref('')
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isDragging = ref(false)
const confirmDelete = ref(false)

// Fetch current signature on mount
onMounted(async () => {
  await fetchSignature()
})

async function fetchSignature() {
  isLoading.value = true
  loadingMessage.value = 'Loading signature...'
  error.value = null

  try {
    const response = await $fetch('/api/users/me/signature-image', {
      method: 'GET'
    })

    if (response.success) {
      signatureImage.value = response.data.signatureImage
      updatedAt.value = response.data.updatedAt
    }
  } catch (err: any) {
    // Silent fail on fetch - user just doesn't have a signature
    console.log('No stored signature found')
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
}

function triggerFileUpload() {
  fileInputRef.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    processFile(file)
  }
  // Reset input so same file can be selected again
  input.value = ''
}

function handleFileDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    processFile(file)
  }
}

async function processFile(file: File) {
  error.value = null
  successMessage.value = null

  // Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    error.value = 'Please upload a PNG, JPG, or SVG file.'
    return
  }

  // Validate file size (500KB)
  if (file.size > 500 * 1024) {
    error.value = 'File too large. Maximum size is 500KB.'
    return
  }

  isLoading.value = true
  loadingMessage.value = 'Processing image...'

  try {
    // Convert to data URL
    const dataUrl = await readFileAsDataURL(file)

    // Save to server
    loadingMessage.value = 'Saving signature...'
    const response = await $fetch('/api/users/me/signature-image', {
      method: 'POST',
      body: {
        signatureImage: dataUrl
      }
    })

    if (response.success) {
      signatureImage.value = dataUrl
      updatedAt.value = response.data.updatedAt
      successMessage.value = 'Signature saved successfully!'
      emit('updated', true)

      // Clear success message after 3 seconds
      setTimeout(() => {
        successMessage.value = null
      }, 3000)
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to save signature. Please try again.'
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
}

async function deleteSignature() {
  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch('/api/users/me/signature-image', {
      method: 'DELETE'
    })

    if (response.success) {
      signatureImage.value = null
      updatedAt.value = null
      confirmDelete.value = false
      successMessage.value = 'Signature removed successfully.'
      emit('updated', false)

      setTimeout(() => {
        successMessage.value = null
      }, 3000)
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to remove signature. Please try again.'
  } finally {
    isLoading.value = false
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
