<template>
  <NuxtLink
    :to="`/dashboard/help?topic=${topic}`"
    :title="title || 'Get help'"
    class="inline-flex items-center justify-center text-gray-400 hover:text-burgundy-500 transition-colors"
    :class="sizeClasses"
  >
    <HelpCircle :class="iconClasses" />
    <span v-if="label" class="ml-1 text-sm">{{ label }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HelpCircle } from 'lucide-vue-next'

interface Props {
  topic: string
  title?: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'p-0.5'
    case 'lg':
      return 'p-2'
    default:
      return 'p-1'
  }
})

const iconClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-4 h-4'
    case 'lg':
      return 'w-6 h-6'
    default:
      return 'w-5 h-5'
  }
})
</script>
