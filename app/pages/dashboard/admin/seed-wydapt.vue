<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Seed WYDAPT Documents</h1>
      <p class="text-gray-600 mt-1">Upload and import WYDAPT documents to create the journey template</p>
    </div>

    <!-- Step 1: Upload Documents -->
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Step 1: Upload Documents to R2</h2>

      <div v-if="!uploading && !uploadResult" class="space-y-4">
        <p class="text-gray-700">
          Upload DOCX documents organized by group. Each group corresponds to a journey step.
        </p>

        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Document Group
            </label>
            <select
              v-model="selectedGroup"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="General-Documents">General Documents</option>
              <option value="Trust-Documents">Trust Documents</option>
              <option value="Wyoming-Private-Family-Trust-Documents">Wyoming Private Family Trust Documents</option>
              <option value="Non-Charitable-Specific-Purpose-Trust-Documents">Non Charitable Specific Purpose Trust Documents</option>
              <option value="Investment-Decisions">Investment Decisions</option>
              <option value="Contributions-to-Trust">Contributions to Trust</option>
              <option value="Distributions-From-Trust">Distributions From Trust</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              DOCX Files
            </label>
            <input
              ref="fileInput"
              type="file"
              multiple
              accept=".docx"
              @change="onFilesSelected"
              class="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <p class="text-xs text-gray-500 mt-1">
              {{ selectedFiles.length }} file(s) selected
            </p>
          </div>
        </div>

        <button
          @click="uploadDocuments"
          :disabled="selectedFiles.length === 0"
          class="px-6 py-3 bg-burgundy-600 text-white font-medium rounded-lg hover:bg-burgundy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Upload Documents
        </button>
      </div>

      <div v-if="uploading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-burgundy-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Uploading documents...</p>
      </div>

      <div v-if="uploadResult && !uploading" class="space-y-4">
        <div class="bg-green-50 border border-green-200 rounded p-4">
          <h3 class="text-lg font-semibold text-green-900 mb-2">✅ Upload Successful!</h3>
          <p class="text-sm text-green-800">
            Uploaded {{ uploadResult.uploaded }} documents to R2
          </p>
        </div>

        <div v-if="uploadResult.errors && uploadResult.errors.length > 0" class="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h4 class="font-semibold text-yellow-900 mb-2">⚠️ Errors:</h4>
          <ul class="text-sm text-yellow-800 space-y-1">
            <li v-for="error in uploadResult.errors" :key="error.filename">
              {{ error.filename }}: {{ error.error }}
            </li>
          </ul>
        </div>

        <button
          @click="resetUpload"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Upload More Documents
        </button>
      </div>
    </div>

    <!-- Step 2: Seed Database -->
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-gray-900">Step 2: Process Documents &amp; Create Templates</h2>
        <button
          v-if="!seeding && !seedResult"
          @click="cleanupWydapt"
          :disabled="cleaning"
          class="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {{ cleaning ? 'Cleaning...' : 'Clean Up Partial Data' }}
        </button>
      </div>

      <div v-if="!seeding && !seedResult" class="space-y-4">
        <p class="text-gray-700">
          After uploading all documents, process them to create:
        </p>
        <ul class="list-disc list-inside space-y-2 text-gray-700">
          <li>1 WYDAPT Matter ($18,500)</li>
          <li>1 Journey Template with 7 steps</li>
          <li>Document Templates with extracted variables</li>
        </ul>
        <div class="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p class="text-sm text-yellow-800">
            <strong>Note:</strong> Make sure all documents are uploaded before running this step.
          </p>
        </div>
        <div class="pt-4">
          <button
            @click="seedDocuments"
            class="px-6 py-3 bg-burgundy-600 text-white font-medium rounded-lg hover:bg-burgundy-700 transition-colors"
          >
            Process &amp; Import
          </button>
        </div>
      </div>

      <div v-if="seeding" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-burgundy-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Processing documents... This may take a minute.</p>
      </div>

      <div v-if="seedResult && !seeding" class="space-y-4">
        <div v-if="seedResult.success" class="bg-green-50 border border-green-200 rounded p-4">
          <h3 class="text-lg font-semibold text-green-900 mb-2">✅ Import Successful!</h3>
          <div class="space-y-1 text-sm text-green-800">
            <p><strong>Matter ID:</strong> {{ seedResult.matterId }}</p>
            <p><strong>Journey ID:</strong> {{ seedResult.journeyId }}</p>
            <p><strong>Steps Created:</strong> {{ seedResult.stepsCreated }}</p>
            <p><strong>Documents Imported:</strong> {{ seedResult.documentsImported }}</p>
          </div>
        </div>

        <div v-if="!seedResult.success" class="bg-red-50 border border-red-200 rounded p-4">
          <h3 class="text-lg font-semibold text-red-900 mb-2">❌ Import Failed</h3>
          <p class="text-sm text-red-800">{{ seedResult.message }}</p>
        </div>

        <div v-if="seedResult.errors && seedResult.errors.length > 0" class="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h4 class="font-semibold text-yellow-900 mb-2">⚠️ Errors ({{ seedResult.errors.length }}):</h4>
          <ul class="text-sm text-yellow-800 space-y-1 max-h-48 overflow-auto">
            <li v-for="(error, i) in seedResult.errors" :key="i">{{ error }}</li>
          </ul>
        </div>

        <div v-if="seedResult.log" class="bg-gray-50 border border-gray-200 rounded p-4">
          <h4 class="font-semibold text-gray-900 mb-2">Import Log:</h4>
          <pre class="text-xs text-gray-700 overflow-auto max-h-96 whitespace-pre-wrap">{{ seedResult.log }}</pre>
        </div>

        <div class="pt-4">
          <button
            @click="seedResult = null"
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const selectedGroup = ref('General-Documents')
const selectedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement>()

const uploading = ref(false)
const uploadResult = ref<any>(null)

const seeding = ref(false)
const seedResult = ref<any>(null)

const cleaning = ref(false)

function onFilesSelected(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value = Array.from(target.files)
  }
}

function resetUpload() {
  uploadResult.value = null
  selectedFiles.value = []
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function uploadDocuments() {
  if (selectedFiles.value.length === 0) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('group', selectedGroup.value)

    for (const file of selectedFiles.value) {
      formData.append('documents', file)
    }

    const response = await $fetch('/api/admin/upload-seed-documents', {
      method: 'POST',
      body: formData
    })

    uploadResult.value = response
  } catch (error: any) {
    uploadResult.value = {
      success: false,
      uploaded: 0,
      errors: [{ filename: 'Upload', error: error.message || 'Upload failed' }]
    }
  } finally {
    uploading.value = false
  }
}

async function seedDocuments() {
  seeding.value = true
  try {
    const response = await $fetch('/api/admin/seed-wydapt', {
      method: 'POST'
    })
    seedResult.value = response
  } catch (error: any) {
    seedResult.value = {
      success: false,
      message: error.data?.message || error.message || 'Seeding failed',
      log: error.data?.log || `Error: ${error.message}`
    }
  } finally {
    seeding.value = false
  }
}

async function cleanupWydapt() {
  if (!confirm('This will delete the WYDAPT matter, journey, steps, and templates. Continue?')) {
    return
  }

  cleaning.value = true
  try {
    const response = await $fetch('/api/admin/cleanup-wydapt', {
      method: 'POST'
    })
    alert(`Cleanup successful!\n\n${response.log}`)
  } catch (error: any) {
    alert(`Cleanup failed: ${error.message || 'Unknown error'}`)
  } finally {
    cleaning.value = false
  }
}
</script>
