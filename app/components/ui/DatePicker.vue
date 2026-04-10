<template>
  <div>
    <label
      v-if="label"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
    </label>
    <ClientOnly>
      <VueDatePicker
        :model-value="internalValue"
        :time-config="{ enableTimePicker: false }"
        :week-start="preferencesStore.weekStart"
        :auto-apply="true"
        :format="displayFormat"
        :placeholder="placeholder || 'Select date'"
        :clearable="clearable"
        :disabled="disabled"
        :max-date="resolvedMaxDate"
        :min-date="resolvedMinDate"
        input-class-name="ui-datepicker-input"
        menu-class-name="ui-datepicker-menu"
        @update:model-value="handleUpdate"
      />
      <template #fallback>
        <input
          type="text"
          :value="modelValue"
          :placeholder="placeholder || 'Select date'"
          disabled
          class="ui-datepicker-input opacity-50"
        >
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const preferencesStore = usePreferencesStore()

const props = withDefaults(defineProps<{
  /** ISO date string (YYYY-MM-DD) or empty string */
  modelValue: string
  label?: string
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
  /** Disallow dates after this (Date or ISO string). Shorthand: 'today' */
  maxDate?: Date | string
  /** Disallow dates before this (Date or ISO string) */
  minDate?: Date | string
}>(), {
  clearable: true,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Convert ISO string to Date for the picker
const internalValue = computed(() => {
  if (!props.modelValue) return null
  const d = new Date(props.modelValue + 'T00:00:00') // Force local timezone
  return isNaN(d.getTime()) ? null : d
})

const displayFormat = 'MM/dd/yyyy'

// Resolve max/min date props
const resolvedMaxDate = computed(() => {
  if (!props.maxDate) return undefined
  if (props.maxDate === 'today') return new Date()
  return props.maxDate instanceof Date ? props.maxDate : new Date(props.maxDate)
})

const resolvedMinDate = computed(() => {
  if (!props.minDate) return undefined
  return props.minDate instanceof Date ? props.minDate : new Date(props.minDate)
})

function handleUpdate(value: Date | null) {
  if (!value) {
    emit('update:modelValue', '')
    return
  }
  // Output as ISO date string YYYY-MM-DD
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  emit('update:modelValue', `${year}-${month}-${day}`)
}
</script>

<style>
/* Style the input to match the rest of the form */
.ui-datepicker-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: #111827;
  background-color: white;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.ui-datepicker-input:focus {
  outline: none;
  border-color: transparent;
  box-shadow: 0 0 0 2px rgba(128, 0, 32, 0.5); /* burgundy focus ring */
}

.ui-datepicker-input::placeholder {
  color: #9ca3af;
}

/* Keep the popup clean */
.ui-datepicker-menu {
  font-family: inherit;
}
</style>
