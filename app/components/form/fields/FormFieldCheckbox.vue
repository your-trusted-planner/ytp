<template>
  <div>
    <label
      v-if="field.label"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ field.label }}
      <span v-if="field.isRequired" class="text-red-500">*</span>
    </label>
    <div class="space-y-2">
      <label
        v-for="option in options"
        :key="option"
        class="flex items-center gap-2 text-sm"
      >
        <input
          type="checkbox"
          :value="option"
          :checked="selectedValues.includes(option)"
          :disabled="disabled"
          class="rounded border-gray-300 text-accent-600 focus:ring-accent-500"
          @change="toggleOption(option)"
        >
        <span class="text-gray-700">{{ option }}</span>
      </label>
    </div>
    <p v-if="config?.helpText" class="mt-1 text-xs text-gray-500">{{ config.helpText }}</p>
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import type { FormField, FormFieldValue, SelectFieldConfig } from '~/types/form'

const props = defineProps<{
  field: FormField
  modelValue: FormFieldValue
  error?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FormFieldValue]
}>()

const config = computed(() => (props.field.config || {}) as SelectFieldConfig)
const options = computed(() => config.value.options || [])
const selectedValues = computed(() => Array.isArray(props.modelValue) ? props.modelValue as string[] : [])

function toggleOption(option: string) {
  const current = [...selectedValues.value]
  const idx = current.indexOf(option)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(option)
  }
  emit('update:modelValue', current)
}
</script>
