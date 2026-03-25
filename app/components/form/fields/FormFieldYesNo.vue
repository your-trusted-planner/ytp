<template>
  <div>
    <label
      v-if="field.label"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ field.label }}
      <span v-if="field.isRequired" class="text-red-500">*</span>
    </label>
    <div class="flex gap-3">
      <button
        type="button"
        :disabled="disabled"
        class="flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors"
        :class="modelValue === 'yes'
          ? 'border-accent-600 bg-accent-50 text-accent-700'
          : 'border-gray-200 text-gray-600 hover:border-gray-300'"
        @click="$emit('update:modelValue', 'yes')"
      >
        Yes
      </button>
      <button
        type="button"
        :disabled="disabled"
        class="flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors"
        :class="modelValue === 'no'
          ? 'border-accent-600 bg-accent-50 text-accent-700'
          : 'border-gray-200 text-gray-600 hover:border-gray-300'"
        @click="$emit('update:modelValue', 'no')"
      >
        No
      </button>
    </div>
    <p v-if="config?.helpText" class="mt-1 text-xs text-gray-500">{{ config.helpText }}</p>
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import type { FormField, FormFieldValue, BaseFieldConfig } from '~/types/form'

const props = defineProps<{
  field: FormField
  modelValue: FormFieldValue
  error?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: FormFieldValue]
}>()

const config = computed(() => (props.field.config || {}) as BaseFieldConfig)
</script>
