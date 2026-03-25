<template>
  <div
    draggable="true"
    class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors group"
    :class="[
      isSelected
        ? 'border-accent-400 bg-accent-50'
        : 'border-gray-200 bg-white hover:border-gray-300',
      isDragOver ? 'border-accent-400 border-dashed bg-accent-50/50' : ''
    ]"
    @click="$emit('select', field.id)"
    @dragstart="onDragStart"
    @dragover.prevent="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop.prevent="onDrop"
    @dragend="isDragOver = false"
  >
    <!-- Drag handle -->
    <GripVertical class="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 cursor-grab" />

    <!-- Type badge -->
    <span
      class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide flex-shrink-0"
      :class="typeBadgeClass"
    >
      {{ shortTypeLabel }}
    </span>

    <!-- Label -->
    <span class="text-sm text-gray-800 truncate flex-1">
      {{ field.label }}
      <span v-if="field.isRequired" class="text-red-400">*</span>
    </span>

    <!-- Person mapping indicator -->
    <span
      v-if="field.personFieldMapping"
      class="text-[10px] text-blue-500 flex-shrink-0"
      :title="`Maps to ${field.personFieldMapping}`"
    >
      <UserCircle class="w-3.5 h-3.5" />
    </span>

    <!-- Conditional indicator -->
    <span
      v-if="field.conditionalLogic"
      class="text-[10px] text-amber-500 flex-shrink-0"
      title="Has conditional logic"
    >
      <GitBranch class="w-3.5 h-3.5" />
    </span>

    <!-- Actions -->
    <div class="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        class="p-0.5 text-gray-400 hover:text-gray-600"
        title="Move up"
        @click.stop="$emit('move-up')"
      >
        <ChevronUp class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        class="p-0.5 text-gray-400 hover:text-gray-600"
        title="Move down"
        @click.stop="$emit('move-down')"
      >
        <ChevronDown class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        class="p-0.5 text-gray-400 hover:text-red-500"
        title="Remove"
        @click.stop="$emit('remove')"
      >
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GripVertical, ChevronUp, ChevronDown, Trash2, UserCircle, GitBranch } from 'lucide-vue-next'
import type { FormField } from '~/types/form'

const props = defineProps<{
  field: FormField
  isSelected: boolean
}>()

const emit = defineEmits<{
  select: [fieldId: string]
  'drag-start': [fieldId: string]
  'drop-on': [targetFieldId: string]
  'move-up': []
  'move-down': []
  remove: []
}>()

const isDragOver = ref(false)

function onDragStart(e: DragEvent) {
  e.dataTransfer?.setData('text/plain', props.field.id)
  emit('drag-start', props.field.id)
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const sourceFieldId = e.dataTransfer?.getData('text/plain')
  if (sourceFieldId && sourceFieldId !== props.field.id) {
    emit('drop-on', props.field.id)
  }
}

const shortTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    text: 'TXT', textarea: 'AREA', email: 'EMAIL', phone: 'PHONE',
    number: 'NUM', date: 'DATE', select: 'DROP', multi_select: 'MULTI',
    radio: 'RADIO', checkbox: 'CHECK', yes_no: 'Y/N',
    file_upload: 'FILE', scheduler: 'SCHED', content: 'HTML'
  }
  return labels[props.field.fieldType] || props.field.fieldType
})

const typeBadgeClass = computed(() => {
  const classes: Record<string, string> = {
    text: 'bg-gray-100 text-gray-600',
    textarea: 'bg-gray-100 text-gray-600',
    email: 'bg-blue-100 text-blue-700',
    phone: 'bg-blue-100 text-blue-700',
    number: 'bg-purple-100 text-purple-700',
    date: 'bg-purple-100 text-purple-700',
    select: 'bg-green-100 text-green-700',
    multi_select: 'bg-green-100 text-green-700',
    radio: 'bg-green-100 text-green-700',
    checkbox: 'bg-green-100 text-green-700',
    yes_no: 'bg-amber-100 text-amber-700',
    file_upload: 'bg-orange-100 text-orange-700',
    scheduler: 'bg-red-100 text-red-700'
  }
  return classes[props.field.fieldType] || 'bg-gray-100 text-gray-600'
})
</script>
