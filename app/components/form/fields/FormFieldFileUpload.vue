<template>
  <div>
    <label
      v-if="field.label"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ field.label }}
      <span v-if="field.isRequired" class="text-red-500">*</span>
    </label>
    <div
      class="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
      :class="[
        error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      ]"
      @click="!disabled && ($refs.fileInput as HTMLInputElement)?.click()"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <div v-if="fileName" class="text-sm text-gray-700">
        <span class="font-medium">{{ fileName }}</span>
        <button
          v-if="!disabled"
          type="button"
          class="ml-2 text-xs text-red-500 hover:text-red-700"
          @click.stop="clearFile"
        >
          Remove
        </button>
      </div>
      <div v-else>
        <p class="text-sm text-gray-500">
          Click to upload or drag and drop
        </p>
        <p v-if="acceptLabel" class="text-xs text-gray-400 mt-1">
          {{ acceptLabel }}
        </p>
      </div>
    </div>
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :accept="acceptAttr"
      :disabled="disabled"
      @change="onFileSelect"
    >
    <p v-if="config?.helpText" class="mt-1 text-xs text-gray-500">{{ config.helpText }}</p>
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import type { FormField, FormFieldValue, FileUploadFieldConfig } from '~/types/form'

const props = defineProps<{
  field: FormField
  modelValue: FormFieldValue
  error?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FormFieldValue]
}>()

const config = computed(() => (props.field.config || {}) as FileUploadFieldConfig)
const acceptAttr = computed(() => config.value.accept?.join(',') || undefined)
const acceptLabel = computed(() => {
  const parts: string[] = []
  if (config.value.accept?.length) parts.push(config.value.accept.join(', '))
  if (config.value.maxSizeMb) parts.push(`Max ${config.value.maxSizeMb}MB`)
  return parts.join(' | ')
})

const fileName = ref<string | null>(null)

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    fileName.value = file.name
    // Store file name as the value; actual upload handled by parent on submission
    emit('update:modelValue', file.name)
  }
}

function onDrop(e: DragEvent) {
  if (props.disabled) return
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    fileName.value = file.name
    emit('update:modelValue', file.name)
  }
}

function clearFile() {
  fileName.value = null
  emit('update:modelValue', null)
}
</script>
