<template>
  <div class="bg-white rounded-lg shadow-sm border border-slate-200">
    <!-- Header -->
    <div class="border-b border-slate-200 px-6 py-4">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="text-lg font-semibold text-slate-900">Document Package Summary</h3>
          <p class="text-sm text-slate-600 mt-1">
            Review the document selections for your trust
          </p>
        </div>
        <span
          v-if="!summary?.isFinal"
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
        >
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
          Payment Required to View Full Documents
        </span>
        <span
          v-else
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
        >
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          Documents Unlocked
        </span>
      </div>
    </div>

    <!-- Summary Content -->
    <div v-if="summary" class="p-6">
      <!-- Package Information -->
      <div v-if="summary.summaryData.packages" class="mb-6">
        <h4 class="text-sm font-semibold text-slate-700 mb-3">Selected Packages</h4>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="pkg in summary.summaryData.packages"
            :key="pkg.id"
            class="inline-flex items-center px-3 py-1 rounded-lg bg-[#0A2540] text-white text-sm font-medium"
          >
            Package {{ pkg.number }}: {{ pkg.name }}
          </span>
        </div>
      </div>

      <!-- Document List -->
      <div class="space-y-4">
        <h4 class="text-sm font-semibold text-slate-700">Documents Included</h4>
        
        <div
          v-for="(doc, index) in summary.summaryData.documents"
          :key="index"
          class="border border-slate-200 rounded-lg p-4 hover:border-[#C41E3A] transition-colors"
        >
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
              <h5 class="font-medium text-slate-900">{{ doc.name }}</h5>
              <p v-if="doc.category" class="text-xs text-slate-500 mt-1">{{ doc.category }}</p>
            </div>
            <div class="flex items-center space-x-2">
              <span
                v-if="doc.requiresNotary"
                class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800"
              >
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                Notary Required
              </span>
            </div>
          </div>

          <!-- Document Selections/Choices -->
          <div v-if="doc.selections" class="mt-3 space-y-2 bg-slate-50 rounded-lg p-3">
            <p class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Your Selections:
            </p>
            <div
              v-for="(value, key) in doc.selections"
              :key="key"
              class="flex justify-between text-sm"
            >
              <span class="text-slate-600 capitalize">{{ formatKey(key) }}:</span>
              <span class="font-medium text-slate-900">
                {{ Array.isArray(value) ? value.join(', ') : value }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment CTA (if not final) -->
      <div v-if="!summary.isFinal" class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3 flex-1">
            <h3 class="text-sm font-medium text-amber-800">Payment Required</h3>
            <div class="mt-2 text-sm text-amber-700">
              <p>
                To view the full documents and proceed with signing, please complete the remaining
                payment of <strong>${{ remainingPayment / 100 }}</strong>.
              </p>
            </div>
            <div class="mt-4">
              <button
                @click="$emit('proceed-to-payment')"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#C41E3A] hover:bg-[#a31830] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C41E3A]"
              >
                Complete Payment
                <svg class="ml-2 -mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Full Documents Access (if final) -->
      <div v-else class="mt-6">
        <button
          @click="$emit('view-documents')"
          class="w-full px-6 py-3 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors flex items-center justify-center"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          View All Documents
        </button>
      </div>
    </div>

    <!-- No Summary -->
    <div v-else class="p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      <h3 class="mt-2 text-sm font-medium text-slate-900">No summary available</h3>
      <p class="mt-1 text-sm text-slate-500">
        Your document summary will be generated after package selection.
      </p>
    </div>

    <!-- Metadata Footer -->
    <div v-if="summary" class="border-t border-slate-200 px-6 py-3 bg-slate-50">
      <div class="flex justify-between text-xs text-slate-500">
        <span>Generated: {{ formatDate(summary.generatedAt) }}</span>
        <span v-if="summary.viewedAt">Viewed: {{ formatDate(summary.viewedAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  summary: any
  remainingPayment?: number
}

const props = withDefaults(defineProps<Props>(), {
  remainingPayment: 925000, // $9,250 default
})

defineEmits(['proceed-to-payment', 'view-documents'])

const formatKey = (key: string) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

