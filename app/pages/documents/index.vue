<template>
  <div class="space-y-6">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold text-gray-900">Documents</h1>
        <UiHelpLink :topic="isLawyer ? 'documents' : 'client-documents'" title="Learn about documents" />
      </div>
      <p class="text-gray-600 mt-1">View and manage your documents</p>
    </div>

    <UiCard>
      <div v-if="loading" class="text-center py-12">
        <p class="text-gray-500">Loading documents...</p>
      </div>
      <div v-else-if="documents.length === 0" class="text-center py-12">
        <p class="text-gray-500">No documents yet</p>
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="doc in documents"
          :key="doc.id"
          class="p-4 border border-gray-200 rounded-lg hover:border-burgundy-500 hover:bg-burgundy-50 transition-colors"
        >
          <div class="flex justify-between items-center">
            <div class="flex-1">
              <h3 class="font-semibold text-gray-900">{{ doc.title }}</h3>
              <p v-if="doc.description" class="text-sm text-gray-600 mt-1">
                {{ doc.description }}
              </p>
              <p class="text-sm text-gray-500 mt-1">
                Created {{ formatDate(doc.createdAt) }}
              </p>
            </div>
            <div class="flex items-center space-x-3">
              <UiBadge
                :variant="
                  doc.status === 'SIGNED' || doc.status === 'COMPLETED' ? 'success' :
                  doc.status === 'SENT' || doc.status === 'VIEWED' ? 'warning' :
                  'default'
                "
              >
                {{ doc.status }}
              </UiBadge>
              <NuxtLink
                :to="`/documents/${doc.id}`"
                class="text-sm text-accent-600 hover:text-accent-900"
              >
                View
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatDate } from '~/utils/format'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const { data: sessionData } = await useFetch('/api/auth/session')
const isLawyer = computed(() => {
  const role = sessionData.value?.user?.role
  return role === 'LAWYER' || role === 'ADMIN'
})

const documents = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    documents.value = await $fetch('/api/client/documents')
  } catch (error) {
    console.error('Failed to fetch documents:', error)
  } finally {
    loading.value = false
  }
})
</script>

