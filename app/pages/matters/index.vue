<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Matters & Services</h1>
        <p class="text-gray-600 mt-1">Manage your service offerings and product inventory</p>
      </div>
      <UiButton @click="showAddModal = true">
        Add Matter
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
            <UiBadge :variant="matter.type === 'RECURRING' ? 'info' : 'default'">
              {{ matter.type }}
            </UiBadge>
          </div>
          
          <p v-if="matter.description" class="text-sm text-gray-600 mb-4">
            {{ matter.description }}
          </p>
          
          <div class="space-y-2 border-t border-gray-200 pt-4">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Price:</span>
              <span class="font-semibold text-gray-900">{{ formatPrice(matter.price) }}</span>
            </div>
            <div v-if="matter.type === 'RECURRING' && matter.duration" class="flex justify-between text-sm">
              <span class="text-gray-600">Billing:</span>
              <span class="font-medium text-gray-700">{{ matter.duration }}</span>
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
    <UiModal v-model="showAddModal" :title="editingMatter ? 'Edit Matter' : 'Add New Matter'" size="lg">
      <form @submit.prevent="handleSaveMatter" class="space-y-4">
        <UiInput
          v-model="matterForm.name"
          label="Matter Name"
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
          <UiInput
            v-model="matterForm.category"
            label="Category"
            placeholder="e.g., Trust, LLC Formation"
          />
          
          <UiSelect
            v-model="matterForm.type"
            label="Type"
            required
          >
            <option value="SINGLE">Single Matter (One-time)</option>
            <option value="RECURRING">Recurring Matter (Ongoing)</option>
          </UiSelect>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <UiInput
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
      </form>
      
      <template #footer>
        <UiButton variant="outline" @click="closeModal">
          Cancel
        </UiButton>
        <UiButton @click="handleSaveMatter" :is-loading="saving">
          {{ editingMatter ? 'Update' : 'Create' }} Matter
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const matters = ref<any[]>([])
const showAddModal = ref(false)
const saving = ref(false)
const editingMatter = ref<any>(null)

const matterForm = ref({
  name: '',
  description: '',
  category: '',
  type: 'SINGLE',
  price: '',
  duration: ''
})

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

const fetchMatters = async () => {
  try {
    matters.value = await $fetch('/api/matters')
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
    duration: matter.duration || ''
  }
  showAddModal.value = true
}

const toggleMatterStatus = async (matter: any) => {
  try {
    await $fetch(`/api/matters/${matter.id}`, {
      method: 'PUT',
      body: { isActive: !matter.isActive }
    })
    await fetchMatters()
  } catch (error) {
    alert('Failed to update matter status')
  }
}

const handleSaveMatter = async () => {
  saving.value = true
  try {
    const payload = {
      ...matterForm.value,
      price: parseFloat(matterForm.value.price)
    }
    
    if (editingMatter.value) {
      await $fetch(`/api/matters/${editingMatter.value.id}`, {
        method: 'PUT',
        body: payload
      })
    } else {
      await $fetch('/api/matters', {
        method: 'POST',
        body: payload
      })
    }
    
    closeModal()
    await fetchMatters()
  } catch (error: any) {
    alert(error.data?.message || 'Failed to save matter')
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
    duration: ''
  }
}

onMounted(() => {
  fetchMatters()
})
</script>



