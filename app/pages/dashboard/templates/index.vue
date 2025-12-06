<template>
  <div class="space-y-6">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold text-gray-900">Document Templates</h1>
        <UiHelpLink topic="documents" title="Learn about documents and templates" />
      </div>
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
          class="p-4 border border-gray-200 rounded-lg hover:border-burgundy-500 hover:bg-burgundy-50 transition-colors"
          @click="viewTemplate(template)"
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
            <button 
              @click.stop="openUseTemplateModal(template)"
              class="text-sm text-accent-600 hover:text-accent-900 cursor-pointer"
            >
              Use Template
            </button>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- Use Template Modal -->
    <UiModal v-model="showUseTemplateModal" title="Generate Document from Template" size="lg">
      <div v-if="selectedTemplate" class="space-y-4">
        <div class="bg-gray-50 p-4 rounded">
          <h4 class="font-semibold text-gray-900">{{ selectedTemplate.name }}</h4>
          <p class="text-sm text-gray-600 mt-1">{{ selectedTemplate.category }}</p>
          <div v-if="templateVariables.length > 0" class="mt-3">
            <p class="text-sm font-medium text-gray-700">Variables found: {{ templateVariables.length }}</p>
            <div class="text-xs text-gray-600 mt-1">
              {{ templateVariables.slice(0, 5).join(', ') }}
              <span v-if="templateVariables.length > 5">... and {{ templateVariables.length - 5 }} more</span>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <UiSelect v-model="useTemplateForm.clientId" label="Select Client *" required>
            <option value="">-- Choose Client --</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ client.first_name }} {{ client.last_name }} ({{ client.email }})
            </option>
          </UiSelect>

          <UiInput
            v-model="useTemplateForm.title"
            label="Document Title *"
            placeholder="e.g., Smith Family Trust Agreement"
            required
          />

          <UiTextarea
            v-model="useTemplateForm.description"
            label="Description (Optional)"
            placeholder="Additional notes about this document..."
            rows="2"
          />

          <div class="bg-blue-50 border border-blue-200 rounded p-3">
            <p class="text-sm text-blue-800">
              <strong>Next Step:</strong> After creating, you'll be able to fill in custom data like trust name, trustee names, etc.
            </p>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <UiButton type="button" variant="ghost" @click="showUseTemplateModal = false">
            Cancel
          </UiButton>
          <UiButton @click="generateDocument" :loading="generating">
            Generate Document
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- View Template Modal -->
    <UiModal v-model="showViewTemplateModal" title="Template Preview" size="xl">
      <div v-if="viewingTemplate" class="space-y-4">
        <div class="bg-gray-50 p-4 rounded">
          <h4 class="font-semibold text-gray-900">{{ viewingTemplate.name }}</h4>
          <div class="grid grid-cols-2 gap-4 mt-3 text-sm">
            <div>
              <span class="text-gray-600">Category:</span>
              <span class="ml-2 font-medium">{{ viewingTemplate.category }}</span>
            </div>
            <div>
              <span class="text-gray-600">Status:</span>
              <span class="ml-2">
                <UiBadge :variant="viewingTemplate.isActive ? 'success' : 'default'">
                  {{ viewingTemplate.isActive ? 'Active' : 'Inactive' }}
                </UiBadge>
              </span>
            </div>
            <div v-if="viewingTemplate.requires_notary">
              <span class="text-burgundy-600 font-medium">⚠️ Requires Notarization</span>
            </div>
          </div>
        </div>

        <div v-if="templateVariables.length > 0" class="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <h5 class="font-semibold text-yellow-900 mb-2">Template Variables ({{ templateVariables.length }})</h5>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="variable in templateVariables"
              :key="variable"
              class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-mono"
            >
              {{ variable }}
            </span>
          </div>
        </div>

        <div class="border border-gray-200 rounded p-4 max-h-96 overflow-auto">
          <h5 class="font-semibold text-gray-900 mb-3">Template Content Preview</h5>
          <div class="prose prose-sm max-w-none" v-html="viewingTemplate.content"></div>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <UiButton type="button" variant="ghost" @click="showViewTemplateModal = false">
            Close
          </UiButton>
          <UiButton @click="openUseTemplateFromView">
            Use This Template
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const router = useRouter()
const templates = ref<any[]>([])
const clients = ref<any[]>([])
const loading = ref(true)
const generating = ref(false)
const showUseTemplateModal = ref(false)
const showViewTemplateModal = ref(false)
const selectedTemplate = ref<any>(null)
const viewingTemplate = ref<any>(null)

const useTemplateForm = ref({
  clientId: '',
  title: '',
  description: ''
})

const templateVariables = computed(() => {
  const template = selectedTemplate.value || viewingTemplate.value
  if (!template || !template.variables) return []
  try {
    return JSON.parse(template.variables)
  } catch {
    return []
  }
})

// Fetch templates
async function fetchTemplates() {
  loading.value = true
  try {
    templates.value = await $fetch('/api/templates')
  } catch (error) {
    console.error('Failed to fetch templates:', error)
  } finally {
    loading.value = false
  }
}

// Fetch clients for dropdown
async function fetchClients() {
  try {
    const data = await $fetch('/api/clients')
    clients.value = data.clients || []
  } catch (error) {
    console.error('Failed to fetch clients:', error)
  }
}

// View template details
function viewTemplate(template: any) {
  viewingTemplate.value = template
  showViewTemplateModal.value = true
}

// Open use template modal
function openUseTemplateModal(template: any) {
  selectedTemplate.value = template
  useTemplateForm.value = {
    clientId: '',
    title: template.name,
    description: ''
  }
  showUseTemplateModal.value = true
}

// Open use template from view modal
function openUseTemplateFromView() {
  showViewTemplateModal.value = false
  selectedTemplate.value = viewingTemplate.value
  useTemplateForm.value = {
    clientId: '',
    title: selectedTemplate.value.name,
    description: ''
  }
  showUseTemplateModal.value = true
}

// Generate document from template
async function generateDocument() {
  if (!useTemplateForm.value.clientId) {
    alert('Please select a client')
    return
  }

  generating.value = true
  try {
    const { document } = await $fetch('/api/documents/generate-from-template', {
      method: 'POST',
      body: {
        templateId: selectedTemplate.value.id,
        clientId: useTemplateForm.value.clientId,
        title: useTemplateForm.value.title,
        description: useTemplateForm.value.description
      }
    })

    showUseTemplateModal.value = false
    
    // Navigate to document detail page
    router.push(`/dashboard/documents/${document.id}`)
  } catch (error) {
    console.error('Failed to generate document:', error)
    alert(`Error generating document: ${error.message || 'Unknown error'}`)
  } finally {
    generating.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    fetchTemplates(),
    fetchClients()
  ])
})
</script>

