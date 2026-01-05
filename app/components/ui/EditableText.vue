<template>
  <div class="inline-block w-full">
    <!-- Display Mode -->
    <component
      :is="tag"
      v-if="!isEditing"
      :class="[
        'editable-text',
        displayClass,
        { 'editable-text--hover': !disabled }
      ]"
      :style="!disabled && customCursor ? { cursor: customCursor } : undefined"
      :title="disabled ? '' : 'Click to edit'"
      @click="!disabled && startEditing()"
    >
      <slot name="display" :value="modelValue">
        {{ displayValue }}
      </slot>
    </component>

    <!-- Edit Mode -->
    <input
      v-else
      ref="inputRef"
      v-model="editValue"
      :type="type"
      :placeholder="placeholder"
      :class="['editable-text-input', inputClass]"
      @click.stop
      @blur="handleBlur"
      @keydown.enter="save"
      @keydown.escape="cancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

interface Props {
  /** The value to display and edit (v-model) */
  modelValue: string | number
  /** HTML tag for display mode (default: 'span') */
  tag?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p'
  /** Input type (default: 'text') */
  type?: 'text' | 'email' | 'url' | 'tel' | 'number'
  /** Placeholder text when empty */
  placeholder?: string
  /** Custom class for display mode */
  displayClass?: string
  /** Custom class for input mode */
  inputClass?: string
  /** Custom cursor (use createCursor utility) */
  customCursor?: string
  /** Disable editing */
  disabled?: boolean
  /** Auto-save on blur (default: true) */
  autoSave?: boolean
  /** Validation function - return error message or null */
  validate?: (value: string | number) => string | null
  /** Transform value before saving (e.g., trim, uppercase) */
  transform?: (value: string | number) => string | number
  /** Show empty placeholder when value is empty */
  emptyPlaceholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'span',
  type: 'text',
  displayClass: '',
  inputClass: '',
  autoSave: true,
  emptyPlaceholder: '(empty)'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'save': [value: string | number]
  'cancel': []
  'edit-start': []
  'edit-end': []
}>()

const isEditing = ref(false)
const editValue = ref<string | number>('')
const inputRef = ref<HTMLInputElement | null>(null)

const displayValue = computed(() => {
  if (props.modelValue === '' || props.modelValue === null || props.modelValue === undefined) {
    return props.emptyPlaceholder
  }
  return props.modelValue
})

function startEditing() {
  if (props.disabled) return

  isEditing.value = true
  editValue.value = props.modelValue

  emit('edit-start')

  // Focus and select text on next tick
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      inputRef.value.select()
    }
  })
}

function save() {
  // Apply transform if provided
  let finalValue = editValue.value
  if (props.transform) {
    finalValue = props.transform(finalValue)
  }

  // Validate if validator provided
  if (props.validate) {
    const error = props.validate(finalValue)
    if (error) {
      // Could emit an error event here or show toast
      console.warn('Validation failed:', error)
      cancel() // Revert on validation failure
      return
    }
  }

  // Don't save if value hasn't changed
  if (finalValue === props.modelValue) {
    cancel()
    return
  }

  // Emit update
  emit('update:modelValue', finalValue)
  emit('save', finalValue)

  isEditing.value = false
  emit('edit-end')
}

function cancel() {
  editValue.value = props.modelValue
  isEditing.value = false
  emit('cancel')
  emit('edit-end')
}

function handleBlur() {
  if (props.autoSave) {
    save()
  } else {
    cancel()
  }
}

// Expose methods for programmatic control
defineExpose({
  startEditing,
  save,
  cancel,
  isEditing
})
</script>

<style scoped>
.editable-text {
  display: inline-block;
  transition: color 0.2s ease;
}

.editable-text--hover {
  cursor: pointer;
}

.editable-text--hover:hover {
  color: #991b1b; /* burgundy-800 - customize via displayClass if needed */
}

.editable-text-input {
  display: inline-block;
  width: 100%;
  border: 1px solid #991b1b;
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  color: inherit;
  background: white;
  outline: none;
  transition: all 0.2s ease;
}

.editable-text-input:focus {
  ring: 2px;
  ring-color: #991b1b;
  border-color: #991b1b;
}
</style>
