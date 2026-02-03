<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Back link -->
    <NuxtLink
      to="/settings/integrations"
      class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
    >
      <ArrowLeft class="w-4 h-4 mr-1" />
      Back to Integrations
    </NuxtLink>

    <!-- Header -->
    <div class="flex items-start gap-4">
      <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
        <FileCode class="w-8 h-8 text-white" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">WealthCounsel Integration</h1>
        <p class="text-gray-600 mt-1">
          Import estate plans from WealthCounsel XML exports
        </p>
      </div>
    </div>

    <!-- Overview Card -->
    <UiCard>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">About This Integration</h2>
      <div class="prose prose-sm text-gray-600">
        <p>
          WealthCounsel is estate planning document drafting software used by many law firms.
          This integration allows you to import client estate plans from WealthCounsel XML exports.
        </p>
        <p class="mt-3">
          <strong>What gets imported:</strong>
        </p>
        <ul class="mt-2 space-y-1">
          <li>Client and spouse information</li>
          <li>Children and other family members</li>
          <li>Trust details (name, type, dates)</li>
          <li>Will information</li>
          <li>Fiduciary roles (trustees, agents, executors)</li>
          <li>Beneficiary designations</li>
        </ul>
      </div>
    </UiCard>

    <!-- Import Section -->
    <UiCard>
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Import Estate Plans</h2>
          <p class="text-gray-600 mt-1">
            Upload one or more WealthCounsel XML export files to import estate plans
          </p>
        </div>
        <NuxtLink to="/settings/integrations/wealthcounsel/import">
          <UiButton>
            <Upload class="w-4 h-4 mr-2" />
            Start Import
          </UiButton>
        </NuxtLink>
      </div>

      <!-- Pending Imports (not yet completed) -->
      <div v-if="pendingImports.length > 0" class="mt-6 pt-6 border-t border-gray-200">
        <h3 class="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Clock class="w-4 h-4" />
          Pending Imports (Not Yet Saved)
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          These files have been parsed but not imported. Resume to complete the import or discard to remove them.
        </p>
        <div class="space-y-3">
          <div
            v-for="pending in pendingImports"
            :key="pending.parseId"
            class="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <Pause class="w-5 h-5 text-amber-500" />
              <div>
                <p class="font-medium text-gray-900">{{ pending.clientName }}</p>
                <p class="text-sm text-gray-500">
                  {{ pending.planName || (pending.planType === 'TRUST_BASED' ? 'Trust-Based Plan' : 'Will-Based Plan') }}
                </p>
                <p class="text-xs text-amber-600" v-if="pending.expiresIn">
                  Expires in {{ pending.expiresIn }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <NuxtLink
                :to="`/settings/integrations/wealthcounsel/import?resume=${pending.parseId}`"
                class="text-sm text-burgundy-600 hover:underline"
              >
                Resume
              </NuxtLink>
              <button
                @click="discardPending(pending.parseId)"
                class="text-sm text-red-600 hover:underline"
                :disabled="discarding === pending.parseId"
              >
                {{ discarding === pending.parseId ? 'Discarding...' : 'Discard' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Completed Imports -->
      <div v-if="recentImports.length > 0" class="mt-6 pt-6 border-t border-gray-200">
        <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Recent Imports
        </h3>
        <div class="space-y-3">
          <div
            v-for="importRecord in recentImports"
            :key="importRecord.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <CheckCircle class="w-5 h-5 text-green-500" />
              <div>
                <p class="font-medium text-gray-900">{{ importRecord.planName }}</p>
                <p class="text-sm text-gray-500">{{ formatDate(importRecord.importedAt) }}</p>
              </div>
            </div>
            <NuxtLink
              v-if="importRecord.planId"
              :to="`/estate-plans/${importRecord.planId}`"
              class="text-sm text-burgundy-600 hover:underline"
            >
              View Plan
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Empty state for no imports -->
      <div v-else-if="pendingImports.length === 0" class="mt-6 pt-6 border-t border-gray-200 text-center py-8 text-gray-500">
        <FileText class="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No imports yet</p>
        <p class="text-sm mt-2">Import your first estate plan from WealthCounsel</p>
      </div>
    </UiCard>

    <!-- How to Export from WealthCounsel -->
    <UiCard>
      <h2 class="text-lg font-semibold text-gray-900 mb-4">How to Export from WealthCounsel</h2>
      <ol class="space-y-4 text-gray-600">
        <li class="flex gap-3">
          <span class="flex-shrink-0 w-6 h-6 bg-burgundy-100 text-burgundy-700 rounded-full flex items-center justify-center text-sm font-medium">1</span>
          <div>
            <p class="font-medium text-gray-900">Open the client file</p>
            <p class="text-sm">In WealthCounsel, open the client matter you want to export</p>
          </div>
        </li>
        <li class="flex gap-3">
          <span class="flex-shrink-0 w-6 h-6 bg-burgundy-100 text-burgundy-700 rounded-full flex items-center justify-center text-sm font-medium">2</span>
          <div>
            <p class="font-medium text-gray-900">Export the data</p>
            <p class="text-sm">Go to File &rarr; Export &rarr; Export Data (XML format)</p>
          </div>
        </li>
        <li class="flex gap-3">
          <span class="flex-shrink-0 w-6 h-6 bg-burgundy-100 text-burgundy-700 rounded-full flex items-center justify-center text-sm font-medium">3</span>
          <div>
            <p class="font-medium text-gray-900">Save the XML file</p>
            <p class="text-sm">Save the file to your computer. You can export multiple clients.</p>
          </div>
        </li>
        <li class="flex gap-3">
          <span class="flex-shrink-0 w-6 h-6 bg-burgundy-100 text-burgundy-700 rounded-full flex items-center justify-center text-sm font-medium">4</span>
          <div>
            <p class="font-medium text-gray-900">Import here</p>
            <p class="text-sm">Click "Start Import" above and upload your XML file(s)</p>
          </div>
        </li>
      </ol>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowLeft, FileCode, Upload, FileText, CheckCircle, AlertCircle, Clock, Pause } from 'lucide-vue-next'

const toast = useToast()

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

interface ImportRecord {
  id: string
  planName: string
  planId?: string
  status: 'completed' | 'error' | 'pending'
  importedAt: string
}

interface PendingImport {
  parseId: string
  clientName: string
  planName?: string
  planType: string
  createdAt: string
  expiresIn?: string
}

const recentImports = ref<ImportRecord[]>([])
const pendingImports = ref<PendingImport[]>([])
const loading = ref(true)
const discarding = ref<string | null>(null)

async function fetchData() {
  loading.value = true
  try {
    // Fetch pending imports
    const pendingResponse = await $fetch<{ sessions: PendingImport[] }>(
      '/api/admin/integrations/wealthcounsel/pending'
    )
    pendingImports.value = pendingResponse.sessions || []

    // Fetch recent completed imports
    const recentResponse = await $fetch<{ imports: ImportRecord[] }>(
      '/api/admin/integrations/wealthcounsel/recent'
    )
    recentImports.value = recentResponse.imports || []
  } catch (error) {
    console.error('Failed to fetch import data:', error)
  } finally {
    loading.value = false
  }
}

async function discardPending(parseId: string) {
  if (!confirm('Are you sure you want to discard this pending import? The parsed data will be deleted.')) {
    return
  }

  discarding.value = parseId
  try {
    await $fetch(`/api/admin/integrations/wealthcounsel/pending/${parseId}`, {
      method: 'DELETE'
    })
    // Remove from list
    pendingImports.value = pendingImports.value.filter(p => p.parseId !== parseId)
  } catch (error: any) {
    toast.error(`Failed to discard: ${error.data?.message || error.message || 'Unknown error'}`)
  } finally {
    discarding.value = null
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchData()
})
</script>
