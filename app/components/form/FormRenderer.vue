<template>
  <div class="space-y-6">
    <!-- Section Progress -->
    <FormSectionProgress
      :sections="definition.sections"
      :current-index="currentSectionIndex"
      :total-sections="definition.sections.length"
      @go-to="goToSection"
    />

    <!-- Current Section -->
    <div v-if="currentSection">
      <!-- Section Header -->
      <div v-if="currentSection.title || currentSection.description" class="mb-6">
        <h3
          v-if="currentSection.title"
          class="text-lg font-semibold text-gray-900"
        >
          {{ currentSection.title }}
        </h3>
        <p
          v-if="currentSection.description"
          class="text-sm text-gray-500 mt-1"
        >
          {{ currentSection.description }}
        </p>
      </div>

      <!-- Fields (12-column grid) -->
      <div class="grid grid-cols-12 gap-x-4 gap-y-5">
        <div
          v-for="field in visibleFields"
          :key="field.id"
          :class="colSpanClass(field.colSpan)"
        >
          <component
            :is="getFieldComponent(field.fieldType)"
            :field="field"
            :model-value="values[field.id] ?? null"
            :error="errors[field.id]"
            :disabled="disabled || submitting"
            :scheduler-context="schedulerContext"
            @update:model-value="setValue(field.id, $event)"
            @slot-selected="onSchedulerSlotSelected"
          />
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex items-center justify-between pt-4 border-t border-gray-100">
      <div>
        <UiButton
          v-if="!isFirstSection"
          variant="outline"
          :disabled="submitting"
          @click="goPrev"
        >
          Back
        </UiButton>
      </div>
      <div>
        <UiButton
          v-if="!isLastSection"
          :disabled="submitting"
          @click="goNext"
        >
          Next
        </UiButton>
        <UiButton
          v-else
          :disabled="submitting"
          :is-loading="submitting"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FIELD_REGISTRY } from './fields'
import { evaluateConditions, validateField } from '~/utils/form-logic'
import type {
  FormDefinition,
  FormSection,
  FormField,
  FormFieldValue,
  FormSubmissionPayload,
  SchedulerContext,
  SchedulerSlotValue,
  PersonFieldTarget
} from '~/types/form'

const props = withDefaults(defineProps<{
  definition: FormDefinition
  schedulerContext?: SchedulerContext
  submitLabel?: string
  submitting?: boolean
  disabled?: boolean
}>(), {
  submitLabel: 'Submit',
  submitting: false,
  disabled: false
})

const emit = defineEmits<{
  submit: [payload: FormSubmissionPayload]
  'section-change': [index: number]
}>()

// ── State ────────────────────────────────────────────────────────────────────

const currentSectionIndex = ref(0)
const values = ref<Record<string, FormFieldValue>>({})
const errors = ref<Record<string, string>>({})
const schedulerSlot = ref<SchedulerSlotValue | null>(null)

// ── Computed ─────────────────────────────────────────────────────────────────

const currentSection = computed<FormSection | undefined>(() =>
  props.definition.sections[currentSectionIndex.value]
)

const isFirstSection = computed(() => currentSectionIndex.value === 0)
const isLastSection = computed(() => currentSectionIndex.value === props.definition.sections.length - 1)

const visibleFields = computed<FormField[]>(() => {
  if (!currentSection.value) return []
  return currentSection.value.fields.filter(f =>
    evaluateConditions(f.conditionalLogic, values.value)
  )
})

// ── Grid Layout ──────────────────────────────────────────────────────────────

const COL_SPAN_CLASSES: Record<number, string> = {
  1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4',
  5: 'col-span-5', 6: 'col-span-6', 7: 'col-span-7', 8: 'col-span-8',
  9: 'col-span-9', 10: 'col-span-10', 11: 'col-span-11', 12: 'col-span-12'
}

function colSpanClass(span?: number): string {
  return COL_SPAN_CLASSES[span || 12] || 'col-span-12'
}

// ── Field Registry ───────────────────────────────────────────────────────────

function getFieldComponent(fieldType: string) {
  return FIELD_REGISTRY[fieldType as keyof typeof FIELD_REGISTRY] || FIELD_REGISTRY.text
}

// ── Value Management ─────────────────────────────────────────────────────────

function setValue(fieldId: string, value: FormFieldValue) {
  values.value[fieldId] = value
  // Clear error on change
  if (errors.value[fieldId]) {
    delete errors.value[fieldId]
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

function validateCurrentSection(): boolean {
  const sectionErrors: Record<string, string> = {}
  let valid = true

  for (const field of visibleFields.value) {
    const error = validateField(field, values.value[field.id] ?? null)
    if (error) {
      sectionErrors[field.id] = error
      valid = false
    }
  }

  errors.value = { ...errors.value, ...sectionErrors }
  return valid
}

// ── Navigation ───────────────────────────────────────────────────────────────

function goNext() {
  if (!validateCurrentSection()) return

  if (currentSectionIndex.value < props.definition.sections.length - 1) {
    currentSectionIndex.value++
    emit('section-change', currentSectionIndex.value)
  }
}

function goPrev() {
  if (currentSectionIndex.value > 0) {
    currentSectionIndex.value--
    emit('section-change', currentSectionIndex.value)
  }
}

function goToSection(index: number) {
  // Only allow going backwards (forwards requires validation)
  if (index < currentSectionIndex.value) {
    currentSectionIndex.value = index
    emit('section-change', index)
  }
}

// ── Scheduler ────────────────────────────────────────────────────────────────

function onSchedulerSlotSelected(slot: { startTime: string; endTime: string }) {
  // Find the scheduler field to get the appointmentTypeId
  const schedulerField = props.definition.sections
    .flatMap(s => s.fields)
    .find(f => f.fieldType === 'scheduler')

  const config = schedulerField?.config as { appointmentTypeId?: string } | undefined

  schedulerSlot.value = {
    startTime: slot.startTime,
    endTime: slot.endTime,
    timezone: props.schedulerContext?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    attorneyId: props.schedulerContext?.attorneyIds?.[0],
    appointmentTypeId: config?.appointmentTypeId || ''
  }
}

// ── Submission ───────────────────────────────────────────────────────────────

function handleSubmit() {
  if (!validateCurrentSection()) return

  // Extract person fields from mappings
  const personFields: Partial<Record<PersonFieldTarget, string>> = {}
  const allFields = props.definition.sections.flatMap(s => s.fields)

  for (const field of allFields) {
    if (field.personFieldMapping && values.value[field.id]) {
      const val = values.value[field.id]
      if (typeof val === 'string' && val.trim()) {
        personFields[field.personFieldMapping] = val.trim()
      }
    }
  }

  // Build clean responses (exclude hidden fields)
  const allVisibleFieldIds = new Set(
    props.definition.sections.flatMap(s =>
      s.fields
        .filter(f => evaluateConditions(f.conditionalLogic, values.value))
        .map(f => f.id)
    )
  )

  const responses: Record<string, FormFieldValue> = {}
  for (const [fieldId, value] of Object.entries(values.value)) {
    if (allVisibleFieldIds.has(fieldId)) {
      responses[fieldId] = value
    }
  }

  emit('submit', {
    responses,
    personFields,
    schedulerSlot: schedulerSlot.value || undefined
  })
}

// ── Reset on definition change ───────────────────────────────────────────────

watch(() => props.definition.id, () => {
  currentSectionIndex.value = 0
  values.value = {}
  errors.value = {}
  schedulerSlot.value = null
})
</script>
