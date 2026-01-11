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
            :rows="2"
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
          <div class="mt-2 text-xs space-y-1">
            <p class="text-gray-600">
              <strong>Variable Syntax:</strong> &#123;&#123;variableName&#125;&#125;
            </p>
            <p class="text-gray-600">
              <strong>Allowed characters:</strong> Letters, numbers, underscores (_), hyphens (-)
            </p>
            <p class="text-red-600">
              <strong>Not allowed:</strong> Pipes (|), dots (.), spaces, or other special characters
            </p>
            <p class="text-gray-500">
              Example: &#123;&#123;trustee_name&#125;&#125; or &#123;&#123;trustee-name&#125;&#125; ✓
            </p>
          </div>
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
          :rows="2"
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
          </div>
        </div>

        <!-- Variable Mapping Interface -->
        <div v-if="uploadResult && uploadResult.variables.length > 0" class="border border-gray-300 rounded-lg p-4 space-y-4">
          <div class="flex justify-between items-center">
            <h4 class="font-semibold text-gray-900">Map Variables to Database Fields</h4>
            <button
              @click="showMappingHelp = !showMappingHelp"
              class="text-xs text-blue-600 hover:text-blue-800"
            >
              {{ showMappingHelp ? 'Hide Help' : 'Show Help' }}
            </button>
          </div>

          <div v-if="showMappingHelp" class="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            <p class="font-medium mb-1">How Variable Mapping Works:</p>
            <ul class="list-disc list-inside space-y-1 text-xs">
              <li>Mapped variables automatically pull data from the database</li>
              <li>Unmapped variables can be filled manually when generating documents</li>
              <li>Mapped variables cannot be edited in documents (they stay in sync with the database)</li>
              <li>You can change mappings anytime by editing the template</li>
            </ul>
          </div>

          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="variable in uploadResult.variables"
              :key="variable"
              class="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded"
            >
              <div class="col-span-3">
                <code class="text-sm font-mono text-gray-900">{{ variable }}</code>
              </div>

              <div class="col-span-4">
                <select
                  v-model="variableMappings[variable].source"
                  @change="onSourceChange(variable)"
                  class="w-full text-sm border-gray-300 rounded-md"
                >
                  <option value="">Not Mapped (Manual Entry)</option>
                  <option value="client">Client Data</option>
                  <option value="matter">Matter Data</option>
                </select>
              </div>

              <div class="col-span-5">
                <select
                  v-model="variableMappings[variable].field"
                  :disabled="!variableMappings[variable].source"
                  class="w-full text-sm border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">-- Select Field --</option>
                  <optgroup v-if="variableMappings[variable].source === 'client'" label="Client Fields">
                    <option value="firstName">First Name</option>
                    <option value="lastName">Last Name</option>
                    <option value="fullName">Full Name</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="address">Address</option>
                    <option value="city">City</option>
                    <option value="state">State</option>
                    <option value="zipCode">ZIP Code</option>
                  </optgroup>
                  <optgroup v-if="variableMappings[variable].source === 'matter'" label="Matter Fields">
                    <option value="title">Matter Title</option>
                    <option value="matterNumber">Matter Number</option>
                    <option value="status">Status</option>
                    <option value="contractDate">Contract Date</option>
                    <option value="description">Description</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-3 border-t">
            <UiButton @click="saveMappings" :loading="savingMappings" size="sm">
              Save Mappings
            </UiButton>
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
    <UiModal v-model="showViewTemplateModal" :title="editingTemplateDetails ? 'Edit Template Details' : 'Template Preview'" size="xl">
      <div v-if="viewingTemplate" class="space-y-4">
        <div v-if="!editingTemplateDetails" class="bg-gray-50 p-4 rounded">
          <div class="flex justify-between items-start">
            <h4 class="font-semibold text-gray-900">{{ viewingTemplate.name }}</h4>
            <button
              @click="startEditingTemplate"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit Details
            </button>
          </div>
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

        <!-- Edit Form -->
        <div v-if="editingTemplateDetails" class="space-y-4 bg-gray-50 p-4 rounded">
          <UiInput
            v-model="templateEditForm.name"
            label="Template Name"
            placeholder="Enter template name"
            required
          />

          <UiTextarea
            v-model="templateEditForm.description"
            label="Description"
            placeholder="Brief description..."
            :rows="2"
          />

          <UiSelect v-model="templateEditForm.category" label="Category">
            <option value="General">General</option>
            <option value="Trust">Trust</option>
            <option value="LLC">LLC</option>
            <option value="Engagement">Engagement Letter</option>
            <option value="Affidavit">Affidavit</option>
            <option value="Certificate">Certificate</option>
            <option value="Meeting Minutes">Meeting Minutes</option>
            <option value="Questionnaire">Questionnaire</option>
          </UiSelect>

          <div class="flex items-center space-x-2">
            <input
              type="checkbox"
              v-model="templateEditForm.isActive"
              id="isActive"
              class="h-4 w-4 text-burgundy-600 focus:ring-burgundy-500 border-gray-300 rounded"
            />
            <label for="isActive" class="text-sm text-gray-700">
              Active (available for use)
            </label>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t">
            <UiButton variant="ghost" @click="cancelEditingTemplate">
              Cancel
            </UiButton>
            <UiButton @click="saveTemplateDetails" :loading="savingTemplateDetails">
              Save Changes
            </UiButton>
          </div>
        </div>

        <div v-if="templateVariables.length > 0" class="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <div class="flex justify-between items-center mb-2">
            <h5 class="font-semibold text-yellow-900">Template Variables ({{ templateVariables.length }})</h5>
            <button
              v-if="!editingMappings"
              @click="startEditingMappings"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit Variable Mappings
            </button>
          </div>
          <div v-if="!editingMappings" class="flex flex-wrap gap-2">
            <span
              v-for="variable in templateVariables"
              :key="variable"
              class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-mono"
            >
              {{ variable }}
            </span>
          </div>
        </div>

        <!-- Variable Mapping Editor (Existing Templates) -->
        <div v-if="editingMappings && templateVariables.length > 0" class="border border-gray-300 rounded-lg p-4 space-y-4">
          <div class="flex justify-between items-center">
            <h4 class="font-semibold text-gray-900">Edit Variable Mappings</h4>
            <button
              @click="showMappingHelp = !showMappingHelp"
              class="text-xs text-blue-600 hover:text-blue-800"
            >
              {{ showMappingHelp ? 'Hide Help' : 'Show Help' }}
            </button>
          </div>

          <div v-if="showMappingHelp" class="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            <p class="font-medium mb-1">How Variable Mapping Works:</p>
            <ul class="list-disc list-inside space-y-1 text-xs">
              <li>Mapped variables automatically pull data from the database</li>
              <li>Unmapped variables can be filled manually when generating documents</li>
              <li>Mapped variables cannot be edited in documents (they stay in sync with the database)</li>
              <li>You can change mappings anytime by editing the template</li>
            </ul>
          </div>

          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="variable in templateVariables"
              :key="variable"
              class="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded"
            >
              <div class="col-span-3">
                <code class="text-sm font-mono text-gray-900">{{ variable }}</code>
              </div>

              <div class="col-span-4">
                <select
                  v-model="variableMappings[variable].source"
                  @change="onSourceChange(variable)"
                  class="w-full text-sm border-gray-300 rounded-md"
                >
                  <option value="">Not Mapped (Manual Entry)</option>
                  <option value="client">Client Data</option>
                  <option value="matter">Matter Data</option>
                </select>
              </div>

              <div class="col-span-5">
                <select
                  v-model="variableMappings[variable].field"
                  :disabled="!variableMappings[variable].source"
                  class="w-full text-sm border-gray-300 rounded-md disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="">-- Select Field --</option>
                  <optgroup v-if="variableMappings[variable].source === 'client'" label="Client Fields">
                    <option value="firstName">First Name</option>
                    <option value="lastName">Last Name</option>
                    <option value="fullName">Full Name</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="address">Address</option>
                    <option value="city">City</option>
                    <option value="state">State</option>
                    <option value="zipCode">ZIP Code</option>
                  </optgroup>
                  <optgroup v-if="variableMappings[variable].source === 'matter'" label="Matter Fields">
                    <option value="title">Matter Title</option>
                    <option value="matterNumber">Matter Number</option>
                    <option value="status">Status</option>
                    <option value="contractDate">Contract Date</option>
                    <option value="description">Description</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-3 border-t">
            <UiButton variant="ghost" @click="cancelEditingMappings">
              Cancel
            </UiButton>
            <UiButton @click="saveExistingTemplateMappings" :loading="savingMappings">
              Save Mappings
            </UiButton>
          </div>
        </div>

        <div class="border border-gray-200 rounded p-4 max-h-96 overflow-auto">
          <h5 class="font-semibold text-gray-900 mb-3">Template Content Preview</h5>
          <div class="prose prose-sm max-w-none" v-html="sanitizedTemplateContent"></div>
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
const savingMappings = ref(false)
const savingTemplateDetails = ref(false)
const showUseTemplateModal = ref(false)
const showViewTemplateModal = ref(false)
const showUploadModal = ref(false)
const showMappingHelp = ref(false)
const editingTemplateDetails = ref(false)
const editingMappings = ref(false)
const selectedTemplate = ref<any>(null)
const viewingTemplate = ref<any>(null)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploadResult = ref<any>(null)
const variableMappings = ref<Record<string, { source: string, field: string }>>({})

