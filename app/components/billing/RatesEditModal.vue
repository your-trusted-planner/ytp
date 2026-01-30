<template>
  <UiModal :modelValue="true" :title="`Edit Billing Rates - ${entityName}`" size="md" @update:modelValue="$emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Attorney Rate -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Attorney Hourly Rate
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            v-model.number="form.attorneyRateDollars"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-7 pr-16 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
          />
          <span class="absolute right-3 top-2 text-gray-500 text-sm">/hour</span>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Rate for users with the LAWYER role
        </p>
      </div>

      <!-- Staff Rate -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Staff Hourly Rate
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            v-model.number="form.staffRateDollars"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            class="w-full pl-7 pr-16 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
          />
          <span class="absolute right-3 top-2 text-gray-500 text-sm">/hour</span>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Rate for users with the STAFF role
        </p>
      </div>

      <!-- User-Specific Rates -->
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="block text-sm font-medium text-gray-700">
            User-Specific Rate Overrides
          </label>
          <button
            type="button"
            @click="addUserRate"
            class="text-sm text-burgundy-600 hover:text-burgundy-700"
          >
            + Add Override
          </button>
        </div>

        <p v-if="form.userRates.length === 0" class="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded-lg">
          No user-specific overrides configured.
          <button type="button" @click="addUserRate" class="text-burgundy-600 hover:underline ml-1">
            Add one
          </button>
        </p>

        <div v-else class="space-y-2">
          <div
            v-for="(userRate, index) in form.userRates"
            :key="index"
            class="flex gap-2 items-start bg-gray-50 p-3 rounded-lg"
          >
            <div class="flex-1">
              <select
                v-model="userRate.userId"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 bg-white"
                required
              >
                <option value="">Select user...</option>
                <option
                  v-for="user in availableUsers"
                  :key="user.id"
                  :value="user.id"
                  :disabled="isUserAlreadySelected(user.id, index)"
                >
                  {{ user.firstName }} {{ user.lastName }}
                </option>
              </select>
            </div>
            <div class="w-32">
              <div class="relative">
                <span class="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  v-model.number="userRate.rateDollars"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                  class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
                />
              </div>
            </div>
            <button
              type="button"
              @click="removeUserRate(index)"
              class="p-2 text-gray-400 hover:text-red-600"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          v-model="form.notes"
          rows="2"
          placeholder="Optional notes about these rates..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 resize-none"
        ></textarea>
      </div>

      <!-- Effective Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Effective Date
        </label>
        <input
          v-model="form.effectiveDate"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
        />
        <p class="text-xs text-gray-500 mt-1">
          When these rates take effect (optional)
        </p>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UiButton type="button" variant="outline" @click="$emit('close')">
          Cancel
        </UiButton>
        <UiButton
          type="submit"
          :is-loading="submitting"
          @click="handleSubmit"
        >
          Save Rates
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

interface BillingRates {
  attorneyRate: number | null
  staffRate: number | null
  userRates: Record<string, number>
  notes: string | null
  effectiveDate: Date | string | null
}

interface UserRate {
  userId: string
  rateDollars: number | null
}

const props = defineProps<{
  entityType: 'client' | 'matter'
  entityId: string
  entityName: string
  currentRates: BillingRates | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const toast = useToast()

// State
const submitting = ref(false)
const availableUsers = ref<Array<{ id: string; firstName: string; lastName: string }>>([])

// Form state
const form = reactive({
  attorneyRateDollars: null as number | null,
  staffRateDollars: null as number | null,
  userRates: [] as UserRate[],
  notes: '',
  effectiveDate: ''
})

// Initialize from current rates
if (props.currentRates) {
  form.attorneyRateDollars = props.currentRates.attorneyRate ? props.currentRates.attorneyRate / 100 : null
  form.staffRateDollars = props.currentRates.staffRate ? props.currentRates.staffRate / 100 : null
  form.notes = props.currentRates.notes || ''
  form.effectiveDate = props.currentRates.effectiveDate
    ? formatDateForInput(props.currentRates.effectiveDate)
    : ''

  // Convert userRates object to array
  if (props.currentRates.userRates) {
    for (const [userId, rate] of Object.entries(props.currentRates.userRates)) {
      form.userRates.push({ userId, rateDollars: rate / 100 })
    }
  }
}

// Fetch users for dropdown
async function fetchUsers() {
  try {
    const response = await $fetch<{ users: Array<{ id: string; firstName: string; lastName: string }> }>('/api/users', {
      query: { role: 'LAWYER,STAFF' }
    })
    availableUsers.value = response.users || []
  } catch (error) {
    console.error('Failed to fetch users:', error)
    availableUsers.value = []
  }
}

// Add user rate row
function addUserRate() {
  form.userRates.push({ userId: '', rateDollars: null })
}

// Remove user rate row
function removeUserRate(index: number) {
  form.userRates.splice(index, 1)
}

// Check if user is already selected in another row
function isUserAlreadySelected(userId: string, currentIndex: number): boolean {
  return form.userRates.some((ur, idx) => idx !== currentIndex && ur.userId === userId)
}

// Submit
async function handleSubmit() {
  submitting.value = true
  try {
    // Build user rates object
    const userRates: Record<string, number> = {}
    for (const ur of form.userRates) {
      if (ur.userId && ur.rateDollars !== null && ur.rateDollars >= 0) {
        userRates[ur.userId] = Math.round(ur.rateDollars * 100)
      }
    }

    const endpoint = props.entityType === 'client'
      ? `/api/billing-rates/clients/${props.entityId}`
      : `/api/billing-rates/matters/${props.entityId}`

    await $fetch(endpoint, {
      method: 'PUT',
      body: {
        attorneyRate: form.attorneyRateDollars !== null && form.attorneyRateDollars >= 0
          ? Math.round(form.attorneyRateDollars * 100)
          : null,
        staffRate: form.staffRateDollars !== null && form.staffRateDollars >= 0
          ? Math.round(form.staffRateDollars * 100)
          : null,
        userRates,
        notes: form.notes || null,
        effectiveDate: form.effectiveDate ? new Date(form.effectiveDate).toISOString() : null
      }
    })

    toast.success('Billing rates updated')
    emit('saved')
  } catch (error: any) {
    console.error('Failed to save billing rates:', error)
    toast.error(error.data?.message || 'Failed to save billing rates')
  } finally {
    submitting.value = false
  }
}

// Helpers
function formatDateForInput(date: Date | string | null): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0] || ''
}

// Initial fetch
onMounted(() => {
  fetchUsers()
})
</script>
