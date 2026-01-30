<template>
  <div class="relative" ref="containerRef">
    <div class="relative">
      <input
        ref="inputRef"
        v-model="searchQuery"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="[
          'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500',
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
          error ? 'border-red-500' : 'border-gray-300'
        ]"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <!-- Clear button -->
      <button
        v-if="searchQuery && !disabled"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        @mousedown.prevent="clearSelection"
      >
        <X class="w-4 h-4" />
      </button>
      <!-- Loading indicator -->
      <div v-if="loading" class="absolute right-2 top-1/2 -translate-y-1/2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-burgundy-600"></div>
      </div>
    </div>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="showDropdown && (filteredOptions.length > 0 || searchQuery)"
        class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
      >
        <ul v-if="filteredOptions.length > 0" class="py-1">
          <li
            v-for="(option, index) in filteredOptions"
            :key="getOptionValue(option)"
            :class="[
              'px-3 py-2 cursor-pointer text-sm',
              index === highlightedIndex ? 'bg-burgundy-50 text-burgundy-900' : 'text-gray-900 hover:bg-gray-50'
            ]"
            @mousedown.prevent="selectOption(option)"
            @mouseenter="highlightedIndex = index"
          >
            <slot name="option" :option="option">
              <div class="font-medium">{{ getOptionLabel(option) }}</div>
              <div v-if="getOptionSublabel(option)" class="text-xs text-gray-500">
                {{ getOptionSublabel(option) }}
              </div>
            </slot>
          </li>
        </ul>
        <div v-else-if="searchQuery && !loading" class="px-3 py-4 text-sm text-gray-500 text-center">
          No results found for "{{ searchQuery }}"
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

interface Props {
  modelValue: any
  options: any[]
  labelKey?: string | ((option: any) => string)
  valueKey?: string | ((option: any) => any)
  sublabelKey?: string | ((option: any) => string)
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  error?: boolean
  minChars?: number
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'label',
  valueKey: 'value',
  placeholder: 'Search...',
  disabled: false,
  loading: false,
  error: false,
  minChars: 0
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  'search': [query: string]
  'select': [option: any]
}>()

const containerRef = ref<HTMLElement>()
const inputRef = ref<HTMLInputElement>()
const searchQuery = ref('')
const showDropdown = ref(false)
const highlightedIndex = ref(-1)
const isSelecting = ref(false)

// Get the label for an option
function getOptionLabel(option: any): string {
  if (typeof props.labelKey === 'function') {
    return props.labelKey(option)
  }
  return option?.[props.labelKey] ?? String(option)
}

// Get the value for an option
function getOptionValue(option: any): any {
  if (typeof props.valueKey === 'function') {
    return props.valueKey(option)
  }
  return option?.[props.valueKey] ?? option
}

// Get the sublabel for an option (optional secondary text)
function getOptionSublabel(option: any): string | null {
  if (!props.sublabelKey) return null
  if (typeof props.sublabelKey === 'function') {
    return props.sublabelKey(option)
  }
  return option?.[props.sublabelKey] ?? null
}

// Filter options based on search query
const filteredOptions = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < props.minChars) {
    return props.options.slice(0, 50) // Show first 50 when no search
  }

  const query = searchQuery.value.toLowerCase()
  return props.options.filter(option => {
    const label = getOptionLabel(option).toLowerCase()
    const sublabel = getOptionSublabel(option)?.toLowerCase() || ''
    return label.includes(query) || sublabel.includes(query)
  }).slice(0, 50) // Limit to 50 results
})

// Initialize search query from modelValue
function initializeFromValue() {
  if (props.modelValue) {
    const selectedOption = props.options.find(
      opt => getOptionValue(opt) === props.modelValue
    )
    if (selectedOption) {
      searchQuery.value = getOptionLabel(selectedOption)
    }
  }
}

// Watch for external value changes
watch(() => props.modelValue, () => {
  if (!isSelecting.value) {
    initializeFromValue()
  }
}, { immediate: true })

// Watch for options changes (e.g., after async load)
watch(() => props.options, () => {
  if (props.modelValue && !searchQuery.value) {
    initializeFromValue()
  }
})

function handleFocus() {
  showDropdown.value = true
  highlightedIndex.value = -1
}

function handleBlur() {
  // Delay to allow click events on options
  setTimeout(() => {
    showDropdown.value = false
    // If no selection was made and we have a modelValue, restore it
    if (props.modelValue && !isSelecting.value) {
      initializeFromValue()
    }
  }, 200)
}

function handleInput() {
  highlightedIndex.value = -1
  emit('search', searchQuery.value)

  // Clear selection if user is typing something different
  if (props.modelValue) {
    const selectedOption = props.options.find(
      opt => getOptionValue(opt) === props.modelValue
    )
    if (selectedOption && getOptionLabel(selectedOption) !== searchQuery.value) {
      emit('update:modelValue', null)
    }
  }
}

function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (!showDropdown.value) {
        showDropdown.value = true
      } else if (highlightedIndex.value < filteredOptions.value.length - 1) {
        highlightedIndex.value++
      }
      break
    case 'ArrowUp':
      event.preventDefault()
      if (highlightedIndex.value > 0) {
        highlightedIndex.value--
      }
      break
    case 'Enter':
      event.preventDefault()
      if (highlightedIndex.value >= 0 && filteredOptions.value[highlightedIndex.value]) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      showDropdown.value = false
      inputRef.value?.blur()
      break
  }
}

function selectOption(option: any) {
  isSelecting.value = true
  searchQuery.value = getOptionLabel(option)
  emit('update:modelValue', getOptionValue(option))
  emit('select', option)
  showDropdown.value = false

  // Reset selecting flag after a tick
  nextTick(() => {
    isSelecting.value = false
  })
}

function clearSelection() {
  searchQuery.value = ''
  emit('update:modelValue', null)
  inputRef.value?.focus()
}
</script>
