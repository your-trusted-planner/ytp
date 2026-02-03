<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Service Catalog</h1>
        <p class="text-gray-600 mt-1">Manage your service offerings and product catalog</p>
      </div>
      <UiButton @click="showAddModal = true">
        Add Catalog Item
      </UiButton>
    </div>

    <!-- Matters Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UiCard
        v-for="matter in matters"
        :key="matter.id"
        :padding="false"
        class="hover:shadow-lg transition-shadow"
      >
        <div class="p-6">
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900 text-lg">{{ matter.name }}</h3>
              <p v-if="matter.category" class="text-sm text-gray-500">{{ matter.category }}</p>
            </div>
            <UiBadge :variant="matter.type === 'RECURRING' ? 'info' : matter.type === 'HOURLY' ? 'warning' : 'default'">
              {{ matter.type }}
            </UiBadge>
          </div>
          
          <p v-if="matter.description" class="text-sm text-gray-600 mb-4">
            {{ matter.description }}
          </p>
          
          <div class="space-y-2 border-t border-gray-200 pt-4">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Price:</span>
              <span class="font-semibold text-gray-900">{{ formatCurrency(matter.price) }}</span>
            </div>
            <div v-if="matter.type === 'RECURRING' && matter.duration" class="flex justify-between text-sm">
              <span class="text-gray-600">Billing:</span>
              <span class="font-medium text-gray-700">{{ matter.duration }}</span>
            </div>
            <div v-if="matter.type === 'HOURLY' && matter.defaultAttorneyRate" class="flex justify-between text-sm">
              <span class="text-gray-600">Attorney Rate:</span>
              <span class="font-medium text-gray-700">{{ formatCurrency(matter.defaultAttorneyRate) }}/hr</span>
            </div>
            <div v-if="matter.type === 'HOURLY' && matter.defaultStaffRate" class="flex justify-between text-sm">
              <span class="text-gray-600">Staff Rate:</span>
              <span class="font-medium text-gray-700">{{ formatCurrency(matter.defaultStaffRate) }}/hr</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Status:</span>
              <UiBadge :variant="matter.isActive ? 'success' : 'default'" size="sm">
                {{ matter.isActive ? 'Active' : 'Inactive' }}
              </UiBadge>
            </div>
          </div>
          
          <div class="mt-4 flex space-x-2">
            <button
              @click="editMatter(matter)"
              class="flex-1 text-sm text-accent-600 hover:text-accent-900 font-medium"
            >
              Edit
            </button>
            <button
              @click="toggleMatterStatus(matter)"
              class="flex-1 text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              {{ matter.isActive ? 'Deactivate' : 'Activate' }}
            </button>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Add/Edit Matter Modal -->
    <UiModal v-model="showAddModal" :title="editingMatter ? 'Edit Service' : 'Add New Service'" size="lg">
      <form @submit.prevent="handleSaveMatter" class="space-y-4">
        <UiInput
          v-model="matterForm.name"
          label="Service Name"
          placeholder="e.g., Wyoming Asset Protection Trust"
          required
        />
        
        <UiTextarea
          v-model="matterForm.description"
          label="Description"
          placeholder="Detailed description of this service..."
          :rows="3"
        />
        
        <div class="grid grid-cols-2 gap-4">
          <UiSelect
            v-model="matterForm.category"
            label="Category"
            required
          >
            <option value="">Select category</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.name">
              {{ cat.name }}
            </option>
          </UiSelect>

          <UiSelect
            v-model="matterForm.type"
            label="Type"
            required
          >
            <option value="SINGLE">Single Service</option>
            <option value="RECURRING">Recurring Service</option>
            <option value="HOURLY">Hourly Service</option>
          </UiSelect>
        </div>

        <p v-if="categories.length === 0" class="text-sm text-gray-500">
          No categories defined. <NuxtLink to="/service-catalog/service-categories" class="text-burgundy-600 hover:text-burgundy-800 underline">Add categories</NuxtLink>.
        </p>
        
        <div class="grid grid-cols-2 gap-4">
          <UiInput
            v-if="matterForm.type !== 'HOURLY'"
            v-model="matterForm.price"
            label="Price ($)"
            type="number"
            step="0.01"
            placeholder="18500.00"
            required
          />

          <UiSelect
            v-if="matterForm.type === 'RECURRING'"
            v-model="matterForm.duration"
            label="Billing Cycle"
          >
            <option value="">Select frequency</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUALLY">Annually</option>
          </UiSelect>
        </div>

        <!-- Hourly rate inputs for HOURLY type -->
        <div v-if="matterForm.type === 'HOURLY'" class="grid grid-cols-2 gap-4">
          <UiInput
            v-model="matterForm.defaultAttorneyRate"
            label="Attorney Hourly Rate ($)"
            type="number"
            step="0.01"
            placeholder="350.00"
          />

          <UiInput
            v-model="matterForm.defaultStaffRate"
            label="Staff Hourly Rate ($)"
            type="number"
            step="0.01"
            placeholder="150.00"
          />
        </div>

        <p v-if="matterForm.type === 'HOURLY'" class="text-sm text-gray-500">
          Optional. If not set, billing will use the user's default hourly rate.
        </p>
      </form>
      
      <template #footer>
        <UiButton variant="outline" @click="closeModal">
          Cancel
        </UiButton>
        <UiButton @click="handleSaveMatter" :is-loading="saving">
          {{ editingMatter ? 'Update' : 'Create' }} Service
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatCurrency } from '~/utils/format'

