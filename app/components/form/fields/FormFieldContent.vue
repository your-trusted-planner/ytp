<template>
  <div
    class="prose prose-sm max-w-none"
    v-html="safeHtml"
  />
</template>

<script setup lang="ts">
import type { FormField, FormFieldValue, ContentFieldConfig } from '~/types/form'
import { sanitizeHtml } from '~/utils/html-sanitize'

const props = defineProps<{
  field: FormField
  modelValue: FormFieldValue
  error?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: FormFieldValue]
}>()

const safeHtml = computed(() =>
  sanitizeHtml((props.field.config as ContentFieldConfig)?.html || '')
)
</script>
