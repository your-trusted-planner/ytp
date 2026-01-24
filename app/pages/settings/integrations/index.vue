<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Integrations</h1>
      <p class="text-gray-600 mt-1">Manage external service integrations and data imports</p>
    </div>

    <div class="grid gap-6">
      <!-- Lawmatics Integration Card -->
      <UiCard>
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database class="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Lawmatics</h3>
              <p class="text-sm text-gray-600 mt-1">
                Import clients, matters, notes, and activities from Lawmatics CRM
              </p>
              <div class="flex items-center gap-4 mt-3">
                <UiBadge v-if="lawmaticsStatus === 'connected'" variant="success">
                  Connected
                </UiBadge>
                <UiBadge v-else-if="lawmaticsStatus === 'error'" variant="danger">
                  Connection Error
                </UiBadge>
                <UiBadge v-else variant="default">
                  Not Configured
                </UiBadge>
                <span v-if="lastSync" class="text-xs text-gray-500">
                  Last sync: {{ formatDate(lastSync) }}
                </span>
              </div>
            </div>
          </div>
          <NuxtLink
            to="/settings/integrations/lawmatics"
            class="px-4 py-2 text-sm font-medium text-burgundy-600 hover:text-burgundy-700 hover:bg-burgundy-50 rounded-lg transition-colors"
          >
            Configure
          </NuxtLink>
        </div>
      </UiCard>

      <!-- Placeholder for future integrations -->
      <UiCard class="opacity-60">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Cloud class="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-500">More Integrations</h3>
              <p class="text-sm text-gray-400 mt-1">
                Additional integrations coming soon
              </p>
            </div>
          </div>
          <span class="px-3 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full">
            Coming Soon
          </span>
        </div>
      </UiCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Database, Cloud } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard'
})

const lawmaticsStatus = ref<'connected' | 'error' | 'not_configured'>('not_configured')
const lastSync = ref<string | null>(null)

// Fetch integration status
onMounted(async () => {
  try {
    const { integrations } = await $fetch<{ integrations: any[] }>('/api/admin/integrations')
    const lawmatics = integrations.find(i => i.type === 'lawmatics')
    if (lawmatics) {
      lawmaticsStatus.value = lawmatics.status === 'CONNECTED' ? 'connected' :
                              lawmatics.status === 'ERROR' ? 'error' : 'not_configured'
      if (lawmatics.lastSyncTimestamps) {
        const timestamps = JSON.parse(lawmatics.lastSyncTimestamps)
        const latest = Object.values(timestamps).sort().pop() as string | undefined
        lastSync.value = latest || null
      }
    }
  } catch {
    // User may not have access or integrations not set up
  }
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
</script>
