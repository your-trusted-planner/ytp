<template>
  <UiModal :modelValue="true" title="Create Invoice" size="lg" @update:modelValue="$emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Matter Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Matter <span class="text-red-500">*</span>
        </label>
        <UiAutocomplete
          v-model="form.matterId"
          :options="matters"
          :label-key="getMatterLabel"
          value-key="id"
          :sublabel-key="getMatterSublabel"
          placeholder="Search for a matter..."
          :loading="loadingMatters"
          @select="handleMatterSelect"
        />
        <p v-if="matters.length === 0 && !loadingMatters" class="text-xs text-amber-600 mt-1">
          No matters found. Create a matter first before creating an invoice.
        </p>
      </div>

      <!-- Line Items -->
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="block text-sm font-medium text-gray-700">
            Line Items <span class="text-red-500">*</span>
          </label>
          <button
            type="button"
            @click="addLineItem"
            class="text-sm text-burgundy-600 hover:text-burgundy-700"
          >
            + Add Item
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="(item, index) in form.lineItems"
            :key="index"
            class="p-3 bg-gray-50 rounded-lg space-y-2"
          >
            <!-- Row 1: Type selector and Catalog selector -->
            <div class="flex gap-2 items-start">
              <div class="w-36">
                <select
                  v-model="item.itemType"
                  @change="handleItemTypeChange(item)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 bg-white"
                >
                  <option v-for="type in ITEM_TYPES" :key="type.value" :value="type.value">
                    {{ type.label }}
                  </option>
                </select>
              </div>
              <div v-if="item.itemType === 'SERVICE' && catalogItems.length > 0" class="flex-1">
                <select
                  :value="item.catalogId || ''"
                  @change="handleCatalogSelect(item, ($event.target as HTMLSelectElement).value || null)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500 bg-white"
                >
                  <option value="">Custom item (no catalog)</option>
                  <option v-for="catalogItem in catalogItems" :key="catalogItem.id" :value="catalogItem.id">
                    {{ catalogItem.name }} - {{ formatCurrency(catalogItem.price) }}
                  </option>
                </select>
              </div>
              <div v-else class="flex-1"></div>
              <button
                v-if="form.lineItems.length > 1"
                type="button"
                @click="removeLineItem(index)"
                class="p-2 text-gray-400 hover:text-red-600"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <!-- Row 2: Description, Qty, Price, Total -->
            <div class="flex gap-2 items-start">
              <div class="flex-1">
                <input
                  v-model="item.description"
                  type="text"
                  placeholder="Description"
                  required
                  :disabled="!!item.catalogId"
                  :class="[
                    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500',
                    item.catalogId ? 'bg-gray-100 text-gray-600' : ''
                  ]"
                />
              </div>
              <div class="w-20">
                <input
                  v-model.number="item.quantity"
                  type="number"
                  min="1"
                  placeholder="Qty"
                  required
                  :disabled="isQuantityDisabled(item)"
                  :class="[
                    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500',
                    isQuantityDisabled(item) ? 'bg-gray-100 text-gray-600' : ''
                  ]"
                />
              </div>
              <div class="w-28">
                <div class="relative">
                  <span class="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    v-model.number="item.unitPriceDollars"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    required
                    :disabled="!!item.catalogId"
                    :class="[
                      'w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500',
                      item.catalogId ? 'bg-gray-100 text-gray-600' : ''
                    ]"
                  />
                </div>
              </div>
              <div class="w-24 text-right">
                <div class="py-2 text-sm font-medium text-gray-900">
                  {{ formatCurrency(item.quantity * (item.unitPriceDollars || 0) * 100) }}
                </div>
              </div>
              <!-- Spacer to match delete button width when hidden -->
              <div v-if="form.lineItems.length === 1" class="w-8"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Totals -->
      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex justify-between text-sm mb-2">
          <span class="text-gray-600">Subtotal</span>
          <span class="font-medium">{{ formatCurrency(subtotal) }}</span>
        </div>
        <div v-if="form.discountAmount > 0" class="flex justify-between text-sm mb-2">
          <span class="text-gray-600">Discount</span>
          <span class="font-medium text-green-600">-{{ formatCurrency(form.discountAmount * 100) }}</span>
        </div>
        <div class="flex justify-between text-lg font-bold border-t pt-2 mt-2">
          <span>Total</span>
          <span>{{ formatCurrency(total) }}</span>
        </div>
      </div>

      <!-- Optional Fields -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input
            v-model="form.dueDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Discount ($)</label>
          <input
            v-model.number="form.discountAmount"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          v-model="form.notes"
          rows="2"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-burgundy-500"
          placeholder="Add any notes for the client..."
        ></textarea>
      </div>

      <!-- Client Trust Balance Info -->
      <div v-if="clientTrustBalance > 0" class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-center gap-2">
          <Landmark class="w-5 h-5 text-green-600" />
          <span class="text-green-800">
            Client has <strong>{{ formatCurrency(clientTrustBalance) }}</strong> in trust
          </span>
        </div>
        <p class="text-sm text-green-700 mt-1">
          You can apply trust funds after creating the invoice.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-4 border-t">
        <UiButton type="button" variant="secondary" @click="$emit('close')">
          Cancel
        </UiButton>
        <UiButton type="submit" :disabled="!isValid || submitting">
          {{ submitting ? 'Creating...' : 'Create Invoice' }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import { X, Landmark } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', invoice: any): void
}>()

const toast = useToast()

interface CatalogItem {
  id: string
  name: string
  description?: string
  category?: string
  price: number // in cents
}

interface LineItem {
  description: string
  quantity: number
  unitPriceDollars: number
  itemType: string
  catalogId?: string
}

