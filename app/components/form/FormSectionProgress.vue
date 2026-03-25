<template>
  <div
    v-if="totalSections > 1"
    class="flex items-center gap-2 mb-6"
  >
    <template
      v-for="(section, idx) in sections"
      :key="section.id"
    >
      <!-- Connector line -->
      <div
        v-if="idx > 0"
        class="flex-1 h-0.5 transition-colors"
        :class="idx <= currentIndex ? 'bg-accent-500' : 'bg-gray-200'"
      />
      <!-- Step dot -->
      <button
        type="button"
        class="flex items-center gap-2 shrink-0"
        :disabled="idx > currentIndex"
        @click="idx < currentIndex && $emit('go-to', idx)"
      >
        <span
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
          :class="[
            idx < currentIndex ? 'bg-accent-500 text-white cursor-pointer hover:bg-accent-600' : '',
            idx === currentIndex ? 'bg-accent-500 text-white ring-2 ring-accent-200' : '',
            idx > currentIndex ? 'bg-gray-200 text-gray-500' : ''
          ]"
        >
          <span v-if="idx < currentIndex">&#10003;</span>
          <span v-else>{{ idx + 1 }}</span>
        </span>
        <span
          v-if="section.title"
          class="text-sm hidden sm:inline"
          :class="idx === currentIndex ? 'font-medium text-gray-900' : 'text-gray-500'"
        >
          {{ section.title }}
        </span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FormSection } from '~/types/form'

defineProps<{
  sections: FormSection[]
  currentIndex: number
  totalSections: number
}>()

defineEmits<{
  'go-to': [index: number]
}>()
</script>
