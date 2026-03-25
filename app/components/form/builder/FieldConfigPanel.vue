<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold text-gray-800">
        Field Settings
      </h4>
      <button
        type="button"
        class="text-xs text-gray-400 hover:text-gray-600"
        @click="$emit('close')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Label (hidden for content blocks) -->
    <UiInput
      v-if="field.fieldType !== 'content'"
      :model-value="field.label"
      label="Label"
      required
      @update:model-value="update({ label: $event })"
    />

    <!-- Required (not applicable to content blocks) -->
    <div
      v-if="field.fieldType !== 'content'"
      class="flex items-center gap-2"
    >
      <input
        :checked="field.isRequired"
        type="checkbox"
        class="rounded border-gray-300 text-accent-600 focus:ring-accent-500"
        @change="update({ isRequired: ($event.target as HTMLInputElement).checked })"
      >
      <label class="text-sm text-gray-700">Required field</label>
    </div>

    <!-- Width -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Width</label>
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors"
          :class="(field.colSpan || 12) === 6 ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
          @click="update({ colSpan: 6 })"
        >
          Half
        </button>
        <button
          type="button"
          class="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors"
          :class="(field.colSpan || 12) === 12 ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
          @click="update({ colSpan: 12 })"
        >
          Full
        </button>
      </div>
    </div>

    <!-- Placeholder / Help Text (not for content blocks) -->
    <template v-if="field.fieldType !== 'content'">
      <UiInput
        :model-value="config.placeholder || ''"
        label="Placeholder"
        @update:model-value="updateConfig({ placeholder: $event || undefined })"
      />
      <UiInput
        :model-value="config.helpText || ''"
        label="Help Text"
        hint="Shown below the field"
        @update:model-value="updateConfig({ helpText: $event || undefined })"
      />
    </template>

    <!-- Options (for select, multi_select, radio, checkbox) -->
    <div v-if="hasOptions" class="space-y-2">
      <label class="block text-sm font-medium text-gray-700">Options</label>
      <div
        v-for="(option, idx) in options"
        :key="idx"
        class="flex items-center gap-2"
      >
        <input
          :value="option"
          type="text"
          class="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
          @input="updateOption(idx, ($event.target as HTMLInputElement).value)"
        >
        <button
          v-if="options.length > 1"
          type="button"
          class="text-gray-400 hover:text-red-500 p-1"
          @click="removeOption(idx)"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        type="button"
        class="text-xs text-accent-600 hover:text-accent-700 font-medium"
        @click="addOption"
      >
        + Add option
      </button>
    </div>

    <!-- Number: min/max -->
    <div
      v-if="field.fieldType === 'number'"
      class="grid grid-cols-2 gap-3"
    >
      <UiInput
        :model-value="config.min != null ? String(config.min) : ''"
        label="Min"
        type="number"
        @update:model-value="updateConfig({ min: $event ? Number($event) : undefined })"
      />
      <UiInput
        :model-value="config.max != null ? String(config.max) : ''"
        label="Max"
        type="number"
        @update:model-value="updateConfig({ max: $event ? Number($event) : undefined })"
      />
    </div>

    <!-- Content Block: rich text editor -->
    <div v-if="field.fieldType === 'content'">
      <UiRichTextEditor
        :model-value="config.html || ''"
        label="Content"
        hint="Rich text displayed inline with the form"
        @update:model-value="updateConfig({ html: $event })"
      />
    </div>

    <!-- File Upload: accept, max size -->
    <div
      v-if="field.fieldType === 'file_upload'"
      class="space-y-3"
    >
      <UiInput
        :model-value="(config.accept || []).join(', ')"
        label="Accepted File Types"
        placeholder="image/*, application/pdf"
        hint="Comma-separated MIME types"
        @update:model-value="updateConfig({ accept: $event ? $event.split(',').map((s: string) => s.trim()) : undefined })"
      />
      <UiInput
        :model-value="config.maxSizeMb != null ? String(config.maxSizeMb) : ''"
        label="Max File Size (MB)"
        type="number"
        @update:model-value="updateConfig({ maxSizeMb: $event ? Number($event) : undefined })"
      />
    </div>

    <!-- Scheduler: appointment type -->
    <div v-if="field.fieldType === 'scheduler'">
      <label class="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
      <select
        :value="config.appointmentTypeId || ''"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
        @change="updateConfig({ appointmentTypeId: ($event.target as HTMLSelectElement).value || undefined })"
      >
        <option value="">
          Select appointment type...
        </option>
        <option
          v-for="at in appointmentTypes"
          :key="at.id"
          :value="at.id"
        >
          {{ at.name }}
        </option>
      </select>
    </div>

    <!-- Person Field Mapping (not for content blocks) -->
    <div v-if="field.fieldType !== 'content'">
      <label class="block text-sm font-medium text-gray-700 mb-1">Person Field Mapping</label>
      <select
        :value="field.personFieldMapping || ''"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent"
        @change="update({ personFieldMapping: (($event.target as HTMLSelectElement).value || undefined) as any })"
      >
        <option value="">
          None
        </option>
        <option
          v-for="pf in personFieldOptions"
          :key="pf.value"
          :value="pf.value"
        >
          {{ pf.label }}
        </option>
      </select>
      <p class="mt-1 text-xs text-gray-500">
        Map this field to a person record column for auto-creation
      </p>
    </div>

    <!-- Conditional Logic (simplified) -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="block text-sm font-medium text-gray-700">Conditional Logic</label>
        <button
          v-if="!field.conditionalLogic"
          type="button"
          class="text-xs text-accent-600 hover:text-accent-700 font-medium"
          @click="addCondition"
        >
          + Add condition
        </button>
        <button
          v-else
          type="button"
          class="text-xs text-red-500 hover:text-red-700 font-medium"
          @click="removeCondition"
        >
          Remove
        </button>
      </div>
      <div
        v-if="field.conditionalLogic"
        class="border rounded-lg p-3 bg-gray-50 space-y-2"
      >
        <div class="flex items-center gap-2 text-sm">
          <select
            :value="field.conditionalLogic.action"
            class="px-2 py-1 border border-gray-300 rounded text-sm"
            @change="updateConditionAction(($event.target as HTMLSelectElement).value as 'show' | 'hide')"
          >
            <option value="show">Show</option>
            <option value="hide">Hide</option>
          </select>
          <span class="text-gray-500">this field when</span>
          <select
            :value="field.conditionalLogic.match"
            class="px-2 py-1 border border-gray-300 rounded text-sm"
            @change="updateConditionMatch(($event.target as HTMLSelectElement).value as 'all' | 'any')"
          >
            <option value="all">all</option>
            <option value="any">any</option>
          </select>
          <span class="text-gray-500">of:</span>
        </div>
        <div
          v-for="(rule, idx) in field.conditionalLogic.rules"
          :key="idx"
          class="space-y-1.5 p-2 bg-white border border-gray-200 rounded"
        >
          <div class="flex items-center gap-2">
            <select
              :value="rule.fieldId"
              class="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm min-w-0"
              @change="updateRule(idx, { fieldId: ($event.target as HTMLSelectElement).value })"
            >
              <option value="">
                Select field...
              </option>
              <option
                v-for="f in otherFields"
                :key="f.id"
                :value="f.id"
              >
                {{ f.label }}
              </option>
            </select>
            <button
              type="button"
              class="text-gray-400 hover:text-red-500 p-0.5 flex-shrink-0"
              @click="removeRule(idx)"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
          <div class="flex items-center gap-2">
            <select
              :value="rule.operator"
              class="px-2 py-1.5 border border-gray-300 rounded text-sm"
              @change="updateRule(idx, { operator: ($event.target as HTMLSelectElement).value as ConditionalRule['operator'] })"
            >
              <option value="eq">equals</option>
              <option value="neq">not equals</option>
              <option value="is_not_empty">is filled</option>
              <option value="is_empty">is empty</option>
            </select>
            <!-- Value: dropdown if referenced field has options, text otherwise -->
            <template v-if="rule.operator === 'eq' || rule.operator === 'neq'">
              <select
                v-if="getRuleFieldOptions(rule.fieldId).length > 0"
                :value="rule.value || ''"
                class="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm min-w-0"
                @change="updateRule(idx, { value: ($event.target as HTMLSelectElement).value })"
              >
                <option value="">
                  Select value...
                </option>
                <option
                  v-for="opt in getRuleFieldOptions(rule.fieldId)"
                  :key="opt"
                  :value="opt"
                >
                  {{ opt }}
                </option>
              </select>
              <input
                v-else
                :value="rule.value || ''"
                type="text"
                class="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm min-w-0"
                placeholder="value"
                @input="updateRule(idx, { value: ($event.target as HTMLInputElement).value })"
              >
            </template>
          </div>
        </div>
        <button
          type="button"
          class="text-xs text-accent-600 hover:text-accent-700 font-medium"
          @click="addRule"
        >
          + Add rule
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { PERSON_FIELD_OPTIONS } from '~/types/form'
import type { FormField, ConditionalLogic, ConditionalRule } from '~/types/form'

