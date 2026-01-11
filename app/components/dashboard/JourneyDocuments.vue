<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h3 class="text-lg font-semibold text-gray-900">Step Documents</h3>
      <UiButton v-if="isLawyer" @click="showAddDocumentModal = true" size="sm">
        <IconPlus class="w-4 h-4 mr-1" />
        Add Document
      </UiButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-8">
      <IconLoader class="w-6 h-6 animate-spin text-burgundy-600" />
    </div>

    <!-- Empty State -->
    <div v-else-if="documents.length === 0" class="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
      <IconFileText class="w-12 h-12 mx-auto text-gray-400 mb-3" />
      <p class="text-gray-600">No documents for this step yet</p>
      <UiButton v-if="isLawyer" @click="showAddDocumentModal = true" size="sm" class="mt-3">
        Add First Document
      </UiButton>
    </div>

    <!-- Documents List -->
    <div v-else class="space-y-3">
      <div
        v-for="doc in documents"
        :key="doc.id"
        class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900 mb-1">{{ doc.title }}</h4>
            <p v-if="doc.description" class="text-sm text-gray-600 mb-2">{{ doc.description }}</p>
            
            <div class="flex items-center space-x-3 text-xs">
              <span class="text-gray-500">{{ doc.category }}</span>
              <span
                :class="[
                  'px-2 py-1 rounded-full font-medium',
                  doc.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  doc.status === 'SIGNED' ? 'bg-blue-100 text-blue-700' :
                  doc.status === 'VIEWED' ? 'bg-yellow-100 text-yellow-700' :
                  doc.status === 'SENT' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-600'
                ]"
              >
                {{ formatStatus(doc.status) }}
              </span>
              <span v-if="doc.requires_notary" class="inline-flex items-center text-burgundy-600">
                <IconShield class="w-3 h-3 mr-1" />
                Requires Notary
              </span>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button
              v-if="doc.status === 'DRAFT' && isLawyer"
              @click="sendDocument(doc.id)"
              class="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
            >
              Send to Client
            </button>
            <button
              v-else
              @click="viewDocument(doc.id)"
              class="text-sm text-gray-600 hover:text-gray-700 font-medium"
            >
              View
            </button>
            <button
              v-if="doc.requires_notary && doc.status === 'SIGNED'"
              @click="requestNotarization(doc.id)"
              class="text-sm text-burgundy-600 hover:text-burgundy-700 font-medium"
            >
              Request Notarization
            </button>
          </div>
        </div>

        <!-- Notarization Status -->
        <div v-if="doc.requires_notary && doc.notarization_status" class="mt-3 pt-3 border-t border-gray-100">
          <div class="flex items-center text-sm">
            <IconShield class="w-4 h-4 mr-2 text-burgundy-600" />
            <span class="text-gray-700">Notarization Status:</span>
            <span
              :class="[
                'ml-2 px-2 py-1 rounded-full text-xs font-medium',
                doc.notarization_status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                doc.notarization_status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              ]"
            >
              {{ formatNotaryStatus(doc.notarization_status) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Document Modal -->
    <UiModal v-model="showAddDocumentModal" title="Add Document to Step" size="lg">
      <form @submit.prevent="addDocument" class="space-y-4">
        <UiSelect
          v-model="newDocForm.templateId"
          label="Select Template"
          required
        >
          <option value="">-- Choose Template --</option>
          <option v-for="template in templates" :key="template.id" :value="template.id">
            {{ template.name }}
          </option>
        </UiSelect>

        <UiInput
          v-model="newDocForm.title"
          label="Document Title"
          placeholder="e.g., Smith Family Trust Agreement"
          required
        />

        <UiTextarea
          v-model="newDocForm.description"
          label="Description (Optional)"
          placeholder="Additional notes about this document..."
          :rows="3"
        />

        <div class="flex justify-end space-x-3 pt-4">
          <UiButton type="button" variant="ghost" @click="showAddDocumentModal = false">
            Cancel
          </UiButton>
          <UiButton type="submit" :loading="adding">
            Add Document
          </UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { Plus as IconPlus, Loader as IconLoader, FileText as IconFileText, Shield as IconShield } from 'lucide-vue-next'

const props = defineProps({
  clientJourneyId: {
    type: String,
    required: true
  },
  stepId: {
    type: String,
    required: true
  },
  isLawyer: {
    type: Boolean,
    default: false
  }
})

const loading = ref(true)
const adding = ref(false)
const documents = ref([])
const templates = ref([])
const showAddDocumentModal = ref(false)

const newDocForm = ref({
  templateId: '',
  title: '',
  description: ''
})

// Fetch documents for this step
async function fetchDocuments() {
  loading.value = true
  try {
    // TODO: Create endpoint to get documents for a step/client journey
    // For now, using placeholder
    documents.value = []
  } catch (error) {
    console.error('Error fetching documents:', error)
  } finally {
    loading.value = false
  }
}

// Fetch templates
async function fetchTemplates() {
  try {
    const { templates: data } = await $fetch('/api/templates')
    templates.value = data
  } catch (error) {
    console.error('Error fetching templates:', error)
  }
}

// Add document
async function addDocument() {
  adding.value = true
  try {
    // Create document from template
    await $fetch('/api/documents', {
      method: 'POST',
      body: {
        templateId: newDocForm.value.templateId,
        title: newDocForm.value.title,
        description: newDocForm.value.description,
        clientJourneyId: props.clientJourneyId,
        stepId: props.stepId
      }
    })
    showAddDocumentModal.value = false
    newDocForm.value = { templateId: '', title: '', description: '' }
    await fetchDocuments()
  } catch (error) {
    console.error('Error adding document:', error)
  } finally {
    adding.value = false
  }
}

// Send document to client
async function sendDocument(docId: string) {
  try {
    await $fetch(`/api/documents/${docId}/send`, {
      method: 'POST'
    })
    await fetchDocuments()
  } catch (error) {
    console.error('Error sending document:', error)
  }
}

// View document
function viewDocument(docId: string) {
  // Navigate to document viewer
  navigateTo(`/documents/${docId}`)
}

// Request notarization
async function requestNotarization(docId: string) {
  try {
    const result = await $fetch(`/api/documents/${docId}/request-notarization`, {
      method: 'POST'
    })
    alert(`Notarization requested! Signing URL: ${result.signingUrl}`)
    await fetchDocuments()
  } catch (error) {
    console.error('Error requesting notarization:', error)
  }
}

// Format status
function formatStatus(status: string) {
  const map = {
    'DRAFT': 'Draft',
    'SENT': 'Sent',
    'VIEWED': 'Viewed',
    'SIGNED': 'Signed',
    'COMPLETED': 'Completed'
  }
  return map[status] || status
}

// Format notary status
function formatNotaryStatus(status: string) {
  const map = {
    'NOT_REQUIRED': 'Not Required',
    'PENDING': 'Pending',
    'SCHEDULED': 'Scheduled',
    'COMPLETED': 'Completed'
  }
  return map[status] || status
}

onMounted(() => {
  fetchDocuments()
  if (props.isLawyer) {
    fetchTemplates()
  }
})
</script>

