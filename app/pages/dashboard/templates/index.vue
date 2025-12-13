<template>
  <div class="space-y-6">
    <div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h1 class="text-3xl font-bold text-gray-900">Document Templates</h1>
          <UiHelpLink topic="documents" title="Learn about documents and templates" />
        </div>
        <UiButton @click="showUploadModal = true">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Upload Template
        </UiButton>
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

    <!-- Upload Template Modal -->
    <UiModal v-model="showUploadModal" title="Upload New Template" size="lg">
      <form @submit.prevent="handleUpload" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Upload Document (DOCX) *
          </label>
          <input
            ref="fileInput"
            type="file"
            accept=".docx"
            @change="handleFileSelect"
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-burgundy-50 file:text-burgundy-700 hover:file:bg-burgundy-100"
            required
          />
          <p class="mt-1 text-xs text-gray-500">
            Upload a Word document (.docx) with personalization fields like &#123;&#123;clientName&#125;&#125;, [[TrustName]], or &lt;&lt;Address&gt;&gt;
          </p>
        </div>

        <UiInput
          v-model="uploadForm.name"
          label="Template Name"
          placeholder="Leave blank to use filename"
        />

        <UiTextarea
          v-model="uploadForm.description"
          label="Description"
          placeholder="Brief description of this template..."
          rows="2"
        />

        <UiSelect v-model="uploadForm.category" label="Category">
          <option value="General">General</option>
          <option value="Trust">Trust</option>
          <option value="LLC">LLC</option>
          <option value="Engagement">Engagement Letter</option>
          <option value="Affidavit">Affidavit</option>
          <option value="Certificate">Certificate</option>
          <option value="Meeting Minutes">Meeting Minutes</option>
          <option value="Questionnaire">Questionnaire</option>
        </UiSelect>

        <div v-if="uploadResult" class="bg-green-50 border border-green-200 rounded p-4">
          <h4 class="font-semibold text-green-900 mb-2">✅ Template Created Successfully!</h4>
          <div class="text-sm text-green-800 space-y-1">
            <p><strong>Name:</strong> {{ uploadResult.name }}</p>
            <p><strong>Category:</strong> {{ uploadResult.category }}</p>
            <p><strong>Variables Found:</strong> {{ uploadResult.variableCount }}</p>
            <p v-if="uploadResult.requiresNotary" class="text-burgundy-700">
              ⚠️ This template requires notarization
            </p>
            <div v-if="uploadResult.variables.length > 0" class="mt-2">
              <p class="font-medium mb-1">Personalization Fields:</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="variable in uploadResult.variables.slice(0, 10)"
                  :key="variable"
                  class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono"
                >
                  {{ variable }}
                </span>
                <span v-if="uploadResult.variables.length > 10" class="text-xs text-green-700">
                  +{{ uploadResult.variables.length - 10 }} more
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <UiButton type="button" variant="ghost" @click="closeUploadModal">
            {{ uploadResult ? 'Done' : 'Cancel' }}
          </UiButton>
          <UiButton v-if="!uploadResult" type="submit" :loading="uploading">
            Upload & Extract Variables
          </UiButton>
        </div>
      </form>
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
const uploading = ref(false)
const showUseTemplateModal = ref(false)
const showViewTemplateModal = ref(false)
const showUploadModal = ref(false)
const selectedTemplate = ref<any>(null)
const viewingTemplate = ref<any>(null)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploadResult = ref<any>(null)

const useTemplateForm = ref({
  clientId: '',
  title: '',
  description: ''
})

const uploadForm = ref({
  name: '',
  description: '',
  category: 'General'
})

const templateVariables = computed(() => {
  const template = selectedTemplate.value || viewingTemplate.value
  if (!template || !template.variables) return []
  
  try {
    const parsed = JSON.parse(template.variables)
    // Handle both array of strings and array of objects
    if (Array.isArray(parsed)) {
      return parsed.map(v => {
        // If it's an object, try to extract the name/key
        if (typeof v === 'object' && v !== null) {
          return v.name || v.key || v.variable || JSON.stringify(v)
        }
        // If it's a string, return as is
        return String(v)
      })
    }
    return []
  } catch (error) {
    console.error('Error parsing template variables:', error, template.variables)
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

// Handle file selection
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
  }
}

// Upload template
async function handleUpload() {
  if (!selectedFile.value) {
    alert('Please select a file')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('name', uploadForm.value.name)
    formData.append('description', uploadForm.value.description)
    formData.append('category', uploadForm.value.category)

    const result = await $fetch('/api/templates/upload', {
      method: 'POST',
      body: formData
    })

    uploadResult.value = result.template
    
    // Refresh templates list
    await fetchTemplates()
  } catch (error: any) {
    console.error('Failed to upload template:', error)
    alert(`Error uploading template: ${error.data?.message || error.message || 'Unknown error'}`)
  } finally {
    uploading.value = false
  }
}

// Close upload modal and reset
function closeUploadModal() {
  showUploadModal.value = false
  setTimeout(() => {
    uploadForm.value = {
      name: '',
      description: '',
      category: 'General'
    }
    selectedFile.value = null
    uploadResult.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }, 300)
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
  } catch (error: any) {
    console.error('Failed to generate document:', error)
    alert(`Error generating document: ${error.data?.message || error.message || 'Unknown error'}`)
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

