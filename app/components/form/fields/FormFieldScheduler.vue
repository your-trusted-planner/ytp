<template>
  <div>
    <label
      v-if="field.label"
      class="block text-sm font-medium text-gray-700 mb-2"
    >
      {{ field.label }}
      <span v-if="field.isRequired" class="text-red-500">*</span>
    </label>

    <div v-if="!schedulerConfig?.appointmentTypeId" class="text-sm text-gray-500 italic">
      No appointment type configured for this scheduler field.
    </div>

    <div v-else-if="selectedSlot" class="rounded-lg border border-green-200 bg-green-50 p-4">
      <p class="text-sm font-medium text-green-800">
        {{ formatSlotTime(selectedSlot.startTime) }}
      </p>
      <button
        v-if="!disabled"
        type="button"
        class="mt-2 text-xs text-blue-600 underline"
        @click="clearSlot"
      >
        Pick a different time
      </button>
    </div>

    <SlotPicker
      v-else-if="attorneyId"
      :attorney-id="attorneyId"
      :timezone="schedulerContext?.timezone"
      :appointment-type-id="schedulerConfig.appointmentTypeId"
      @select="onSlotSelected"
    />

    <div v-else class="text-sm text-gray-500 italic">
      Select a staff member to see available times.
    </div>

    <p v-if="config?.helpText" class="mt-1 text-xs text-gray-500">{{ config.helpText }}</p>
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import type { FormField, FormFieldValue, SchedulerFieldConfig, SchedulerContext, BaseFieldConfig } from '~/types/form'
import SlotPicker from '~/components/booking/SlotPicker.vue'

const props = defineProps<{
  field: FormField
  modelValue: FormFieldValue
  error?: string
  disabled?: boolean
  schedulerContext?: SchedulerContext
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FormFieldValue]
  'slot-selected': [slot: { startTime: string; endTime: string }]
}>()

const schedulerConfig = computed(() => (props.field.config || {}) as SchedulerFieldConfig)
const config = computed(() => (props.field.config || {}) as BaseFieldConfig)

const attorneyId = computed(() => props.schedulerContext?.attorneyIds?.[0] || null)

const selectedSlot = ref<{ startTime: string; endTime: string } | null>(null)

// Restore from modelValue if it's a JSON string
watch(() => props.modelValue, (val) => {
  if (typeof val === 'string' && val.includes('{')) {
    try {
      selectedSlot.value = JSON.parse(val)
    } catch { /* ignore */ }
  }
}, { immediate: true })

function onSlotSelected(slot: { startTime: string; endTime: string }) {
  selectedSlot.value = slot
  emit('update:modelValue', JSON.stringify(slot))
  emit('slot-selected', slot)
}

function clearSlot() {
  selectedSlot.value = null
  emit('update:modelValue', null)
}

function formatSlotTime(iso: string): string {
  const tz = props.schedulerContext?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz
  })
}
</script>