const templateEditForm = ref({
  name: '',
  description: '',
  category: 'General',
  isActive: true
})

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

// Sanitize template content to prevent XSS attacks when rendering with v-html
const sanitizedTemplateContent = useSanitizedHtml(() => viewingTemplate.value?.content)

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
  editingTemplateDetails.value = false
  editingMappings.value = false
  showViewTemplateModal.value = true
}

// Start editing template details
function startEditingTemplate() {
  if (!viewingTemplate.value) return

  templateEditForm.value = {
    name: viewingTemplate.value.name,
    description: viewingTemplate.value.description || '',
    category: viewingTemplate.value.category,
    isActive: viewingTemplate.value.isActive
  }
  editingTemplateDetails.value = true
}

// Cancel editing template
function cancelEditingTemplate() {
  editingTemplateDetails.value = false
  templateEditForm.value = {
    name: '',
    description: '',
    category: 'General',
    isActive: true
  }
}

// Save template details
async function saveTemplateDetails() {
  if (!viewingTemplate.value || !templateEditForm.value.name) {
    alert('Template name is required')
    return
  }

  savingTemplateDetails.value = true
  try {
    await $fetch(`/api/templates/${viewingTemplate.value.id}`, {
      method: 'PUT',
      body: templateEditForm.value
    })

    // Update the viewing template
    viewingTemplate.value.name = templateEditForm.value.name
    viewingTemplate.value.description = templateEditForm.value.description
    viewingTemplate.value.category = templateEditForm.value.category
    viewingTemplate.value.isActive = templateEditForm.value.isActive

    // Refresh templates list
    await fetchTemplates()

    editingTemplateDetails.value = false
    alert('Template updated successfully!')
  } catch (error: any) {
    console.error('Failed to update template:', error)
    alert(`Error updating template: ${error.data?.message || error.message || 'Unknown error'}`)
  } finally {
    savingTemplateDetails.value = false
  }
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

    // Initialize variable mappings object
    if (result.template.variables && result.template.variables.length > 0) {
      const mappings: Record<string, { source: string, field: string }> = {}
      result.template.variables.forEach((variable: string) => {
        mappings[variable] = { source: '', field: '' }
      })
      variableMappings.value = mappings
    }

    // Refresh templates list
    await fetchTemplates()
  } catch (error: any) {
    console.error('Failed to upload template:', error)
    alert(`Error uploading template: ${error.data?.message || error.message || 'Unknown error'}`)
  } finally {
    uploading.value = false
  }
}

