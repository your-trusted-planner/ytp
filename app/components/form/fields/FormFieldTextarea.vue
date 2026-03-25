<template>
  <div>
    <label
      v-if="field.label"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ field.label }}
      <span v-if="field.isRequired" class="text-red-500">*</span>
    </label>
    <textarea
      :value="typeof modelValue === 'string' ? modelValue : ''"
      :placeholder="config?.placeholder"
      :required="field.isRequired"
      :disabled="disabled"
      rows="4"
      class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 sm:text-sm"
      :class="error ? 'border-red-300' : ''"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
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
