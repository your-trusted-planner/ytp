<template>
  <UiModal
    :model-value="modelValue"
    title="Add Relationship"
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p class="text-sm text-gray-500 -mt-2 mb-4">
      For: <span class="font-medium text-gray-700">{{ subjectName }}</span>
    </p>

    <form
      class="space-y-4"
      @submit.prevent="handleSubmit"
    >
      <!-- Mode selector (only shown when creating new people is allowed) -->
      <div
        v-if="allowCreatePerson"
        class="border-b pb-4"
      >
        <label class="block text-sm font-medium text-gray-700 mb-2">Person</label>
        <div class="space-y-2">
          <label class="flex items-center">
            <input
              v-model="mode"
              type="radio"
              value="existing"
              class="mr-2"
            >
            Select existing person
          </label>
          <label class="flex items-center">
            <input
              v-model="mode"
              type="radio"
              value="new"
              class="mr-2"
            >
            Create new person
          </label>
        </div>
      </div>

      <!-- Person search (existing mode) -->
      <div v-if="mode === 'existing'">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Person <span class="text-red-500">*</span>
        </label>
        <div class="relative">
          <input
            v-model="personSearch"
            type="text"
            placeholder="Type a name, email, or phone..."
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
            @input="onSearchInput"
          >
          <ul
            v-if="searchResults.length > 0"
            class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            <li
              v-for="person in searchResults"
              :key="person.id"
              class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex justify-between items-center"
              :class="{ 'bg-burgundy-50 font-medium': selectedPersonId === person.id }"
              @click="selectPerson(person)"
            >
              <span>{{ person.fullName }}</span>
              <span
                v-if="person.email"
                class="text-gray-400 text-xs ml-2"
              >{{ person.email }}</span>
            </li>
          </ul>
          <p
            v-else-if="personSearch.length >= 2 && !searching"
            class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow px-3 py-2 text-sm text-gray-500"
          >
            No people found
          </p>
        </div>
        <p
          v-if="selectedPersonId && selectedPersonName"
          class="mt-2 text-sm text-burgundy-700 font-medium"
        >
          Selected: {{ selectedPersonName }}
        </p>
      </div>

      <!-- Create new person (new mode) -->
      <div
        v-if="mode === 'new'"
        class="space-y-4"
      >
        <div class="grid grid-cols-2 gap-4">
          <UiInput
            v-model="newPerson.firstName"
            label="First Name"
            required
          />
          <UiInput
            v-model="newPerson.lastName"
            label="Last Name"
            required
          />
        </div>
        <UiInput
          v-model="newPerson.email"
          label="Email"
          type="email"
        />
        <UiPhoneInput
          v-model="newPerson.phone"
          label="Phone"
        />
      </div>

      <!-- Relationship details -->
      <div
        class="space-y-4"
        :class="allowCreatePerson ? 'border-t pt-4' : ''"
      >
        <h4
          v-if="allowCreatePerson"
          class="font-semibold text-gray-900"
        >
          Relationship Details
        </h4>

        <UiSelect
          v-model="relationshipType"
          label="Relationship Type"
          required
        >
          <option value="">
            -- Select type --
          </option>
          <optgroup label="Family">
            <option value="SPOUSE">Spouse</option>
            <option value="EX_SPOUSE">Ex-Spouse</option>
            <option value="PARTNER">Partner</option>
            <option value="CHILD">Child</option>
            <option value="STEPCHILD">Stepchild</option>
            <option value="STEPPARENT">Stepparent</option>
            <option value="GRANDCHILD">Grandchild</option>
            <option value="GRANDPARENT">Grandparent</option>
            <option value="PARENT">Parent</option>
            <option value="SIBLING">Sibling</option>
          </optgroup>
          <optgroup
            v-if="showFiduciary"
            label="Fiduciary"
          >
            <option value="TRUSTEE">Trustee</option>
            <option value="CO_TRUSTEE">Co-Trustee</option>
            <option value="SUCCESSOR_TRUSTEE">Successor Trustee</option>
            <option value="BENEFICIARY">Beneficiary</option>
            <option value="EXECUTOR">Executor</option>
            <option value="AGENT">Agent</option>
            <option value="GUARDIAN">Guardian</option>
          </optgroup>
          <optgroup label="Professional">
            <option value="FINANCIAL_ADVISOR">Financial Advisor</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="INSURANCE_AGENT">Insurance Agent</option>
            <option value="ATTORNEY">Attorney</option>
          </optgroup>
          <optgroup label="Business">
            <option value="BUSINESS_PARTNER">Business Partner</option>
            <option value="BUSINESS_ASSOCIATE">Business Associate</option>
          </optgroup>
        </UiSelect>

        <UiInput
          v-if="['CHILD', 'STEPCHILD', 'SIBLING'].includes(relationshipType)"
          v-model.number="ordinal"
          label="Order (e.g., 1 for first child, 2 for second child)"
          type="number"
          min="0"
        />

        <UiTextarea
          v-model="notes"
          label="Notes (optional)"
          :rows="2"
        />
      </div>

      <div class="flex justify-end space-x-3 pt-4">
        <UiButton
          type="button"
          variant="ghost"
          @click="$emit('update:modelValue', false)"
        >
          Cancel
        </UiButton>
        <UiButton
          type="submit"
          :loading="saving"
          :disabled="!canSubmit"
        >
          Add Relationship
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
const toast = useToast()

