<template>
  <div>
    <label
      v-if="field.label"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ field.label }}
      <span v-if="field.isRequired" class="text-red-500">*</span>
    </label>
    <select
      :value="typeof modelValue === 'string' ? modelValue : ''"
      :required="field.isRequired"
      :disabled="disabled"
      class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 sm:text-sm"
      :class="error ? 'border-red-300' : ''"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">
        {{ config?.placeholder || 'Select...' }}
      </option>
      <option
        v-for="option in options"
        :key="option"
        :value="option"
      >
        {{ option }}
      </option>
    </select>
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

defineEmits<{
  'update:modelValue': [value: FormFieldValue]
}>()

const config = computed(() => (props.field.config || {}) as SelectFieldConfig)
const options = computed(() => config.value.options || [])
</script>
