<template>
  <div class="bg-white rounded-lg shadow-sm border border-slate-200">
    <!-- Header -->
    <div class="border-b border-slate-200 px-6 py-4">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold text-slate-900">Additional Grantor</h3>
          <p class="text-sm text-slate-600 mt-1">
            Add a spouse or co-trustee with separate login access
          </p>
        </div>
        <button
          v-if="!showForm && grantors.length === 0"
          @click="showForm = true"
          class="px-4 py-2 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors text-sm"
        >
          + Add Additional Grantor
        </button>
      </div>
    </div>

    <!-- Existing Grantors List -->
    <div v-if="grantors.length > 0 && !showForm" class="p-6">
      <div class="space-y-4">
        <div
          v-for="grantor in grantors"
          :key="grantor.user_id"
          class="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-[#C41E3A] transition-colors"
        >
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-full bg-[#0A2540] flex items-center justify-center text-white font-semibold">
              {{ grantor.first_name?.[0] }}{{ grantor.last_name?.[0] }}
            </div>
            <div>
              <p class="font-medium text-slate-900">
                {{ grantor.first_name }} {{ grantor.last_name }}
              </p>
              <p class="text-sm text-slate-600">{{ grantor.email }}</p>
              <p class="text-xs text-slate-500 mt-1">
                {{ grantor.relationship }} • Status: {{ grantor.status }}
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              Linked
            </span>
          </div>
        </div>
      </div>

      <button
        v-if="grantors.length > 0"
        @click="showForm = true"
        class="mt-4 w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors text-sm"
      >
        + Add Another Grantor
      </button>
    </div>

    <!-- Add Grantor Form -->
    <div v-if="showForm" class="p-6">
      <form @submit.prevent="addGrantor" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">First Name *</label>
            <input
              v-model="formData.firstName"
              type="text"
              required
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Last Name *</label>
            <input
              v-model="formData.lastName"
              type="text"
              required
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
          <input
            v-model="formData.email"
            type="email"
            required
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
          />
          <p class="text-xs text-slate-500 mt-1">
            This will be their login username
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
          <input
            v-model="formData.phone"
            type="tel"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Relationship *</label>
          <select
            v-model="formData.relationship"
            required
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
          >
            <option value="">Select relationship</option>
            <option value="SPOUSE">Spouse</option>
            <option value="CO_TRUSTEE">Co-Trustee</option>
            <option value="PARTNER">Partner</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Set Password *</label>
          <input
            v-model="formData.password"
            type="password"
            required
            minlength="8"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
          />
          <p class="text-xs text-slate-500 mt-1">
            Minimum 8 characters - they can change this after logging in
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Confirm Password *</label>
          <input
            v-model="formData.confirmPassword"
            type="password"
            required
            minlength="8"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent"
          />
        </div>

        <!-- Info Box -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800">How it works</h3>
              <div class="mt-2 text-sm text-blue-700">
                <ul class="list-disc list-inside space-y-1">
                  <li>Both accounts will have separate logins</li>
                  <li>Both will sign the same engagement letter</li>
                  <li>Payment will be combined (not separate)</li>
                  <li>All documents will be accessible to both</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            @click="cancelForm"
            class="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-6 py-2 bg-[#C41E3A] text-white rounded-lg font-semibold hover:bg-[#a31830] transition-colors disabled:opacity-50"
          >
            {{ loading ? 'Creating Account...' : 'Add Grantor' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Empty State -->
    <div v-if="!showForm && grantors.length === 0" class="p-12 text-center">
      <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
      </div>
      <h3 class="text-sm font-medium text-slate-900">No additional grantor added</h3>
      <p class="mt-1 text-sm text-slate-500">
        If you're establishing a trust with your spouse or a co-trustee, add them here.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const showForm = ref(false)
const loading = ref(false)
const grantors = ref<any[]>([])

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  relationship: '',
  password: '',
  confirmPassword: '',
})

onMounted(async () => {
  await loadGrantors()
})

const loadGrantors = async () => {
  try {
    const response = await $fetch('/api/client/grantor/list')
    grantors.value = response.additionalGrantors || []
  } catch (error) {
    console.error('Failed to load grantors:', error)
  }
}

const addGrantor = async () => {
  if (formData.value.password !== formData.value.confirmPassword) {
    alert('Passwords do not match')
    return
  }

  loading.value = true
  try {
    await $fetch('/api/client/grantor/add', {
      method: 'POST',
      body: {
        email: formData.value.email,
        firstName: formData.value.firstName,
        lastName: formData.value.lastName,
        phone: formData.value.phone,
        relationship: formData.value.relationship,
        password: formData.value.password,
      },
    })

    await loadGrantors()
    cancelForm()
    alert('Additional grantor account created successfully! They can now log in with their email and password.')
  } catch (error: any) {
    console.error('Failed to add grantor:', error)
    alert(error.data?.message || 'Failed to add grantor. Please try again.')
  } finally {
    loading.value = false
  }
}

const cancelForm = () => {
  showForm.value = false
  formData.value = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    relationship: '',
    password: '',
    confirmPassword: '',
  }
}
</script>

