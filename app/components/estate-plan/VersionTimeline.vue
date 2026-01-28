<template>
  <div class="flow-root">
    <ul role="list" class="-mb-8">
      <li v-for="(version, index) in sortedVersions" :key="version.id">
        <div class="relative pb-8">
          <!-- Connecting line -->
          <span
            v-if="index !== sortedVersions.length - 1"
            class="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
            aria-hidden="true"
          />

          <div class="relative flex space-x-3">
            <!-- Icon -->
            <div>
              <span
                class="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white"
                :class="changeTypeStyles[version.changeType]?.bg || 'bg-gray-400'"
              >
                <component
                  :is="changeTypeStyles[version.changeType]?.icon || FileText"
                  class="h-4 w-4 text-white"
                />
              </span>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900">
                  Version {{ version.version }}
                  <span class="ml-2 text-gray-500 font-normal">
                    {{ changeTypeLabels[version.changeType] || version.changeType }}
                  </span>
                </p>
                <time class="text-sm text-gray-500">
                  {{ formatDate(version.effectiveDate) }}
                </time>
              </div>

              <p v-if="version.changeSummary" class="mt-1 text-sm text-gray-600">
                {{ version.changeSummary }}
              </p>

              <p v-if="version.changeDescription" class="mt-1 text-sm text-gray-500">
                {{ version.changeDescription }}
              </p>

              <p v-if="version.createdBy" class="mt-2 text-xs text-gray-400">
                By {{ version.createdBy }}
              </p>
            </div>
          </div>
        </div>
      </li>
    </ul>

    <!-- Empty state -->
    <div v-if="versions.length === 0" class="text-center py-8 text-gray-500">
      <History class="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p>No version history</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FileText, FilePlus, Edit, RefreshCw, CheckCircle, History } from 'lucide-vue-next'

// Define type to work with API response
interface VersionData {
  id: string
  version: number
  changeType: string
  changeDescription: string | null
  changeSummary: string | null
  effectiveDate: string | null
  sourceType: string | null
  createdAt: string
  createdBy?: string | null
}

interface Props {
  versions: VersionData[]
}

const props = defineProps<Props>()

const changeTypeLabels: Record<string, string> = {
  CREATION: 'Created',
  AMENDMENT: 'Amendment',
  RESTATEMENT: 'Restated',
  CORRECTION: 'Correction',
  ADMIN_UPDATE: 'Admin Update'
}

const changeTypeStyles: Record<string, { bg: string; icon: any }> = {
  CREATION: { bg: 'bg-green-500', icon: FilePlus },
  AMENDMENT: { bg: 'bg-blue-500', icon: Edit },
  RESTATEMENT: { bg: 'bg-purple-500', icon: RefreshCw },
  CORRECTION: { bg: 'bg-yellow-500', icon: CheckCircle },
  ADMIN_UPDATE: { bg: 'bg-gray-500', icon: FileText }
}

const sortedVersions = computed(() => {
  return [...props.versions].sort((a, b) => b.version - a.version)
})

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
