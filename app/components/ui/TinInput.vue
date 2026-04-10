<template>
  <div>
    <label
      v-if="label"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
    </label>
    <ClientOnly>
      <input
        ref="inputRef"
        v-maska:[maskOptions]
        type="text"
        :placeholder="placeholder"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-burgundy-500 focus:border-transparent font-mono tracking-wide"
        autocomplete="off"
        @maska="handleMaska"
      >
      <template #fallback>
        <input
          type="text"
          :placeholder="placeholder"
          disabled
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm opacity-50 font-mono"
        >
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { vMaska } from 'maska/vue'

const props = withDefaults(defineProps<{
  /** Raw digits (no formatting) — what gets sent to the API */
  modelValue: string
  /** 'ssn' for individuals (###-##-####), 'ein' for trusts/entities (##-#######) */
  format?: 'ssn' | 'ein'
  label?: string
}>(), {
  format: 'ssn'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

const maskOptions = computed(() => ({
  mask: props.format === 'ein' ? '##-#######' : '###-##-####',
  eager: true
}))

const placeholder = computed(() =>
  props.format === 'ein' ? '##-#######' : '###-##-####'
)

function handleMaska(event: CustomEvent) {
  // maska emits the unmasked (raw digits) value
  const unmasked = event.detail?.unmasked || ''
  emit('update:modelValue', unmasked)
}

// Set initial value when component mounts or modelValue changes externally
watch(() => props.modelValue, async (newVal) => {
  await nextTick()
  if (inputRef.value && newVal) {
    // Only update if the raw value differs from what's in the input
    const currentUnmasked = inputRef.value.value.replace(/\D/g, '')
    if (currentUnmasked !== newVal) {
      inputRef.value.value = newVal
      inputRef.value.dispatchEvent(new Event('input'))
    }
  }
}, { immediate: false })

onMounted(async () => {
  await nextTick()
  if (inputRef.value && props.modelValue) {
    inputRef.value.value = props.modelValue
    inputRef.value.dispatchEvent(new Event('input'))
  }
})
</script>
