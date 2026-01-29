<template>
  <UiModal title="Create Trust Account" @close="$emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Account Name <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.accountName"
          type="text"
          required
          placeholder="Client Trust Account"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Account Type <span class="text-red-500">*</span>
        </label>
        <select
          v-model="form.accountType"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        >
          <option value="IOLTA">IOLTA</option>
          <option value="NON_IOLTA">Non-IOLTA Trust</option>
          <option value="ESCROW">Escrow</option>
        </select>
        <p class="text-xs text-gray-500 mt-1">
          IOLTA (Interest on Lawyer Trust Accounts) is required in most jurisdictions.
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Bank Name
        </label>
        <input
          v-model="form.bankName"
          type="text"
          placeholder="First National Bank"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Account Number (Last 4)
          </label>
          <input
            v-model="form.accountNumberLast4"
            type="text"
            maxlength="4"
            placeholder="1234"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
          <p class="text-xs text-gray-500 mt-1">
            For identification only - not stored fully
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Routing Number
          </label>
          <input
            v-model="form.routingNumber"
            type="text"
            maxlength="9"
            placeholder="123456789"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>
      </div>

      <!-- IOLTA Notice -->
      <div v-if="form.accountType === 'IOLTA'" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-start gap-2">
          <Info class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p class="text-blue-800 font-medium text-sm">IOLTA Compliance</p>
            <p class="text-blue-700 text-sm mt-1">
              Interest earned on IOLTA accounts is remitted to your state bar foundation
              to fund legal services for those in need. Ensure your bank is an approved
              IOLTA depository.
            </p>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t">
        <UiButton type="button" variant="secondary" @click="$emit('close')">
          Cancel
        </UiButton>
        <UiButton type="submit" :disabled="!isValid || submitting">
          {{ submitting ? 'Creating...' : 'Create Account' }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { Info } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', account: any): void
}>()

const toast = useToast()

const form = ref({
  accountName: 'Client Trust Account',
  accountType: 'IOLTA',
  bankName: '',
  accountNumberLast4: '',
  routingNumber: ''
})

const submitting = ref(false)

const isValid = computed(() => {
  return form.value.accountName.trim() && form.value.accountType
})

async function handleSubmit() {
  if (!isValid.value || submitting.value) return

  submitting.value = true

  try {
    const response = await $fetch<{ account: any }>('/api/trust/accounts', {
      method: 'POST',
      body: {
        accountName: form.value.accountName,
        accountType: form.value.accountType,
        bankName: form.value.bankName || undefined,
        accountNumberLast4: form.value.accountNumberLast4 || undefined,
        routingNumber: form.value.routingNumber || undefined
      }
    })

    toast.success('Trust account created successfully')
    emit('created', response.account)
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to create trust account')
  } finally {
    submitting.value = false
  }
}
</script>
