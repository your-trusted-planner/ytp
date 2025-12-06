<template>
  <div :class="containerClasses" v-html="renderedContent" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import { cn } from '~/utils/cn'

interface Props {
  content: string
  class?: string
}

const props = defineProps<Props>()

// Configure marked for security
marked.setOptions({
  breaks: true,
  gfm: true
})

const renderedContent = computed(() => {
  if (!props.content) return ''
  return marked.parse(props.content)
})

const containerClasses = computed(() => {
  return cn(
    'prose prose-slate max-w-none',
    // Headings
    'prose-headings:text-navy prose-headings:font-semibold',
    'prose-h1:text-3xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-4 prose-h1:mb-6',
    'prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4',
    'prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3',
    // Links
    'prose-a:text-burgundy prose-a:no-underline hover:prose-a:underline',
    // Tables
    'prose-table:border prose-table:border-gray-200',
    'prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:border prose-th:border-gray-200',
    'prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-gray-200',
    // Lists
    'prose-li:my-1',
    // Code
    'prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono',
    'prose-pre:bg-gray-900 prose-pre:text-gray-100',
    // Blockquotes
    'prose-blockquote:border-l-4 prose-blockquote:border-burgundy prose-blockquote:bg-gray-50 prose-blockquote:py-2 prose-blockquote:px-4',
    props.class
  )
})
</script>

<style scoped>
/* Additional styling for markdown content */
:deep(hr) {
  @apply my-8 border-gray-200;
}

:deep(img) {
  @apply rounded-lg shadow-sm;
}

:deep(table) {
  @apply w-full;
}
</style>
