<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="inputId"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500"
      >*</span>
    </label>
    <input
      :id="inputId"
      ref="inputRef"
      type="tel"
      :value="displayValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      autocomplete="tel"
      :class="inputClasses"
      @input="handleInput"
      @blur="handleBlur"
      @focus="emit('focus', $event)"
    >
    <p
      v-if="error"
      class="mt-1 text-sm text-red-600"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      class="mt-1 text-sm text-gray-500"
    >
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useId } from 'vue'
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js'
import { cn } from '~/utils/cn'

interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  country?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '(303) 555-1234',
  required: false,
  disabled: false,
  country: 'US'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'blur': [event: Event]
  'focus': [event: Event]
}>()

const inputId = `phone-${useId()}`
const inputRef = ref<HTMLInputElement | null>(null)
const displayValue = ref('')

const inputClasses = computed(() => {
  return cn(
    'block w-full rounded-lg border-gray-300 shadow-sm focus:border-accent-500 focus:ring-accent-500 sm:text-sm',
    props.error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
    props.disabled ? 'bg-gray-100 cursor-not-allowed' : '',
    props.class
  )
})

function formatAsYouType(raw: string): string {
  const formatter = new AsYouType(props.country as any)
  return formatter.input(raw)
}

function toRawDigits(value: string): string {
  return value.replace(/[^\d+]/g, '')
}

function handleInput(event: Event) {
  const input = event.target as HTMLInputElement
  const raw = input.value
  const cursorPos = input.selectionStart ?? raw.length

  // Count digits before cursor in the raw input
  const digitsBefore = raw.slice(0, cursorPos).replace(/[^\d]/g, '').length

  // Format
  const formatted = formatAsYouType(raw)
  displayValue.value = formatted

  // Emit the raw digits (E.164 or plain digits) for storage
  const digits = toRawDigits(formatted)
  emit('update:modelValue', digits)

  // Restore cursor position based on digit count
  nextTick(() => {
    if (!inputRef.value) return
    let digitsSeen = 0
    let newPos = 0
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        digitsSeen++
        if (digitsSeen === digitsBefore) {
          newPos = i + 1
          break
        }
      }
    }
    if (digitsBefore === 0) newPos = 0
    if (digitsSeen < digitsBefore) newPos = formatted.length
    inputRef.value.setSelectionRange(newPos, newPos)
  })
}

function handleBlur(event: Event) {
  // On blur, try to format as a complete number
  const digits = toRawDigits(displayValue.value)
  if (digits.length >= 10) {
    const parsed = parsePhoneNumberFromString(digits, props.country as any)
    if (parsed?.isValid()) {
      displayValue.value = parsed.formatNational()
      emit('update:modelValue', digits)
    }
  }
  emit('blur', event)
}

// Sync from parent modelValue
watch(() => props.modelValue, (val) => {
  if (!val) {
    displayValue.value = ''
    return
  }
  // Don't re-format if the input is currently focused (user is typing)
  if (document.activeElement === inputRef.value) return
  displayValue.value = formatAsYouType(val)
}, { immediate: true })
</script>
