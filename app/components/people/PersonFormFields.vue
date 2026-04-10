<template>
  <div class="space-y-4">
    <!-- Type Selection -->
    <div class="border-b pb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
      <div
        v-if="isEdit"
        class="flex items-center text-sm text-gray-600"
      >
        <component
          :is="typeIcon"
          class="w-4 h-4 mr-2"
        />
        {{ typeLabel }}
      </div>
      <div
        v-else
        class="flex gap-4"
      >
        <label
          v-for="opt in typeOptions"
          :key="opt.value"
          class="flex items-center cursor-pointer"
        >
          <input
            :checked="form.mode === opt.value"
            type="radio"
            :value="opt.value"
            class="mr-2"
            @change="$emit('update:mode', opt.value)"
          >
          <component
            :is="opt.icon"
            class="w-4 h-4 mr-1"
          />
          {{ opt.label }}
        </label>
      </div>
    </div>

    <!-- Individual Fields -->
    <div
      v-if="form.mode === 'person'"
      class="space-y-4"
    >
      <div class="grid grid-cols-2 gap-4">
        <UiInput
          :model-value="form.firstName"
          label="First Name"
          required
          @update:model-value="updateField('firstName', $event)"
        />
        <UiInput
          :model-value="form.lastName"
          label="Last Name"
          required
          @update:model-value="updateField('lastName', $event)"
        />
      </div>

      <!-- Middle Names -->
      <div class="space-y-2">
        <div v-if="!form.useMultipleMiddleNames">
          <label class="block text-sm font-medium text-gray-700 mb-1">Middle Name (optional)</label>
          <input
            :value="form.middleName"
            type="text"
            placeholder="Middle name"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
            @input="updateField('middleName', ($event.target as HTMLInputElement).value)"
          >
          <button
            type="button"
            class="mt-1 text-sm text-burgundy-600 hover:text-burgundy-800"
            @click="$emit('enable-multiple-middle-names')"
          >
            + Add another middle name
          </button>
        </div>
        <div
          v-else
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <label class="block text-sm font-medium text-gray-700">Middle Names</label>
            <button
              type="button"
              class="text-sm text-burgundy-600 hover:text-burgundy-800 flex items-center"
              @click="$emit('add-middle-name')"
            >
              <Plus class="w-4 h-4 mr-1" />
              Add Another
            </button>
          </div>
          <div
            v-for="(_name, index) in form.middleNames"
            :key="index"
            class="flex items-center gap-2"
          >
            <input
              :value="form.middleNames[index]"
              type="text"
              :placeholder="`Middle Name ${index + 1}`"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
              @input="$emit('update-middle-name', index, ($event.target as HTMLInputElement).value)"
            >
            <button
              type="button"
              class="p-2 text-red-600 hover:text-red-800"
              title="Remove middle name"
              @click="$emit('remove-middle-name', index)"
            >
              <Minus class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <UiDatePicker
          :model-value="form.dateOfBirth"
          label="Date of Birth"
          max-date="today"
          @update:model-value="updateField('dateOfBirth', $event)"
        />
        <UiTinInput
          :model-value="form.tin"
          label="SSN"
          format="ssn"
          @update:model-value="updateField('tin', $event)"
        />
      </div>
    </div>

    <!-- Trust Fields -->
    <div
      v-if="form.mode === 'trust'"
      class="space-y-4"
    >
      <UiInput
        :model-value="form.fullName"
        label="Trust Name"
        placeholder="e.g., Smith Family Revocable Living Trust"
        required
        @update:model-value="updateField('fullName', $event)"
      />
      <div class="grid grid-cols-2 gap-4">
        <UiSelect
          :model-value="form.trustType"
          label="Trust Type"
          @update:model-value="updateField('trustType', $event)"
        >
          <option value="">
            -- Select Type --
          </option>
          <option
            v-for="opt in trustTypeOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </UiSelect>
        <UiJurisdictionSelect
          :model-value="form.jurisdiction"
          label="Jurisdiction"
          @update:model-value="updateField('jurisdiction', $event)"
        />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <UiDatePicker
          :model-value="form.formationDate"
          label="Date Executed"
          max-date="today"
          @update:model-value="updateField('formationDate', $event)"
        />
        <UiTinInput
          :model-value="form.tin"
          label="EIN (optional)"
          format="ein"
          @update:model-value="updateField('tin', $event)"
        />
      </div>
    </div>

    <!-- Entity Fields -->
    <div
      v-if="form.mode === 'entity'"
      class="space-y-4"
    >
      <UiInput
        :model-value="form.fullName"
        label="Entity Name"
        placeholder="e.g., Hathaway Holdings LLC"
        required
        @update:model-value="updateField('fullName', $event)"
      />
      <div class="grid grid-cols-2 gap-4">
        <UiSelect
          :model-value="form.entityType"
          label="Entity Type"
          @update:model-value="updateField('entityType', $event)"
        >
          <option value="">
            -- Select Type --
          </option>
          <option
            v-for="opt in entityTypeOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </UiSelect>
        <UiJurisdictionSelect
          :model-value="form.jurisdiction"
          label="Jurisdiction"
          @update:model-value="updateField('jurisdiction', $event)"
        />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <UiDatePicker
          :model-value="form.formationDate"
          label="Formation Date"
          max-date="today"
          @update:model-value="updateField('formationDate', $event)"
        />
        <UiTinInput
          :model-value="form.tin"
          label="EIN (optional)"
          format="ein"
          @update:model-value="updateField('tin', $event)"
        />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <UiInput
          :model-value="form.stateFileNumber"
          label="State Filing Number"
          @update:model-value="updateField('stateFileNumber', $event)"
        />
        <UiSelect
          :model-value="form.managementType"
          label="Management Type"
          @update:model-value="updateField('managementType', $event)"
        >
          <option value="">
            -- Select --
          </option>
          <option value="MEMBER_MANAGED">
            Member Managed
          </option>
          <option value="MANAGER_MANAGED">
            Manager Managed
          </option>
          <option value="BOARD_MANAGED">
            Board Managed
          </option>
        </UiSelect>
      </div>
    </div>

    <!-- Contact Information -->
    <div class="border-t pt-4 space-y-4">
      <h4 class="font-semibold text-gray-900">
        {{ form.mode === 'trust' ? 'Trust Address' : 'Contact Information' }}
      </h4>
      <!-- Email and phone: not applicable for trusts (trustees have those) -->
      <div
        v-if="form.mode !== 'trust'"
        class="grid grid-cols-2 gap-4"
      >
        <UiInput
          :model-value="form.email"
          label="Email"
          type="email"
          @update:model-value="updateField('email', $event)"
        />
        <UiPhoneInput
          :model-value="form.phone"
          label="Phone"
          @update:model-value="updateField('phone', $event)"
        />
      </div>
      <UiAddressInput
        :model-value="addressValue"
        :label="form.mode === 'trust' ? 'Situs / Registered Address' : 'Address'"
        @update:model-value="$emit('update:address', $event)"
      />
    </div>

    <!-- Notes -->
    <UiTextarea
      :model-value="form.notes"
      label="Notes (optional)"
      :rows="3"
      @update:model-value="updateField('notes', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { User, Building2, Landmark, Plus, Minus } from 'lucide-vue-next'
