<template>
  <div class="flex items-center">
    <button
      type="button"
      :class="[
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-burgundy-600 focus:ring-offset-2',
        modelValue ? 'bg-burgundy-600' : 'bg-gray-200'
      ]"
      role="switch"
      :aria-checked="modelValue"
      @click="toggle"
    >
      <span
        :class="[
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          modelValue ? 'translate-x-5' : 'translate-x-0'
        ]"
      />
    </button>
    <label v-if="label" @click="toggle" class="ml-3 text-sm cursor-pointer">
      <span class="font-medium text-gray-900">{{ label }}</span>
      <span v-if="description" class="text-gray-500 block">{{ description }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  label?: string
  description?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function toggle() {
  emit('update:modelValue', !props.modelValue)
}
</script>
