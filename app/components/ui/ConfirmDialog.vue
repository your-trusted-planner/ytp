<template>
  <UiModal
    :model-value="modelValue"
    :title="title"
    size="sm"
    :close-on-backdrop="!loading"
    :show-close="!loading"
    @update:model-value="handleCancel"
  >
    <p class="text-sm text-gray-600">
      {{ message }}
    </p>

    <template #footer>
      <UiButton
        variant="ghost"
        :disabled="loading"
        @click="handleCancel"
      >
        {{ cancelText }}
      </UiButton>
      <UiButton
        :variant="variant === 'danger' ? 'danger' : 'primary'"
        :loading="loading"
        @click="$emit('confirm')"
      >
        {{ confirmText }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'default'
  loading?: boolean
}>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'default',
  loading: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function handleCancel() {
  if (props.loading) return
  emit('update:modelValue', false)
  emit('cancel')
}
</script>
