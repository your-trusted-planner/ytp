<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">My Matters</h1>
        <p class="text-gray-600 mt-1">View your active legal matters</p>
      </div>
    </div>

    <!-- Matters List -->
    <UiCard>
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading matters...</p>
      </div>
      <div v-else-if="matters.length === 0" class="text-center py-12">
        <p class="text-gray-500">No matters found</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matter Title</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Started</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="matter in matters" :key="matter.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ matter.title }}</div>
                <div class="text-xs text-gray-500">{{ matter.matterNumber }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <UiBadge :variant="getStatusVariant(matter.status)">
                  {{ matter.status }}
                </UiBadge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">
                  {{ matter.contractDate ? formatDate(matter.contractDate) : '-' }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-500 max-w-xs truncate">{{ matter.description }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const matters = ref<any[]>([])
const loading = ref(true)

// TODO: Create a specific API endpoint for "My Matters" that filters by logged-in user
// For now, we reuse the admin one but we need to secure it server-side or filter client-side (not ideal for prod)
// In a real implementation, we'd add /api/my-matters
const fetchMatters = async () => {
  loading.value = true
  try {
    // This is a placeholder. Real implementation needs `GET /api/my-matters`
    const response = await $fetch<{ matters: any[] }>('/api/matters') 
    matters.value = response.matters || response
  } catch (error) {
    console.error('Failed to fetch matters:', error)
  } finally {
    loading.value = false
  }
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'OPEN': return 'success'
    case 'PENDING': return 'warning'
    case 'CLOSED': return 'default'
    default: return 'default'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
  fetchMatters()
})
</script>
