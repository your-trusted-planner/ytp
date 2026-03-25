<template>
  <div class="border rounded-lg bg-white">
    <!-- Section Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <GripVertical class="w-4 h-4 text-gray-300 flex-shrink-0" />
        <input
          :value="section.title || ''"
          type="text"
          class="text-sm font-medium text-gray-800 bg-transparent border border-transparent rounded px-1.5 py-0.5 hover:border-gray-300 focus:border-accent-400 focus:ring-1 focus:ring-accent-400 focus:outline-none flex-1 min-w-0 placeholder:text-gray-400"
          placeholder="Untitled section (click to name)"
          @input="$emit('update-section', { title: ($event.target as HTMLInputElement).value })"
        >
      </div>
      <div class="flex items-center gap-1 flex-shrink-0 ml-2">
        <button
          type="button"
          class="p-1 text-gray-400 hover:text-gray-600"
          title="Move up"
          @click="$emit('move-up')"
        >
          <ChevronUp class="w-4 h-4" />
        </button>
        <button
          type="button"
          class="p-1 text-gray-400 hover:text-gray-600"
          title="Move down"
          @click="$emit('move-down')"
        >
          <ChevronDown class="w-4 h-4" />
        </button>
        <button
          v-if="!isOnly"
          type="button"
          class="p-1 text-gray-400 hover:text-red-500"
          title="Remove section"
          @click="$emit('remove')"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Fields List (also a drop zone for cross-section moves) -->
    <div
      class="p-3 space-y-1.5 min-h-[48px] transition-colors rounded-b-lg"
      :class="sectionDragOver ? 'bg-accent-50/50 outline-dashed outline-2 outline-accent-300' : ''"
      @dragover.prevent="sectionDragOver = true"
      @dragleave="sectionDragOver = false"
      @drop.prevent="onSectionDrop"
    >
      <BuilderField
        v-for="field in section.fields"
        :key="field.id"
        :field="field"
        :is-selected="selectedFieldId === field.id"
        @select="$emit('select-field', $event)"
        @drag-start="dragSourceId = $event"
        @drop-on="onFieldDrop($event)"
        @move-up="$emit('move-field-up', field.id)"
        @move-down="$emit('move-field-down', field.id)"
        @remove="$emit('remove-field', field.id)"
      />

      <!-- Empty State -->
      <div
        v-if="section.fields.length === 0"
        class="text-center py-6 text-gray-400"
      >
        <p class="text-sm">
          {{ sectionDragOver ? 'Drop field here' : 'No fields yet' }}
        </p>
      </div>

      <!-- Add Field Button -->
      <div v-if="!showTypePicker">
        <button
          type="button"
          class="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-accent-300 hover:text-accent-600 transition-colors"
          @click="showTypePicker = true"
        >
          + Add field
        </button>
      </div>
      <div v-else class="border rounded-lg p-3 bg-gray-50">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-gray-600">Choose field type</span>
          <button
            type="button"
            class="text-xs text-gray-400 hover:text-gray-600"
            @click="showTypePicker = false"
          >
            Cancel
          </button>
        </div>
        <FieldTypePicker @select="onFieldTypeSelected" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-vue-next'
import type { FormSection, FieldType } from '~/types/form'
import BuilderField from './BuilderField.vue'
import FieldTypePicker from './FieldTypePicker.vue'

const props = defineProps<{
  section: FormSection
  isOnly: boolean
  selectedFieldId: string | null
}>()

const emit = defineEmits<{
  'update-section': [updates: Partial<FormSection>]
  'move-up': []
  'move-down': []
  'remove': []
  'select-field': [fieldId: string]
  'move-field-up': [fieldId: string]
  'move-field-down': [fieldId: string]
  'remove-field': [fieldId: string]
  'add-field': [type: FieldType]
  'swap-fields': [payload: { fromId: string, toId: string }]
  'receive-field': [fieldId: string]
}>()

const showTypePicker = ref(false)
const dragSourceId = ref<string | null>(null)
const sectionDragOver = ref(false)

function onFieldDrop(targetFieldId: string) {
  sectionDragOver.value = false
  if (dragSourceId.value && dragSourceId.value !== targetFieldId) {
    emit('swap-fields', { fromId: dragSourceId.value, toId: targetFieldId })
  }
  dragSourceId.value = null
}

function onSectionDrop(e: DragEvent) {
  sectionDragOver.value = false
  const fieldId = e.dataTransfer?.getData('text/plain')
  if (!fieldId) return
  // If it's a field already in this section, ignore (handled by BuilderField drop)
  if (props.section.fields.some(f => f.id === fieldId)) return
  // Cross-section move
  emit('receive-field', fieldId)
}

function onFieldTypeSelected(type: FieldType) {
  showTypePicker.value = false
  emit('add-field', type)
}
</script>