import type { AddressValue } from '~/components/ui/AddressInput.vue'

export interface PersonFormData {
  mode: 'person' | 'trust' | 'entity'
  // Individual fields
  firstName: string
  lastName: string
  middleName: string
  middleNames: string[]
  useMultipleMiddleNames: boolean
  dateOfBirth: string
  // Shared identity fields
  fullName: string // Used directly for trust/entity; derived for individual
  tin: string // Full SSN or EIN — encrypted on save
  // Trust fields
  trustType: string
  isRevocable: boolean
  isJoint: boolean
  // Entity fields
  entityType: string
  stateFileNumber: string
  managementType: string
  // Shared across all types
  jurisdiction: string
  formationDate: string
  email: string
  phone: string
  notes: string
}

const props = defineProps<{
  form: PersonFormData
  addressValue: AddressValue
  isEdit?: boolean
}>()

const emit = defineEmits<{
  'update:field': [field: string, value: any]
  'update:mode': [mode: 'person' | 'trust' | 'entity']
  'update:address': [value: AddressValue]
  'enable-multiple-middle-names': []
  'add-middle-name': []
  'update-middle-name': [index: number, value: string]
  'remove-middle-name': [index: number]
}>()

function updateField(field: string, value: any) {
  emit('update:field', field, value)
}

const typeOptions = [
  { value: 'person' as const, label: 'Individual', icon: User },
  { value: 'trust' as const, label: 'Trust', icon: Landmark },
  { value: 'entity' as const, label: 'Business Entity', icon: Building2 }
]

const trustTypeOptions = [
  { value: 'REVOCABLE_LIVING', label: 'Revocable Living Trust' },
  { value: 'IRREVOCABLE_LIVING', label: 'Irrevocable Living Trust' },
  { value: 'TESTAMENTARY', label: 'Testamentary Trust' },
  { value: 'SPECIAL_NEEDS', label: 'Special Needs Trust' },
  { value: 'CHARITABLE_REMAINDER', label: 'Charitable Remainder Trust' },
  { value: 'CHARITABLE_LEAD', label: 'Charitable Lead Trust' },
  { value: 'ILIT', label: 'Irrevocable Life Insurance Trust (ILIT)' },
  { value: 'GRAT', label: 'Grantor Retained Annuity Trust (GRAT)' },
  { value: 'QPRT', label: 'Qualified Personal Residence Trust (QPRT)' },
  { value: 'DYNASTY', label: 'Dynasty Trust' },
  { value: 'OTHER', label: 'Other' }
]

const entityTypeOptions = [
  { value: 'LLC', label: 'LLC' },
  { value: 'CORPORATION', label: 'Corporation' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'PUBLIC_BENEFIT_CORPORATION', label: 'Public Benefit Corporation' },
  { value: 'FOUNDATION', label: 'Foundation' },
  { value: 'OTHER', label: 'Other' }
]

const typeIcon = computed(() => {
  return props.form.mode === 'trust' ? Landmark
    : props.form.mode === 'entity' ? Building2
      : User
})

const typeLabel = computed(() => {
  return props.form.mode === 'trust' ? 'Trust'
    : props.form.mode === 'entity' ? 'Business Entity'
      : 'Individual'
})
</script>