const props = defineProps<{
  modelValue: boolean
  subjectName: string
  excludePersonId?: string
  allowCreatePerson?: boolean
  showFiduciary?: boolean
  onSave: (data: {
    personId: string
    relationshipType: string
    ordinal: number
    notes: string
    newPerson?: { firstName: string, lastName: string, email: string, phone: string }
  }) => Promise<void>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved'): void
}>()

// Mode (only relevant when allowCreatePerson is true)
const mode = ref<'existing' | 'new'>('existing')

// Person search state
const personSearch = ref('')
const searchResults = ref<any[]>([])
const searching = ref(false)
const selectedPersonId = ref('')
const selectedPersonName = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

// Form fields
const relationshipType = ref('')
const ordinal = ref(0)
const notes = ref('')
const newPerson = reactive({ firstName: '', lastName: '', email: '', phone: '' })

// Submit state
const saving = ref(false)

const canSubmit = computed(() => {
  if (!relationshipType.value) return false
  if (mode.value === 'existing') return !!selectedPersonId.value
  if (mode.value === 'new') return !!(newPerson.firstName && newPerson.lastName)
  return false
})

// Reset all state when modal closes
watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    mode.value = 'existing'
    personSearch.value = ''
    searchResults.value = []
    selectedPersonId.value = ''
    selectedPersonName.value = ''
    relationshipType.value = ''
    ordinal.value = 0
    notes.value = ''
    Object.assign(newPerson, { firstName: '', lastName: '', email: '', phone: '' })
  }
})

// Search logic
function onSearchInput() {
  if (selectedPersonId.value) {
    selectedPersonId.value = ''
    selectedPersonName.value = ''
  }
  if (searchTimer) clearTimeout(searchTimer)
  if (personSearch.value.length < 2) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(runSearch, 300)
}

async function runSearch() {
  searching.value = true
  try {
    const data = await $fetch('/api/people', {
      query: { search: personSearch.value, limit: 10 }
    })
    searchResults.value = ((data as any).people || []).filter(
      (p: any) => p.id !== props.excludePersonId
    )
  }
  catch { searchResults.value = [] }
  finally { searching.value = false }
}

function selectPerson(person: any) {
  selectedPersonId.value = person.id
  selectedPersonName.value = person.fullName || `${person.firstName} ${person.lastName}`.trim()
  personSearch.value = selectedPersonName.value
  searchResults.value = []
}

// Submit
async function handleSubmit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    await props.onSave({
      personId: selectedPersonId.value,
      relationshipType: relationshipType.value,
      ordinal: ordinal.value || 0,
      notes: notes.value,
      ...(mode.value === 'new' ? { newPerson: { ...newPerson } } : {})
    })
    emit('update:modelValue', false)
    emit('saved')
  }
  catch (error: any) {
    toast.error(error?.data?.message || error?.message || 'Failed to add relationship')
  }
  finally { saving.value = false }
}
</script>
