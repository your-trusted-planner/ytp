<template>
  <div
    v-if="matches.length > 0"
    class="rounded-lg border border-amber-300 bg-amber-50 p-3"
  >
    <div class="flex items-start gap-2">
      <AlertTriangle class="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-amber-800">
          Possible {{ matches.length === 1 ? 'duplicate' : 'duplicates' }} found
        </p>
        <button
          v-if="matches.some(m => m.confidence === 'high') && !acknowledged"
          type="button"
          class="mt-1 text-xs font-medium text-amber-800 underline hover:text-amber-900"
          @click="$emit('acknowledge')"
        >
          I've reviewed these &mdash; create anyway
        </button>
        <div class="mt-2 space-y-1.5">
          <div
            v-for="match in matches"
            :key="match.personId"
            class="flex items-center justify-between bg-white rounded border border-amber-200 px-2 py-1.5"
          >
            <div class="min-w-0">
              <span class="text-sm font-medium text-gray-900">{{ match.personName }}</span>
              <span
                class="ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium"
                :class="match.confidence === 'high'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'"
              >
                {{ match.adjustedScore }}% {{ match.confidence }}
              </span>
              <span class="ml-1.5 text-xs text-gray-500">
                {{ match.topFields.map(f => f.field).join(', ') }}
              </span>
            </div>
            <NuxtLink
              :to="`/people/${match.personId}`"
              target="_blank"
              class="text-xs text-burgundy-600 hover:text-burgundy-800 whitespace-nowrap ml-2"
            >
              View &rarr;
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import type { DuplicateMatch } from '~/composables/useDuplicateCheck'

defineProps<{
  matches: DuplicateMatch[]
  acknowledged: boolean
}>()

defineEmits<{
  acknowledge: []
}>()
</script>
