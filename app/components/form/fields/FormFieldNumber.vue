<template>
  <UiInput
    :model-value="modelValue != null ? String(modelValue) : ''"
    type="number"
    :label="field.label"
    :placeholder="config?.placeholder"
    :hint="config?.helpText"
    :required="field.isRequired"
    :error="error"
    :disabled="disabled"
    @update:model-value="$emit('update:modelValue', $event === '' ? null : Number($event))"
  />
</template>

<script setup lang="ts">
import type { FormField, FormFieldValue, BaseFieldConfig, NumberFieldConfig } from '~/types/form'

const props = defineProps<{
  field: FormField
  modelValue: FormFieldValue
  error?: string
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: FormFieldValue]
}>()

const config = computed(() => (props.field.config || {}) as BaseFieldConfig & NumberFieldConfig)
</script>
