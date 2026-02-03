<template>
  <div class="space-y-3">
    <!-- Street Address with autocomplete -->
    <div class="relative" ref="containerRef">
      <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">
        {{ label }}
        <span v-if="required" class="text-red-500">*</span>
      </label>
      <div class="relative">
        <input
          ref="inputRef"
          v-model="streetQuery"
          type="text"
          :placeholder="manualEntry ? 'Street Address' : 'Start typing an address...'"
          :disabled="disabled"
          :class="[
            'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500',
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
            error ? 'border-red-500' : 'border-gray-300'
          ]"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
        />
        <!-- Loading indicator -->
        <div v-if="loading" class="absolute right-3 top-1/2 -translate-y-1/2">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-burgundy-600"></div>
        </div>
      </div>

      <!-- Suggestions dropdown -->
      <Transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <div
          v-if="showDropdown && suggestions.length > 0 && !manualEntry"
          class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          <ul class="py-1">
            <li
              v-for="(suggestion, index) in suggestions"
              :key="index"
              :class="[
                'px-3 py-2 cursor-pointer text-sm',
                index === highlightedIndex ? 'bg-burgundy-50 text-burgundy-900' : 'text-gray-900 hover:bg-gray-50'
              ]"
              @mousedown.prevent="selectSuggestion(suggestion)"
              @mouseenter="highlightedIndex = index"
            >
              <div class="font-medium">{{ suggestion.street }}</div>
              <div class="text-xs text-gray-500">
                {{ suggestion.city }}, {{ suggestion.state }} {{ suggestion.zipCode }}
              </div>
            </li>
          </ul>
        </div>
      </Transition>
    </div>

    <!-- Apt/Suite/Unit field -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        Apt, Suite, Unit, Building <span class="text-gray-400 font-normal">(optional)</span>
      </label>
      <input
        v-model="localAddress2"
        type="text"
        placeholder="Apt 4B, Suite 100, Unit 12, etc."
        :disabled="disabled"
        :class="[
          'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500',
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
          'border-gray-300'
        ]"
        @input="emitUpdate"
      />
    </div>

    <!-- City, State, ZIP row -->
    <div class="grid grid-cols-6 gap-3">
      <div class="col-span-3">
        <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
        <input
          v-model="localCity"
          type="text"
          :disabled="disabled || (!manualEntry && !localCity)"
          :class="[
            'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500',
            disabled || (!manualEntry && !localCity) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
            'border-gray-300'
          ]"
          @input="emitUpdate"
        />
      </div>
      <div class="col-span-1">
        <label class="block text-sm font-medium text-gray-700 mb-1">State</label>
        <select
          v-model="localState"
          :disabled="disabled || (!manualEntry && !localState)"
          :class="[
            'w-full px-2 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500',
            disabled || (!manualEntry && !localState) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
            'border-gray-300'
          ]"
          @change="emitUpdate"
        >
          <option value=""></option>
          <option v-for="state in US_STATES" :key="state.code" :value="state.code">
            {{ state.code }}
          </option>
        </select>
      </div>
      <div class="col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
        <input
          v-model="localZipCode"
          type="text"
          maxlength="10"
          :disabled="disabled || (!manualEntry && !localZipCode)"
          :class="[
            'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500',
            disabled || (!manualEntry && !localZipCode) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
            'border-gray-300'
          ]"
          @input="emitUpdate"
        />
      </div>
    </div>

    <!-- Manual entry checkbox -->
    <div v-if="allowManualEntry" class="flex items-center">
      <input
        id="manual-entry"
        v-model="manualEntry"
        type="checkbox"
        class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
        @change="handleManualEntryChange"
      />
      <label for="manual-entry" class="ml-2 text-sm text-gray-600">
        Enter address manually
      </label>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" class="text-sm text-gray-500">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { US_STATES } from '~/utils/us-states'

export interface AddressValue {
  address: string
  address2?: string
  city: string
  state: string
  zipCode: string
}

interface AddressSuggestion {
  formattedAddress: string
  addressLabel: string
  street: string
  city: string
  state: string
  zipCode: string
  county?: string
  latitude?: number
  longitude?: number
}

interface Props {
  modelValue: AddressValue
  label?: string
  required?: boolean
  disabled?: boolean
  allowManualEntry?: boolean
  error?: string
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false,
  allowManualEntry: true
})

const emit = defineEmits<{
  'update:modelValue': [value: AddressValue]
  'place-selected': [suggestion: AddressSuggestion]
}>()

const containerRef = ref<HTMLElement>()
const inputRef = ref<HTMLInputElement>()

// Local state
const streetQuery = ref(props.modelValue.address || '')
const localAddress2 = ref(props.modelValue.address2 || '')
const localCity = ref(props.modelValue.city || '')
const localState = ref(props.modelValue.state || '')
const localZipCode = ref(props.modelValue.zipCode || '')
const manualEntry = ref(false)
const suggestions = ref<AddressSuggestion[]>([])
const showDropdown = ref(false)
const highlightedIndex = ref(-1)
const loading = ref(false)

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    streetQuery.value = newVal.address || ''
    localAddress2.value = newVal.address2 || ''
    localCity.value = newVal.city || ''
    localState.value = newVal.state || ''
    localZipCode.value = newVal.zipCode || ''
  }
}, { deep: true })

function handleFocus() {
  if (!manualEntry.value && streetQuery.value.length >= 3) {
    showDropdown.value = true
  }
}

function handleBlur() {
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}

function handleInput() {
  highlightedIndex.value = -1
  emitUpdate()

  // Don't fetch if manual entry is enabled
  if (manualEntry.value) return

  // Debounce the API call
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  if (streetQuery.value.length >= 3) {
    loading.value = true
    debounceTimer = setTimeout(async () => {
      await fetchSuggestions()
      loading.value = false
    }, 300)
  } else {
    suggestions.value = []
    showDropdown.value = false
  }
}

async function fetchSuggestions() {
  try {
    const response = await $fetch<{ suggestions: AddressSuggestion[] }>('/api/address/autocomplete', {
      params: { q: streetQuery.value, limit: 5 }
    })
    suggestions.value = response.suggestions
    showDropdown.value = suggestions.value.length > 0
  } catch (error) {
    console.error('Failed to fetch address suggestions:', error)
    suggestions.value = []
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (manualEntry.value) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (!showDropdown.value && suggestions.value.length > 0) {
        showDropdown.value = true
      } else if (highlightedIndex.value < suggestions.value.length - 1) {
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
      const selected = suggestions.value[highlightedIndex.value]
      if (highlightedIndex.value >= 0 && selected) {
        selectSuggestion(selected)
      }
      break
    case 'Escape':
      showDropdown.value = false
      break
  }
}

function selectSuggestion(suggestion: AddressSuggestion) {
  streetQuery.value = suggestion.street
  localCity.value = suggestion.city
  localState.value = suggestion.state
  localZipCode.value = suggestion.zipCode
  showDropdown.value = false
  suggestions.value = []

  emitUpdate()
  emit('place-selected', suggestion)
}

function handleManualEntryChange() {
  if (manualEntry.value) {
    showDropdown.value = false
    suggestions.value = []
  }
}

function emitUpdate() {
  emit('update:modelValue', {
    address: streetQuery.value,
    address2: localAddress2.value,
    city: localCity.value,
    state: localState.value,
    zipCode: localZipCode.value
  })
}
</script>
