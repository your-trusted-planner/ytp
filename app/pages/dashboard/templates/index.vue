<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Document Templates</h1>
      <p class="text-gray-600 mt-1">Manage your legal document templates</p>
    </div>

    <UiCard>
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading templates...</p>
      </div>
      <div v-else-if="templates.length === 0" class="text-center py-12">
        <p class="text-gray-500">No templates yet</p>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="template in templates"
          :key="template.id"
          class="p-4 border border-gray-200 rounded-lg hover:border-burgundy-500 hover:bg-burgundy-50 transition-colors cursor-pointer"
        >
          <h3 class="font-semibold text-gray-900">{{ template.name }}</h3>
          <p class="text-sm text-gray-600 mt-1">{{ template.category }}</p>
          <p v-if="template.description" class="text-sm text-gray-500 mt-2">
            {{ template.description }}
          </p>
          <div class="mt-3 flex items-center justify-between">
            <UiBadge :variant="template.isActive ? 'success' : 'default'">
              {{ template.isActive ? 'Active' : 'Inactive' }}
            </UiBadge>
            <button class="text-sm text-accent-600 hover:text-accent-900">
              Use Template
            </button>
          </div>
        </div>
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

const templates = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    templates.value = await $fetch('/api/templates')
  } catch (error) {
    console.error('Failed to fetch templates:', error)
  } finally {
    loading.value = false
  }
})
</script>

