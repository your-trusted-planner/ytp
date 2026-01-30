<template>
  <UiModal :modelValue="true" title="Record Trust Deposit" size="lg" @update:modelValue="$emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Client Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Client <span class="text-red-500">*</span>
        </label>
        <select
          v-model="form.clientId"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          @change="handleClientChange"
        >
          <option value="">Select a client...</option>
          <option v-for="client in clients" :key="client.id" :value="client.id">
            {{ client.firstName || client.first_name }} {{ client.lastName || client.last_name }}
          </option>
        </select>
      </div>

      <!-- Matter Selection (Optional) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Matter (Optional)
        </label>
        <select
          v-model="form.matterId"
          :disabled="!form.clientId || clientMatters.length === 0"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500 disabled:bg-gray-100"
        >
          <option value="">General (not matter-specific)</option>
          <option v-for="matter in clientMatters" :key="matter.id" :value="matter.id">
            {{ matter.title }}
          </option>
        </select>
        <p class="text-xs text-gray-500 mt-1">
          Optionally track this deposit against a specific matter
        </p>
      </div>

      <!-- Amount -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Amount <span class="text-red-500">*</span>
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            v-model.number="form.amountDollars"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Description <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.description"
          type="text"
          required
          placeholder="Retainer deposit for estate planning services"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        />
      </div>

      <!-- Reference & Check Number -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Reference Number
          </label>
          <input
            v-model="form.referenceNumber"
            type="text"
            placeholder="Wire ref, deposit slip #"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Check Number
          </label>
          <input
            v-model="form.checkNumber"
            type="text"
            placeholder="1234"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
          />
        </div>
      </div>

      <!-- Transaction Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Transaction Date <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.transactionDate"
          type="date"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-burgundy-500"
        />
      </div>

      <!-- Client Current Balance -->
      <div v-if="form.clientId && clientBalance !== null" class="bg-gray-50 rounded-lg p-4">
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-600">Current Trust Balance</span>
          <span class="text-lg font-medium text-gray-900">{{ formatCurrency(clientBalance) }}</span>
        </div>
        <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
          <span class="text-sm text-gray-600">After Deposit</span>
          <span class="text-lg font-bold text-green-600">
            {{ formatCurrency(clientBalance + (form.amountDollars || 0) * 100) }}
          </span>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t">
        <UiButton type="button" variant="secondary" @click="$emit('close')">
          Cancel
        </UiButton>
        <UiButton type="submit" :disabled="!isValid || submitting">
          {{ submitting ? 'Recording...' : 'Record Deposit' }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'deposited'): void
}>()

const toast = useToast()

const form = ref({
  clientId: '',
  matterId: '',
  amountDollars: null as number | null,
  description: '',
  referenceNumber: '',
  checkNumber: '',
  transactionDate: new Date().toISOString().split('T')[0]
})

const clients = ref<any[]>([])
const clientMatters = ref<any[]>([])
const clientBalance = ref<number | null>(null)
const submitting = ref(false)

const isValid = computed(() => {
  return form.value.clientId &&
    form.value.amountDollars &&
    form.value.amountDollars > 0 &&
    form.value.description.trim() &&
    form.value.transactionDate
})

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

async function fetchClients() {
  try {
    const response = await $fetch<{ clients: any[] }>('/api/clients')
    clients.value = response.clients
  } catch (error) {
    console.error('Failed to fetch clients:', error)
  }
}

async function handleClientChange() {
  form.value.matterId = ''
  clientMatters.value = []
  clientBalance.value = null

  if (!form.value.clientId) return

  // Fetch client's matters
  try {
    const response = await $fetch<{ matters: any[] }>(`/api/clients/${form.value.clientId}/matters`)
    clientMatters.value = response.matters || []
  } catch (error) {
    console.error('Failed to fetch client matters:', error)
  }

  // Fetch client's trust balance
  try {
    const response = await $fetch<{ totalBalance: number }>(`/api/trust/clients/${form.value.clientId}/balance`)
    clientBalance.value = response.totalBalance || 0
  } catch (error) {
    clientBalance.value = 0
  }
}

async function handleSubmit() {
  if (!isValid.value || submitting.value) return

  submitting.value = true

  try {
    await $fetch('/api/trust/deposits', {
      method: 'POST',
      body: {
        clientId: form.value.clientId,
        matterId: form.value.matterId || undefined,
        amount: Math.round((form.value.amountDollars || 0) * 100),
        description: form.value.description,
        referenceNumber: form.value.referenceNumber || undefined,
        checkNumber: form.value.checkNumber || undefined,
        transactionDate: new Date(form.value.transactionDate).toISOString()
      }
    })

    toast.success('Deposit recorded successfully')
    emit('deposited')
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to record deposit')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchClients()
})
</script>
