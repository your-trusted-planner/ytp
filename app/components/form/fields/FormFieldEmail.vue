<template>
  <UiInput
    :model-value="typeof modelValue === 'string' ? modelValue : ''"
    type="email"
    :label="field.label"
    :placeholder="config?.placeholder || 'email@example.com'"
    :hint="config?.helpText"
    :required="field.isRequired"
    :error="error"
    :disabled="disabled"
    @update:model-value="$emit('update:modelValue', $event)"
  />
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