const props = defineProps<{
  field: FormField
  allFields: FormField[]
  appointmentTypes?: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  'update-field': [updates: Partial<FormField>]
  close: []
}>()

const personFieldOptions = PERSON_FIELD_OPTIONS

const hasOptions = computed(() =>
  ['select', 'multi_select', 'radio', 'checkbox'].includes(props.field.fieldType)
)

const options = computed(() => (props.field.config as any)?.options || [])

const config = computed(() => (props.field.config || {}) as Record<string, any>)

const otherFields = computed(() =>
  props.allFields.filter(f => f.id !== props.field.id)
)

/** Get the predefined options for a referenced field (for condition value dropdowns) */
function getRuleFieldOptions(fieldId: string): string[] {
  const referencedField = props.allFields.find(f => f.id === fieldId)
  if (!referencedField) return []

  // Yes/No fields have implicit options
  if (referencedField.fieldType === 'yes_no') return ['yes', 'no']

  // Fields with explicit options
  if (['select', 'multi_select', 'radio', 'checkbox'].includes(referencedField.fieldType)) {
    return (referencedField.config as any)?.options || []
  }

  return []
}

function update(updates: Partial<FormField>) {
  emit('update-field', updates)
}

function updateConfig(configUpdates: Record<string, any>) {
  const newConfig = { ...config.value, ...configUpdates }
  // Clean undefined values
  for (const key of Object.keys(newConfig)) {
    if (newConfig[key] === undefined) delete newConfig[key]
  }
  emit('update-field', { config: newConfig })
}