// Item types from schema
const ITEM_TYPES = [
  { value: 'SERVICE', label: 'Service' },
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'FILING_FEE', label: 'Filing Fee' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'OTHER', label: 'Other' }
] as const

// Item types that should have quantity locked to 1
const FIXED_QUANTITY_TYPES = ['FILING_FEE', 'EXPENSE', 'ADJUSTMENT']

const form = ref({
  matterId: '',
  lineItems: [{ description: '', quantity: 1, unitPriceDollars: 0, itemType: 'SERVICE', catalogId: undefined }] as LineItem[],
  dueDate: '',
  discountAmount: 0,
  notes: ''
})

const matters = ref<any[]>([])
const catalogItems = ref<CatalogItem[]>([])
const clientTrustBalance = ref(0)
const submitting = ref(false)
const loadingMatters = ref(true)
const loadingCatalog = ref(true)

// Check if quantity should be disabled for this line item
function isQuantityDisabled(item: LineItem): boolean {
  return FIXED_QUANTITY_TYPES.includes(item.itemType) || !!item.catalogId
}

// Handle item type change
function handleItemTypeChange(item: LineItem) {
  // If switching to a fixed-quantity type, set quantity to 1
  if (FIXED_QUANTITY_TYPES.includes(item.itemType)) {
    item.quantity = 1
  }
  // Clear catalog selection if switching away from SERVICE (catalog items are services)
  if (item.itemType !== 'SERVICE') {
    item.catalogId = undefined
  }
}

// Handle catalog item selection
function handleCatalogSelect(item: LineItem, catalogId: string | null) {
  if (catalogId) {
    const catalogItem = catalogItems.value.find(c => c.id === catalogId)
    if (catalogItem) {
      item.catalogId = catalogId
      item.description = catalogItem.name
      item.unitPriceDollars = catalogItem.price / 100 // Convert cents to dollars
      item.quantity = 1 // Catalog items are fixed quantity
      item.itemType = 'SERVICE'
    }
  } else {
    item.catalogId = undefined
  }
}

// Helper to get matter label for autocomplete
function getMatterLabel(matter: any): string {
  return matter.title || matter.name || 'Untitled Matter'
}

// Helper to get matter sublabel (client name + matter number)
function getMatterSublabel(matter: any): string {
  const clientName = matter.clientName || matter.client_name || ''
  const matterNumber = matter.matterNumber || matter.matter_number || ''
  const parts = []
  if (clientName) parts.push(clientName)
  if (matterNumber) parts.push(`#${matterNumber}`)
  return parts.join(' • ')
}

// Fetch matters and catalog items on mount
onMounted(async () => {
  // Fetch matters
  try {
    loadingMatters.value = true
    const response = await $fetch<any>('/api/matters')
    // Handle both array and object response formats
    if (Array.isArray(response)) {
      matters.value = response
    } else if (response?.matters) {
      matters.value = response.matters
    } else {
      matters.value = []
    }
  } catch (error) {
    console.error('Failed to fetch matters:', error)
    matters.value = []
  } finally {
    loadingMatters.value = false
  }

  // Fetch service catalog items
  try {
    loadingCatalog.value = true
    const response = await $fetch<{ catalog: CatalogItem[] }>('/api/service-catalog')
    catalogItems.value = response.catalog || []
  } catch (error) {
    console.error('Failed to fetch catalog:', error)
    catalogItems.value = []
  } finally {
    loadingCatalog.value = false
  }

  // Set default due date to 30 days from now
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)
  form.value.dueDate = dueDate.toISOString().split('T')[0]
})

// Calculate subtotal
const subtotal = computed(() => {
  return form.value.lineItems.reduce((sum, item) => {
    return sum + (item.quantity * (item.unitPriceDollars || 0) * 100)
  }, 0)
})

// Calculate total
const total = computed(() => {
  return subtotal.value - (form.value.discountAmount * 100)
})

// Check if form is valid
const isValid = computed(() => {
  return form.value.matterId &&
    form.value.lineItems.length > 0 &&
    form.value.lineItems.every(item =>
      item.description.trim() &&
      item.quantity > 0 &&
      item.unitPriceDollars > 0
    )
})

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

function addLineItem() {
  form.value.lineItems.push({
    description: '',
    quantity: 1,
    unitPriceDollars: 0,
    itemType: 'SERVICE',
    catalogId: undefined
  })
}

function removeLineItem(index: number) {
  form.value.lineItems.splice(index, 1)
}

async function handleMatterSelect(matter: any) {
  if (!matter) {
    clientTrustBalance.value = 0
    return
  }

  // Get client trust balance for the selected matter's client
  const clientId = matter.clientId || matter.client_id
  if (clientId) {
    try {
      const response = await $fetch<{ totalBalance: number }>(`/api/trust/clients/${clientId}/balance`)
      clientTrustBalance.value = response.totalBalance || 0
    } catch (error) {
      clientTrustBalance.value = 0
    }
  }
}

async function handleSubmit() {
  if (!isValid.value || submitting.value) return

  submitting.value = true

  try {
    const response = await $fetch<{ invoice: any }>('/api/invoices', {
      method: 'POST',
      body: {
        matterId: form.value.matterId,
        lineItems: form.value.lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Math.round(item.unitPriceDollars * 100), // Convert to cents
          itemType: item.itemType,
          catalogId: item.catalogId || undefined
        })),
        dueDate: form.value.dueDate ? new Date(form.value.dueDate).toISOString() : undefined,
        discountAmount: Math.round(form.value.discountAmount * 100),
        notes: form.value.notes || undefined
      }
    })

    toast.success('Invoice created successfully')
    emit('created', response.invoice)
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to create invoice')
  } finally {
    submitting.value = false
  }
}
</script>
