<template>
  <div>
    <!-- Preview Toggle -->
    <div class="flex items-center justify-end mb-4">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
        :class="previewMode
          ? 'bg-accent-100 text-accent-700'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        @click="previewMode = !previewMode"
      >
        <Eye v-if="!previewMode" class="w-4 h-4" />
        <Pencil v-else class="w-4 h-4" />
        {{ previewMode ? 'Back to Editor' : 'Preview' }}
      </button>
    </div>

    <!-- Preview Mode -->
    <div v-if="previewMode" class="border rounded-lg p-6 bg-gray-50">
      <FormRenderer
        :definition="definition"
        submit-label="Submit (Preview)"
        @submit="onPreviewSubmit"
      />
    </div>

    <!-- Builder Mode -->
    <div
      v-else
      class="flex gap-4"
    >
      <!-- Left: Section List -->
      <div class="flex-1 space-y-3 min-w-0">
        <BuilderSection
          v-for="section in definition.sections"
          :key="section.id"
          :section="section"
          :is-only="definition.sections.length === 1"
          :selected-field-id="selectedFieldId"
          @update-section="updateSection(section.id, $event)"
          @move-up="moveSectionUp(section.id)"
          @move-down="moveSectionDown(section.id)"
          @remove="removeSection(section.id)"
          @select-field="selectField($event)"
          @move-field-up="moveFieldUp(section.id, $event)"
          @move-field-down="moveFieldDown(section.id, $event)"
          @remove-field="removeField(section.id, $event)"
          @add-field="addField(section.id, $event)"
          @swap-fields="swapFields(section.id, $event.fromId, $event.toId)"
          @receive-field="moveFieldToSection($event, section.id)"
        />

        <!-- Add Section (only show for multi-step forms) -->
        <button
          v-if="definition.isMultiStep"
          type="button"
          class="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-accent-300 hover:text-accent-600 transition-colors"
          @click="addSection()"
        >
          + Add Section
        </button>
      </div>

      <!-- Right: Field Config Panel -->
      <div class="w-[450px] flex-shrink-0">
        <div
          v-if="selectedField"
          class="border rounded-lg p-4 bg-white sticky top-4"
        >
          <FieldConfigPanel
            :field="selectedField"
            :all-fields="allFields"
            :appointment-types="appointmentTypes"
            @update-field="onFieldUpdate"
            @close="selectField(null)"
          />
        </div>
        <div
          v-else
          class="border rounded-lg p-6 bg-gray-50 text-center"
        >
          <p class="text-sm text-gray-400">
            Select a field to edit its settings
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Eye, Pencil } from 'lucide-vue-next'
import { useFormBuilder } from '~/composables/useFormBuilder'
import type { FormDefinition, FormField } from '~/types/form'
import BuilderSection from './BuilderSection.vue'
import FieldConfigPanel from './FieldConfigPanel.vue'

const props = defineProps<{
  modelValue: FormDefinition
  appointmentTypes?: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [definition: FormDefinition]
}>()

const {
  definition,
  selectedFieldId,
  selectedField,
  selectedFieldSectionId,
  previewMode,
  isDirty,
  loadDefinition,
  addSection,
  removeSection,
  updateSection,
  moveSectionUp,
  moveSectionDown,
  addField,
  removeField,
  updateField,
  moveFieldUp,
  moveFieldDown,
  swapFields,
  moveFieldToSection,
  selectField,
  allFields
} = useFormBuilder()

// Sync from prop
watch(() => props.modelValue, (val) => {
  if (val && val.id !== definition.value.id) {
    loadDefinition(val)
  }
}, { immediate: true })

// Emit changes back to parent
watch(definition, (val) => {
  if (isDirty.value) {
    emit('update:modelValue', JSON.parse(JSON.stringify(val)))
  }
}, { deep: true })

function onFieldUpdate(updates: Partial<FormField>) {
  if (selectedFieldId.value) {
    updateField(selectedFieldId.value, updates)
  }
}

function onPreviewSubmit() {
  const toast = useToast()
  toast.success('Preview submitted successfully! No data was saved.')
  previewMode.value = false
}
</script>
