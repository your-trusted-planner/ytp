<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Seed WYDAPT Documents</h1>
      <p class="text-gray-600 mt-1">Import all WYDAPT documents and create the journey template</p>
    </div>

    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <div v-if="!seeding && !result" class="space-y-4">
        <p class="text-gray-700">
          This will import 28 documents from the WYDAPT DOCS folder and create:
        </p>
        <ul class="list-disc list-inside space-y-2 text-gray-700">
          <li>1 WYDAPT Matter ($18,500)</li>
          <li>1 Journey Template with 7 steps</li>
          <li>28 Document Templates with variables</li>
        </ul>
        <div class="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p class="text-sm text-yellow-800">
            <strong>Note:</strong> This will add new records to the database. Only run this once.
          </p>
        </div>
        <div class="pt-4">
          <button
            @click="seedDocuments"
            class="px-6 py-3 bg-burgundy-600 text-white font-medium rounded-lg hover:bg-burgundy-700 transition-colors"
          >
            Start Import
          </button>
        </div>
      </div>

      <div v-if="seeding" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-burgundy-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Importing documents... This may take a minute.</p>
      </div>

      <div v-if="result && !seeding" class="space-y-4">
        <div v-if="result.success" class="bg-green-50 border border-green-200 rounded p-4">
          <h3 class="text-lg font-semibold text-green-900 mb-2">✅ Import Successful!</h3>
          <div class="space-y-1 text-sm text-green-800">
            <p><strong>Matter ID:</strong> {{ result.matterId }}</p>
            <p><strong>Journey ID:</strong> {{ result.journeyId }}</p>
            <p><strong>Steps Created:</strong> {{ result.stepsCreated }}</p>
            <p><strong>Documents Imported:</strong> {{ result.documentsImported }}</p>
          </div>
        </div>

        <div class="bg-gray-50 border border-gray-200 rounded p-4">
          <h4 class="font-semibold text-gray-900 mb-2">Import Log:</h4>
          <pre class="text-xs text-gray-700 overflow-auto max-h-96 whitespace-pre-wrap">{{ result.log }}</pre>
        </div>

        <div class="pt-4">
          <button
            @click="result = null"
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

const seeding = ref(false)
const result = ref(null)

async function seedDocuments() {
  seeding.value = true
  try {
    const response = await $fetch('/api/admin/seed-wydapt', {
      method: 'POST'
    })
    result.value = response
  } catch (error) {
    result.value = {
      success: false,
      log: `Error: ${error.message}`
    }
  } finally {
    seeding.value = false
  }
}
</script>

