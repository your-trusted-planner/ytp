<template>
  <div class="grid grid-cols-3 gap-2">
    <button
      v-for="ft in fieldTypes"
      :key="ft.type"
      type="button"
      class="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 hover:border-accent-300 hover:bg-accent-50 transition-colors text-center"
      @click="$emit('select', ft.type)"
    >
      <component
        :is="ft.icon"
        class="w-5 h-5 text-gray-500"
      />
      <span class="text-xs font-medium text-gray-700">{{ ft.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  Type, AlignLeft, Mail, Phone, Hash, CalendarDays,
  ChevronDown, ListChecks, CircleDot, CheckSquare,
  ToggleLeft, Upload, Clock, FileText
} from 'lucide-vue-next'
import type { FieldType } from '~/types/form'

defineEmits<{
  select: [type: FieldType]
}>()

const fieldTypes = [
  { type: 'text' as FieldType, label: 'Short Text', icon: Type },
  { type: 'textarea' as FieldType, label: 'Long Text', icon: AlignLeft },
  { type: 'email' as FieldType, label: 'Email', icon: Mail },
  { type: 'phone' as FieldType, label: 'Phone', icon: Phone },
  { type: 'number' as FieldType, label: 'Number', icon: Hash },
  { type: 'date' as FieldType, label: 'Date', icon: CalendarDays },
  { type: 'select' as FieldType, label: 'Dropdown', icon: ChevronDown },
  { type: 'multi_select' as FieldType, label: 'Multi-Select', icon: ListChecks },
  { type: 'radio' as FieldType, label: 'Radio', icon: CircleDot },
  { type: 'checkbox' as FieldType, label: 'Checkboxes', icon: CheckSquare },
  { type: 'yes_no' as FieldType, label: 'Yes / No', icon: ToggleLeft },
  { type: 'file_upload' as FieldType, label: 'File Upload', icon: Upload },
  { type: 'scheduler' as FieldType, label: 'Scheduler', icon: Clock },
  { type: 'content' as FieldType, label: 'Content', icon: FileText }
]
</script>