// Handle source change - reset field selection
function onSourceChange(variable: string) {
  variableMappings.value[variable].field = ''
}

// Start editing variable mappings for existing template
function startEditingMappings() {
  if (!viewingTemplate.value) return

  // Initialize variable mappings with existing mappings if available
  const mappings: Record<string, { source: string, field: string }> = {}

  // Parse existing variable mappings
  let existingMappings: Record<string, { source: string, field: string }> = {}
  if (viewingTemplate.value.variable_mappings || viewingTemplate.value.variableMappings) {
    try {
      const mappingsStr = viewingTemplate.value.variable_mappings || viewingTemplate.value.variableMappings
      existingMappings = typeof mappingsStr === 'string' ? JSON.parse(mappingsStr) : mappingsStr
    } catch (error) {
      console.error('Error parsing existing mappings:', error)
    }
  }

  // Initialize mappings for all variables
  templateVariables.value.forEach((variable: string) => {
    mappings[variable] = existingMappings[variable] || { source: '', field: '' }
  })

  variableMappings.value = mappings
  editingMappings.value = true
}

// Cancel editing variable mappings
function cancelEditingMappings() {
  editingMappings.value = false
  variableMappings.value = {}
  showMappingHelp.value = false
}

// Save variable mappings for existing template
async function saveExistingTemplateMappings() {
  if (!viewingTemplate.value) return

  savingMappings.value = true
  try {
    // Filter out unmapped variables
    const mappings: Record<string, { source: string, field: string }> = {}
    Object.entries(variableMappings.value).forEach(([variable, mapping]) => {
      if (mapping.source && mapping.field) {
        mappings[variable] = mapping
      }
    })

    await $fetch(`/api/templates/${viewingTemplate.value.id}/mappings`, {
      method: 'PUT',
      body: { mappings }
    })

    // Update the viewing template's mappings
    viewingTemplate.value.variable_mappings = JSON.stringify(mappings)
    viewingTemplate.value.variableMappings = JSON.stringify(mappings)

    alert('Variable mappings saved successfully!')
    editingMappings.value = false

    // Refresh templates list
    await fetchTemplates()
  } catch (error: any) {
    console.error('Failed to save mappings:', error)
    alert(`Error saving mappings: ${error.data?.message || error.message || 'Unknown error'}`)
  } finally {
    savingMappings.value = false
  }
}

// Save variable mappings
async function saveMappings() {
  if (!uploadResult.value) return

  savingMappings.value = true
  try {
    // Filter out unmapped variables
    const mappings: Record<string, { source: string, field: string }> = {}
    Object.entries(variableMappings.value).forEach(([variable, mapping]) => {
      if (mapping.source && mapping.field) {
        mappings[variable] = mapping
      }
    })

    await $fetch(`/api/templates/${uploadResult.value.id}/mappings`, {
      method: 'PUT',
      body: { mappings }
    })

    alert('Variable mappings saved successfully!')
  } catch (error: any) {
    console.error('Failed to save mappings:', error)
    alert(`Error saving mappings: ${error.data?.message || error.message || 'Unknown error'}`)
  } finally {
    savingMappings.value = false
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
    variableMappings.value = {}
    showMappingHelp.value = false
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
    router.push(`/documents/${document.id}`)
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

