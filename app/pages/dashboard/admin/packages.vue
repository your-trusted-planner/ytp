<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-slate-900">Service Package Configuration</h1>
      <p class="text-slate-600 mt-2">Configure packages for WYDAPT and other services</p>
    </div>

    <!-- Service Selection -->
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <label class="block text-sm font-medium text-slate-700 mb-2">Select Service</label>
      <select
        v-model="selectedServiceId"
        @change="loadPackages"
        class="w-full max-w-md px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
      >
        <option value="">Select a service...</option>
        <option v-for="service in services" :key="service.id" :value="service.id">
          {{ service.name }} - ${{ service.price / 100 }}
        </option>
      </select>
    </div>

    <!-- Packages List -->
    <div v-if="selectedServiceId" class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold text-slate-900">Packages</h2>
        <button
          @click="openCreateModal"
          class="px-4 py-2 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors"
        >
          + Add Package
        </button>
      </div>

      <!-- Packages Grid -->
      <div v-if="packages.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="pkg in packages"
          :key="pkg.id"
          class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
        >
          <div class="flex justify-between items-start mb-4">
            <div>
              <span class="inline-block px-2 py-1 bg-[#0A2540] text-white text-xs font-bold rounded">
                Package {{ pkg.package_number }}
              </span>
              <h3 class="text-lg font-semibold text-slate-900 mt-2">{{ pkg.package_name }}</h3>
            </div>
            <div class="flex space-x-2">
              <button
                @click="editPackage(pkg)"
                class="text-slate-600 hover:text-[#C41E3A]"
                title="Edit"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button
                @click="deletePackage(pkg.id)"
                class="text-slate-600 hover:text-red-600"
                title="Delete"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>

          <p v-if="pkg.package_description" class="text-sm text-slate-600 mb-4">
            {{ pkg.package_description }}
          </p>

          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-slate-600">Documents Included:</span>
              <span class="font-semibold">{{ getDocumentCount(pkg) }}</span>
            </div>
            <div v-if="pkg.additional_fee > 0" class="flex justify-between text-sm">
              <span class="text-slate-600">Additional Fee:</span>
              <span class="font-semibold text-[#C41E3A]">+${{ pkg.additional_fee / 100 }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-600">Status:</span>
              <span
                :class="pkg.is_active ? 'text-green-600' : 'text-slate-400'"
                class="font-semibold"
              >
                {{ pkg.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
        <p class="text-slate-600">No packages configured for this service yet.</p>
        <button
          @click="openCreateModal"
          class="mt-4 px-6 py-2 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors"
        >
          Create First Package
        </button>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h3 class="text-xl font-semibold text-slate-900">
            {{ editingPackage ? 'Edit Package' : 'Create Package' }}
          </h3>
          <button @click="closeModal" class="text-slate-400 hover:text-slate-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form @submit.prevent="savePackage" class="p-6 space-y-6">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Package Number *</label>
            <input
              v-model.number="packageForm.packageNumber"
              type="number"
              min="1"
              required
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
              placeholder="e.g., 1, 2, 3, 4"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Package Name *</label>
            <input
              v-model="packageForm.packageName"
              type="text"
              required
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
              placeholder="e.g., Basic Trust, Complete Estate"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              v-model="packageForm.packageDescription"
              rows="3"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
              placeholder="Describe what's included in this package"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Additional Fee (optional)
            </label>
            <div class="relative">
              <span class="absolute left-4 top-2 text-slate-600">$</span>
              <input
                v-model.number="packageForm.additionalFeeDollars"
                type="number"
                min="0"
                step="0.01"
                class="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <p class="text-xs text-slate-500 mt-1">Additional cost on top of base service price</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Included Document Templates *
            </label>
            <div class="border border-slate-300 rounded-lg p-4 max-h-60 overflow-y-auto">
              <div v-if="templates.length === 0" class="text-slate-500 text-sm text-center py-4">
                Loading templates...
              </div>
              <label
                v-for="template in templates"
                :key="template.id"
                class="flex items-start space-x-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="template.id"
                  v-model="packageForm.includedDocuments"
                  class="mt-1 text-[#C41E3A] focus:ring-[#C41E3A]"
                />
                <div class="flex-1">
                  <div class="text-sm font-medium text-slate-900">{{ template.name }}</div>
                  <div class="text-xs text-slate-500">{{ template.category }}</div>
                </div>
              </label>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              Selected: {{ packageForm.includedDocuments.length }} document(s)
            </p>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              @click="closeModal"
              class="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-6 py-2 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save Package' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
})

const selectedServiceId = ref('')
const packages = ref<any[]>([])
const services = ref<any[]>([])
const templates = ref<any[]>([])
const showModal = ref(false)
const saving = ref(false)
const editingPackage = ref<any>(null)

const packageForm = ref({
  packageNumber: 1,
  packageName: '',
  packageDescription: '',
  additionalFeeDollars: 0,
  includedDocuments: [] as string[],
})

// Load services on mount
onMounted(async () => {
  await loadServices()
  await loadTemplates()
})

const loadServices = async () => {
  try {
    const response = await $fetch('/api/catalog')
    services.value = response.services || response || []
  } catch (error) {
    console.error('Failed to load services:', error)
  }
}

const loadTemplates = async () => {
  try {
    const response = await $fetch('/api/templates')
    templates.value = response.templates || []
  } catch (error) {
    console.error('Failed to load templates:', error)
  }
}

const loadPackages = async () => {
  if (!selectedServiceId.value) return
  
  try {
    const response = await $fetch(`/api/service-packages/${selectedServiceId.value}`)
    packages.value = response.packages || []
  } catch (error) {
    console.error('Failed to load packages:', error)
  }
}

const openCreateModal = () => {
  editingPackage.value = null
  packageForm.value = {
    packageNumber: packages.value.length + 1,
    packageName: '',
    packageDescription: '',
    additionalFeeDollars: 0,
    includedDocuments: [],
  }
  showModal.value = true
}

const editPackage = (pkg: any) => {
  editingPackage.value = pkg
  packageForm.value = {
    packageNumber: pkg.package_number,
    packageName: pkg.package_name,
    packageDescription: pkg.package_description || '',
    additionalFeeDollars: pkg.additional_fee / 100,
    includedDocuments: JSON.parse(pkg.included_documents),
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingPackage.value = null
}

const savePackage = async () => {
  if (packageForm.value.includedDocuments.length === 0) {
    alert('Please select at least one document template')
    return
  }

  saving.value = true
  try {
    await $fetch('/api/service-packages', {
      method: 'POST',
      body: {
        serviceCatalogId: selectedServiceId.value,
        packageNumber: packageForm.value.packageNumber,
        packageName: packageForm.value.packageName,
        packageDescription: packageForm.value.packageDescription,
        includedDocuments: packageForm.value.includedDocuments,
        additionalFee: Math.round(packageForm.value.additionalFeeDollars * 100),
      },
    })

    await loadPackages()
    closeModal()
  } catch (error) {
    console.error('Failed to save package:', error)
    alert('Failed to save package. Please try again.')
  } finally {
    saving.value = false
  }
}

const deletePackage = async (packageId: string) => {
  if (!confirm('Are you sure you want to delete this package?')) return

  try {
    // TODO: Implement delete endpoint
    alert('Delete functionality coming soon')
  } catch (error) {
    console.error('Failed to delete package:', error)
  }
}

const getDocumentCount = (pkg: any) => {
  try {
    return JSON.parse(pkg.included_documents).length
  } catch {
    return 0
  }
}
</script>