// ── Options management ───────────────────────────────────────────────────

function updateOption(idx: number, value: string) {
  const newOptions = [...options.value]
  newOptions[idx] = value
  updateConfig({ options: newOptions })
}

function addOption() {
  updateConfig({ options: [...options.value, `Option ${options.value.length + 1}`] })
}

function removeOption(idx: number) {
  const newOptions = options.value.filter((_: string, i: number) => i !== idx)
  updateConfig({ options: newOptions })
}

// ── Conditional logic management ─────────────────────────────────────────

function addCondition() {
  emit('update-field', {
    conditionalLogic: {
      action: 'show',
      match: 'all',
      rules: [{ fieldId: '', operator: 'eq', value: '' }]
    }
  })
}

function removeCondition() {
  emit('update-field', { conditionalLogic: undefined })
}

function updateConditionAction(action: 'show' | 'hide') {
  if (!props.field.conditionalLogic) return
  emit('update-field', {
    conditionalLogic: { ...props.field.conditionalLogic, action }
  })
}

function updateConditionMatch(match: 'all' | 'any') {
  if (!props.field.conditionalLogic) return
  emit('update-field', {
    conditionalLogic: { ...props.field.conditionalLogic, match }
  })
}

function updateRule(idx: number, updates: Partial<ConditionalRule>) {
  if (!props.field.conditionalLogic) return
  const rules = [...props.field.conditionalLogic.rules]
  rules[idx] = { ...rules[idx]!, ...updates }
  emit('update-field', {
    conditionalLogic: { ...props.field.conditionalLogic, rules }
  })
}

function addRule() {
  if (!props.field.conditionalLogic) return
  emit('update-field', {
    conditionalLogic: {
      ...props.field.conditionalLogic,
      rules: [...props.field.conditionalLogic.rules, { fieldId: '', operator: 'eq' as const, value: '' }]
    }
  })
}

function removeRule(idx: number) {
  if (!props.field.conditionalLogic) return
  const rules = props.field.conditionalLogic.rules.filter((_, i) => i !== idx)
  if (rules.length === 0) {
    removeCondition()
  } else {
    emit('update-field', {
      conditionalLogic: { ...props.field.conditionalLogic, rules }
    })
  }
}
</script>