const toast = useToast()

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

interface Category {
  id: string
  name: string
  description: string | null
  display_order: number
}

const matters = ref<any[]>([])
const categories = ref<Category[]>([])
const showAddModal = ref(false)
const saving = ref(false)
const editingMatter = ref<any>(null)

const matterForm = ref({
  name: '',
  description: '',
  category: '',
  type: 'SINGLE',
  price: '',
  duration: '',
  defaultAttorneyRate: '',
  defaultStaffRate: ''
})

const fetchCategories = async () => {
  try {
    const { categories: data } = await $fetch<{ categories: Category[] }>('/api/service-categories')
    categories.value = data
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

const fetchMatters = async () => {
  try {
    const response = await $fetch('/api/catalog')
    matters.value = response.services || response || []
  } catch (error) {
    console.error('Failed to fetch matters:', error)
  }
}

const editMatter = (matter: any) => {
  editingMatter.value = matter
  matterForm.value = {
    name: matter.name,
    description: matter.description || '',
    category: matter.category || '',
    type: matter.type,
    price: (matter.price / 100).toString(),
    duration: matter.duration || '',
    defaultAttorneyRate: matter.defaultAttorneyRate ? (matter.defaultAttorneyRate / 100).toString() : '',
    defaultStaffRate: matter.defaultStaffRate ? (matter.defaultStaffRate / 100).toString() : ''
  }
  showAddModal.value = true
}

const toggleMatterStatus = async (matter: any) => {
  try {
    await $fetch(`/api/catalog/${matter.id}`, {
      method: 'PUT',
      body: { isActive: !matter.isActive }
    })
    await fetchMatters()
  } catch (error) {
    toast.error('Failed to update service status')
  }
}

const handleSaveMatter = async () => {
  saving.value = true
  try {
    const payload: Record<string, any> = {
      ...matterForm.value
    }

    // Handle price based on type
    if (matterForm.value.type === 'HOURLY') {
      // HOURLY services use attorney/staff rates, price defaults to 0
      payload.price = matterForm.value.price ? parseFloat(matterForm.value.price) : 0
      payload.defaultAttorneyRate = parseFloat(matterForm.value.defaultAttorneyRate)
      payload.defaultStaffRate = parseFloat(matterForm.value.defaultStaffRate)
    } else {
      // Non-HOURLY services require price, clear hourly rates
      payload.price = parseFloat(matterForm.value.price)
      delete payload.defaultAttorneyRate
      delete payload.defaultStaffRate
    }
    
    if (editingMatter.value) {
      await $fetch(`/api/catalog/${editingMatter.value.id}`, {
        method: 'PUT',
        body: payload
      })
    } else {
      await $fetch('/api/catalog', {
        method: 'POST',
        body: payload
      })
    }
    
    closeModal()
    await fetchMatters()
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to save service')
  } finally {
    saving.value = false
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingMatter.value = null
  matterForm.value = {
    name: '',
    description: '',
    category: '',
    type: 'SINGLE',
    price: '',
    duration: '',
    defaultAttorneyRate: '',
    defaultStaffRate: ''
  }
}

onMounted(() => {
  fetchMatters()
  fetchCategories()
})
</script>



