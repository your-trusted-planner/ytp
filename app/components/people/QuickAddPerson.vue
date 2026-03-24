<template>
  <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-semibold text-gray-800">
        Add New Person
      </h4>
      <button
        type="button"
        class="text-xs text-gray-400 hover:text-gray-600"
        @click="$emit('cancel')"
      >
        Cancel
      </button>
    </div>

    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <UiInput
          v-model="form.firstName"
          label="First Name"
          required
          :error="errors.firstName"
          @blur="onFieldBlur"
        />
        <UiInput
          v-model="form.lastName"
          label="Last Name"
          @blur="onFieldBlur"
        />
      </div>
      <UiInput
        v-model="form.email"
        label="Email"
        type="email"
        :error="errors.email"
        @blur="onFieldBlur"
      />
      <UiPhoneInput
        v-model="form.phone"
        label="Phone"
        @blur="onFieldBlur"
      />

      <UiDuplicateWarning
        :matches="duplicateMatches"
        :acknowledged="duplicateAcknowledged"
        @acknowledge="duplicateAcknowledged = true"
      />

      <div class="flex justify-end gap-2 pt-1">
        <UiButton
          variant="outline"
          size="sm"
          @click="$emit('cancel')"
        >
          Cancel
        </UiButton>
        <UiButton
          size="sm"
          :disabled="!canSubmit"
          :is-loading="saving"
          @click="handleSubmit"
        >
          {{ submitButtonLabel }}
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDuplicateCheck } from '~/composables/useDuplicateCheck'

const props = withDefaults(defineProps<{
  initialFirstName?: string
  initialLastName?: string
  submitLabel?: string
}>(), {
  initialFirstName: '',
  initialLastName: '',
  submitLabel: 'Add Person'
})

const emit = defineEmits<{
  'person-created': [person: { id: string; name: string; email: string | null; phone: string | null }]
  'cancel': []
}>()

const {
  duplicateMatches,
  duplicateAcknowledged,
  canSubmitDespiteDuplicates,
  checkForDuplicates,
  resetDuplicates
} = useDuplicateCheck()

const form = ref({
  firstName: props.initialFirstName,
  lastName: props.initialLastName,
  email: '',
  phone: ''
})

const saving = ref(false)
const errors = ref<Record<string, string>>({})

const submitButtonLabel = computed(() => {
  if (!canSubmitDespiteDuplicates.value) return 'Review duplicates above'
  return props.submitLabel
})

const canSubmit = computed(() => {
  return form.value.firstName.trim().length > 0 && canSubmitDespiteDuplicates.value && !saving.value
})

function onFieldBlur() {
  checkForDuplicates({
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    email: form.value.email,
    phone: form.value.phone
  })
}

function validate(): boolean {
  errors.value = {}
  if (!form.value.firstName.trim()) {
    errors.value.firstName = 'First name is required'
  }
  if (form.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Invalid email address'
  }
  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  if (!canSubmitDespiteDuplicates.value) return

  saving.value = true
  try {
    const result = await $fetch<{ success: boolean; person: { id: string; fullName: string; email: string | null; phone: string | null } }>('/api/people/quick-add', {
      method: 'POST',
      body: {
        firstName: form.value.firstName.trim(),
        lastName: form.value.lastName.trim() || undefined,
        email: form.value.email.trim() || undefined,
        phone: form.value.phone.trim() || undefined
      }
    })

    if (result.success) {
      emit('person-created', {
        id: result.person.id,
        name: result.person.fullName,
        email: result.person.email,
        phone: result.person.phone
      })
      // Reset for potential reuse
      form.value = { firstName: '', lastName: '', email: '', phone: '' }
      resetDuplicates()
    }
  } catch (err: any) {
    const toast = useToast()
    toast.error(err.data?.message || 'Failed to add person')
  } finally {
    saving.value = false
  }
}
</script>
