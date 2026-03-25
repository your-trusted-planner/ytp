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
          type="radio"
          :name="field.id"
          :value="option"
          :checked="modelValue === option"
          :disabled="disabled"
          class="text-accent-600 focus:ring-accent-500"
          @change="$emit('update:modelValue', option)"
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

defineEmits<{
  'update:modelValue': [value: FormFieldValue]
}>()

const config = computed(() => (props.field.config || {}) as SelectFieldConfig)
const options = computed(() => config.value.options || [])
</script>
