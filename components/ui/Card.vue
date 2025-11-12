<template>
  <div :class="cardClasses">
    <div v-if="$slots.header || title" class="px-6 py-4 border-b border-gray-200">
      <slot name="header">
        <h3 v-if="title" class="text-lg font-semibold text-gray-900">{{ title }}</h3>
        <p v-if="description" class="text-sm text-gray-600 mt-1">{{ description }}</p>
      </slot>
    </div>
    <div :class="contentClasses">
      <slot />
    </div>
    <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-200 bg-gray-50">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '~/utils/cn'

interface Props {
  title?: string
  description?: string
  padding?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  padding: true
})

const cardClasses = computed(() => {
  return cn('bg-white rounded-lg shadow-sm border border-gray-200', props.class)
})

const contentClasses = computed(() => {
  return props.padding ? 'p-6' : ''
})
</script>

