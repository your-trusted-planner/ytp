<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <NuxtLink to="/documents" class="text-sm text-accent-600 hover:text-accent-900 mb-2 inline-block">
          ← Back to Documents
        </NuxtLink>
        <h1 class="text-3xl font-bold text-gray-900">{{ document?.title || 'Document' }}</h1>
        <p v-if="document?.description" class="text-gray-600 mt-1">{{ document.description }}</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Actions Dropdown -->
        <div v-if="document" class="relative actions-dropdown">
          <UiButton
            variant="secondary"
            size="sm"
            @click.stop="showActionsDropdown = !showActionsDropdown"
          >
            Actions
            <ChevronDownIcon class="w-4 h-4 ml-1" />
          </UiButton>

          <!-- Dropdown Menu -->
          <div
            v-if="showActionsDropdown"
            @click="showActionsDropdown = false"
            class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50"
          >
            <button
              @click="showPreviewModal = true"
              class="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Eye class="w-4 h-4 mr-2" />
              Preview Document
            </button>
            <button
              v-if="!isSigned"
              @click="downloadDocx"
              class="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
            >
              <Download class="w-4 h-4 mr-2" />
              Download DOCX
            </button>
            <button
              v-if="isSigned && document?.signedPdfBlobKey"
              @click="downloadSignedPdf"
              class="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
            >
              <Download class="w-4 h-4 mr-2" />
              Download Signed PDF
            </button>
            <button
              v-if="canSendForSignature"
              @click="showSignatureModal = true"
              class="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
            >
              <PenTool class="w-4 h-4 mr-2" />
              Send for E-Signature
            </button>
          </div>
        </div>
        <select
          v-if="document"
          v-model="selectedStatus"
          @change="updateStatus"
          :disabled="isSigned"
          class="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-500"
          :class="{
            'bg-green-50 text-green-700 border-green-300': selectedStatus === 'SIGNED' || selectedStatus === 'COMPLETED',
            'bg-yellow-50 text-yellow-700 border-yellow-300': selectedStatus === 'SENT' || selectedStatus === 'VIEWED',
            'bg-gray-50 text-gray-700': selectedStatus === 'DRAFT',
            'opacity-60 cursor-not-allowed': isSigned
          }"
        >
          <option value="DRAFT">DRAFT</option>
          <option value="SENT">SENT</option>
          <option value="VIEWED">VIEWED</option>
          <option value="SIGNED">SIGNED</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading document...</p>
    </div>

    <div v-else-if="!document" class="text-center py-12">
      <p class="text-red-600">Document not found</p>
    </div>

    <template v-else>
      <!-- Sticky Controls Section -->
      <div class="sticky top-0 z-10 bg-gray-50 space-y-4 pb-4">
        <!-- Document Metadata (Collapsible) -->
        <UiCard>
          <div class="flex justify-between items-center cursor-pointer" @click="showMetadata = !showMetadata">
            <h3 class="text-lg font-semibold text-gray-900">Document Information</h3>
            <component :is="showMetadata ? ChevronUp : ChevronDown" class="w-5 h-5 text-gray-500" />
          </div>
          <div v-if="showMetadata" class="grid grid-cols-2 gap-4 text-sm mt-4">
            <div>
              <p class="text-gray-600">Created:</p>
              <p class="font-medium text-gray-900">{{ formatDate(document.createdAt) }}</p>
            </div>
            <div>
              <p class="text-gray-600">Status:</p>
              <p class="font-medium text-gray-900">{{ document.status }}</p>
            </div>
            <div v-if="document.sentAt">
              <p class="text-gray-600">Sent:</p>
              <p class="font-medium text-gray-900">{{ formatDateTime(document.sentAt) }}</p>
            </div>
            <div v-if="document.viewedAt">
              <p class="text-gray-600">First Viewed:</p>
              <p class="font-medium text-gray-900">{{ formatDateTime(document.viewedAt) }}</p>
            </div>
          </div>
        </UiCard>

        <!-- Variables Display (Read-only overview) -->
        <UiCard v-if="needsVariables && !isSigned">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Document Variables</h3>
            <UiButton @click="showEditVariablesModal = true" size="sm" variant="outline">
              Edit Variables
            </UiButton>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="variable in documentVariables" :key="variable.name" class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                  {{ variable.description || variable.name }}
                </label>
                <span
                  v-if="isVariableMapped(variable.name)"
                  class="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full"
                >
                  {{ getMappingSourceLabel(variable.name) }}
                </span>
              </div>
              <p class="text-sm text-gray-900 font-medium">
                {{ variableValues[variable.name] || '(Not set)' }}
              </p>
            </div>
          </div>
        </UiCard>
      </div>

      <!-- Signature Section (only for clients signing their own documents directly) -->
      <UiCard v-if="!isSigned && document.status === 'SENT' && isClientSigningOwnDocument" title="Sign Document">
        <div class="space-y-4">
          <p class="text-sm text-gray-600">
            Please sign below to complete this document. Your signature will be securely stored.
          </p>
          
          <div class="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
            <label class="block text-sm font-medium text-gray-700 mb-2">Your Signature</label>
            <canvas
              ref="signatureCanvas"
              class="border border-gray-400 rounded bg-white cursor-crosshair w-full"
              width="600"
              height="200"
              @mousedown="startDrawing"
              @mousemove="draw"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
              @touchstart="startDrawing"
              @touchmove="draw"
              @touchend="stopDrawing"
            ></canvas>
            <div class="mt-2 flex justify-between">
              <button
                type="button"
                @click="clearSignature"
                class="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Signature
              </button>
              <p class="text-xs text-gray-500">Draw your signature above</p>
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <UiButton variant="outline" @click="clearSignature">
              Clear
            </UiButton>
            <UiButton @click="handleSign" :is-loading="signing">
              Sign Document
            </UiButton>
          </div>
        </div>
      </UiCard>

      <!-- Signed Status -->
      <UiCard v-if="isSigned" title="Document Signed">
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle class="w-10 h-10 text-green-600" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Document Signed Successfully</h3>
          <p class="text-sm text-gray-600">
            Signed on {{ formatDateTime(document.signedAt) }}
          </p>
          <div v-if="document.signatureData" class="mt-6 max-w-md mx-auto border border-gray-300 rounded-lg p-4 bg-gray-50">
            <p class="text-xs text-gray-500 mb-2">Your Signature:</p>
            <img :src="document.signatureData" alt="Signature" class="max-w-full h-auto" />
          </div>
        </div>
      </UiCard>

    </template>

    <!-- Edit Variables Modal -->
    <UiModal v-model="showEditVariablesModal" title="Edit Document Variables" size="lg">
      <form @submit.prevent="handleFillVariables" class="space-y-4">
        <div class="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
          <div v-for="variable in documentVariables" :key="variable.name" class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-medium text-gray-700">
                {{ variable.description || variable.name }}
              </label>
              <span
                v-if="isVariableMapped(variable.name)"
                class="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full"
              >
                {{ getMappingSourceLabel(variable.name) }}
              </span>
            </div>
            <input
              v-model="variableValues[variable.name]"
              :placeholder="`Enter ${variable.description || variable.name}`"
              :readonly="isVariableMapped(variable.name)"
              :class="[
                'block w-full rounded-md shadow-sm sm:text-sm',
                isVariableMapped(variable.name)
                  ? 'bg-gray-100 text-gray-600 cursor-not-allowed border-gray-300'
                  : 'border-gray-300 focus:ring-burgundy-500 focus:border-burgundy-500'
              ]"
              required
            />
            <p v-if="isVariableMapped(variable.name)" class="text-xs text-gray-500 italic">
              This field is automatically populated from the database and cannot be edited.
            </p>
          </div>
        </div>
      </form>

      <template #footer>
        <UiButton variant="outline" @click="showEditVariablesModal = false">
          Cancel
        </UiButton>
        <UiButton @click="handleFillVariables" :is-loading="savingVariables">
          Update Document
        </UiButton>
      </template>
    </UiModal>

    <!-- Preview Document Modal -->
    <UiModal v-model="showPreviewModal" title="Document Preview" size="xl">
      <div class="max-h-[70vh] overflow-y-auto">
        <div class="prose max-w-none" v-html="renderedContent"></div>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="showPreviewModal = false">
          Close
        </UiButton>
        <UiButton @click="downloadDocx">
          <Download class="w-4 h-4 mr-2" />
          Download DOCX
        </UiButton>
      </template>
    </UiModal>

    <!-- E-Signature Modal -->
    <UiModal v-model="showSignatureModal" title="Send for E-Signature" size="md">
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Create a secure signing link to send to the client. They will be able to review and sign the document.
        </p>

        <!-- Signature Tier -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Signature Type</label>
          <div class="space-y-2">
            <label class="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50" :class="{ 'border-[#C41E3A] bg-red-50': signatureTier === 'STANDARD' }">
              <input type="radio" v-model="signatureTier" value="STANDARD" class="mt-1 text-[#C41E3A] focus:ring-[#C41E3A]" />
              <div class="ml-3">
                <span class="font-medium text-gray-900">Standard</span>
                <p class="text-sm text-gray-500">Email verification + audit trail. Suitable for engagement letters, permissions.</p>
              </div>
            </label>
            <label class="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50" :class="{ 'border-[#C41E3A] bg-red-50': signatureTier === 'ENHANCED' }">
              <input type="radio" v-model="signatureTier" value="ENHANCED" class="mt-1 text-[#C41E3A] focus:ring-[#C41E3A]" />
              <div class="ml-3">
                <span class="font-medium text-gray-900">Enhanced</span>
                <p class="text-sm text-gray-500">Requires identity verification. For distribution acknowledgements, affirmations.</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Expiration -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Link Expires In</label>
          <select v-model="signatureExpiry" class="w-full rounded-md border-gray-300 shadow-sm focus:border-[#C41E3A] focus:ring-[#C41E3A]">
            <option value="24h">24 hours</option>
            <option value="48h">48 hours</option>
            <option value="7d">7 days</option>
          </select>
        </div>

        <!-- Send Email Option -->
        <div class="border-t border-gray-200 pt-4">
          <label class="flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="sendSignatureEmail"
              class="rounded border-gray-300 text-[#C41E3A] focus:ring-[#C41E3A]"
            />
            <span class="ml-3 text-sm text-gray-700">Email signing link to client</span>
          </label>
          <p class="mt-1 ml-6 text-xs text-gray-500">
            Send an email notification with the signing link to {{ clientEmail || 'the client' }}
          </p>
        </div>

        <!-- Optional Message (shown when email is enabled) -->
        <div v-if="sendSignatureEmail">
          <label class="block text-sm font-medium text-gray-700 mb-2">Message (optional)</label>
          <textarea
            v-model="signatureEmailMessage"
            rows="3"
            placeholder="Add a personal message to include in the email..."
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-[#C41E3A] focus:ring-[#C41E3A] text-sm"
          ></textarea>
        </div>

        <!-- Error message -->
        <div v-if="signatureError" class="bg-red-50 border border-red-200 rounded-lg p-3">
          <p class="text-sm text-red-700">{{ signatureError }}</p>
        </div>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="showSignatureModal = false">
          Cancel
        </UiButton>
        <UiButton @click="createSignatureSession" :is-loading="creatingSession">
          Create Signing Link
        </UiButton>
      </template>
    </UiModal>

    <!-- Signing Link Created Modal -->
    <UiModal v-model="showSigningLinkModal" title="Signing Link Created" size="md">
      <div class="space-y-4">
        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <div class="flex items-center">
            <CheckCircle class="w-5 h-5 text-green-600 mr-2" />
            <span class="font-medium text-green-800">Signing session created successfully!</span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Signing URL</label>
          <div class="flex">
            <input
              type="text"
              :value="signingUrl"
              readonly
              class="flex-1 rounded-l-md border-gray-300 bg-gray-50 text-sm"
            />
            <button
              @click="copySigningUrl"
              class="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 transition-colors"
            >
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>

        <div class="text-sm text-gray-600 space-y-1">
          <p><strong>Expires:</strong> {{ signatureSessionData?.expiresAt ? new Date(signatureSessionData.expiresAt).toLocaleString() : 'N/A' }}</p>
          <p><strong>Signer:</strong> {{ signatureSessionData?.signer?.name }} ({{ signatureSessionData?.signer?.email }})</p>
          <p><strong>Type:</strong> {{ signatureSessionData?.tier }}</p>
          <p v-if="signatureSessionData?.emailSent" class="text-green-600">
            <strong>Email:</strong> Sent to {{ signatureSessionData?.signer?.email }}
          </p>
        </div>

        <div v-if="!signatureSessionData?.emailSent" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-sm text-blue-700">
            <strong>Tip:</strong> Copy this URL and send it to the client via email, or open in an incognito window to test the signing flow.
          </p>
        </div>
        <div v-else class="bg-green-50 border border-green-200 rounded-lg p-3">
          <p class="text-sm text-green-700">
            The client has been notified by email. You can also copy the link above if you need to send it through another channel.
          </p>
        </div>
      </div>

      <template #footer>
        <UiButton variant="outline" @click="showSigningLinkModal = false">
          Close
        </UiButton>
        <UiButton @click="openSigningUrl">
          Open Signing Page
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { CheckCircle, ChevronUp, ChevronDown, Download, Eye, ChevronDown as ChevronDownIcon, PenTool } from 'lucide-vue-next'
import { formatDate, formatDateTime } from '~/utils/format'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const route = useRoute()
const documentId = route.params.id as string

const document = ref<any>(null)
const loading = ref(true)
const signing = ref(false)
const savingVariables = ref(false)
const variableValues = ref<Record<string, string>>({})
const selectedStatus = ref<string>('DRAFT')

// Modal state
const showEditVariablesModal = ref(false)
const showPreviewModal = ref(false)
const showSignatureModal = ref(false)
const showSigningLinkModal = ref(false)

// E-Signature state
const signatureTier = ref<'STANDARD' | 'ENHANCED'>('STANDARD')
const signatureExpiry = ref('48h')
const creatingSession = ref(false)
const signatureError = ref('')
const signingUrl = ref('')
const signatureSessionData = ref<any>(null)
const copied = ref(false)
const sendSignatureEmail = ref(true) // Default to sending email
const signatureEmailMessage = ref('')

// Dropdown state
const showActionsDropdown = ref(false)

// Collapsible sections state
const showMetadata = ref(true)

const signatureCanvas = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const ctx = ref<CanvasRenderingContext2D | null>(null)

const isSigned = computed(() => {
  return document.value?.status === 'SIGNED' || document.value?.status === 'COMPLETED'
})

const clientEmail = computed(() => {
  return document.value?.clientEmail || null
})

// Can send for signature if document is in DRAFT status and has content
const canSendForSignature = computed(() => {
  if (!document.value) return false
  // Allow sending for signature if document is in DRAFT or has been previously sent
  return ['DRAFT', 'SENT', 'VIEWED'].includes(document.value.status)
})

// Only show direct signing UI for clients viewing their own document (legacy path)
// New flow uses /sign/[token] page instead
const { user } = useUserSession()
const isClientSigningOwnDocument = computed(() => {
  if (!document.value || !user.value) return false
  // Only show for CLIENT role viewing their own document
  return user.value.role === 'CLIENT' && document.value.clientId === user.value.id
})

// Get variable mappings from template
const variableMappings = computed(() => {
  if (!document.value?.template?.variableMappings) return {}
  try {
    return JSON.parse(document.value.template.variableMappings)
  } catch (e) {
    console.error('Error parsing variable mappings:', e)
    return {}
  }
})

const documentVariables = computed(() => {
  if (!document.value?.template?.variables) return []
  try {
    const templateVars = JSON.parse(document.value.template.variables)

    // Return ALL variables so they can be edited
    return templateVars.map((name: string) => ({
      name,
      description: name.replace(/([A-Z])/g, ' $1').trim() // Convert camelCase to Title Case
    }))
  } catch (e) {
    console.error('Error parsing template variables:', e)
    return []
  }
})

// Check if a variable is mapped to a database field
function isVariableMapped(variableName: string): boolean {
  const mappings = variableMappings.value
  return mappings[variableName]?.source && mappings[variableName]?.field
}

// Get human-readable label for mapping source
function getMappingSourceLabel(variableName: string): string {
  const mapping = variableMappings.value[variableName]
  if (!mapping) return ''

  const sourceLabels: Record<string, string> = {
    client: 'From Client Record',
    matter: 'From Matter Record',
    journey: 'From Journey'
  }

  return sourceLabels[mapping.source] || 'Auto-filled'
}

const needsVariables = computed(() => {
  return documentVariables.value.length > 0
})

// Sanitize document content to prevent XSS attacks when rendering with v-html
const renderedContent = useSanitizedHtml(() => document.value?.content)

const fetchDocument = async () => {
  loading.value = true
  try {
    document.value = await $fetch(`/api/documents/${documentId}`)

    // Initialize selected status
    selectedStatus.value = document.value.status

    // Mark as viewed if not already
    if (document.value.status === 'SENT' && !document.value.viewedAt) {
      await $fetch(`/api/documents/${documentId}/view`, { method: 'POST' })
    }

    // Initialize variable values if they exist
    if (document.value.variableValues) {
      variableValues.value = JSON.parse(document.value.variableValues)
    }

    // Log variable mappings for debugging
    console.log('[Document] Variable mappings:', variableMappings.value)
    console.log('[Document] Current variable values:', variableValues.value)
  } catch (error) {
    console.error('Failed to fetch document:', error)
  } finally {
    loading.value = false
  }
}

const updateStatus = async () => {
  try {
    await $fetch(`/api/documents/${documentId}/status`, {
      method: 'PUT',
      body: { status: selectedStatus.value }
    })

    // Update the local document status
    if (document.value) {
      document.value.status = selectedStatus.value
    }
  } catch (error) {
    console.error('Failed to update status:', error)
    alert('Failed to update document status')
    // Revert the selection
    selectedStatus.value = document.value?.status || 'DRAFT'
  }
}

const handleFillVariables = async () => {
  console.log('[Client] Variable values being submitted:', variableValues.value)
  console.log('[Client] Document variables list:', documentVariables.value)

  savingVariables.value = true
  showEditVariablesModal.value = false
  try {
    await $fetch(`/api/documents/${documentId}/variables`, {
      method: 'POST',
      body: { variables: variableValues.value }
    })
    await fetchDocument()
    console.log('[Client] Variables saved successfully')
  } catch (error) {
    console.error('[Client] Failed to save variables:', error)
    alert('Failed to save variables')
  } finally {
    savingVariables.value = false
  }
}

const initCanvas = () => {
  if (!signatureCanvas.value) return
  ctx.value = signatureCanvas.value.getContext('2d')
  if (ctx.value) {
    ctx.value.strokeStyle = '#000'
    ctx.value.lineWidth = 2
    ctx.value.lineCap = 'round'
    ctx.value.lineJoin = 'round'
  }
}

const startDrawing = (e: MouseEvent | TouchEvent) => {
  if (!ctx.value || !signatureCanvas.value) return
  isDrawing.value = true
  
  const rect = signatureCanvas.value.getBoundingClientRect()
  const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.offsetX
  const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.offsetY
  
  ctx.value.beginPath()
  ctx.value.moveTo(x, y)
}

const draw = (e: MouseEvent | TouchEvent) => {
  if (!isDrawing.value || !ctx.value || !signatureCanvas.value) return
  
  const rect = signatureCanvas.value.getBoundingClientRect()
  const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.offsetX
  const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.offsetY
  
  ctx.value.lineTo(x, y)
  ctx.value.stroke()
}

const stopDrawing = () => {
  isDrawing.value = false
}

const clearSignature = () => {
  if (!ctx.value || !signatureCanvas.value) return
  ctx.value.clearRect(0, 0, signatureCanvas.value.width, signatureCanvas.value.height)
}

const handleSign = async () => {
  if (!signatureCanvas.value) return

  const signatureData = signatureCanvas.value.toDataURL('image/png')

  signing.value = true
  try {
    await $fetch(`/api/documents/${documentId}/sign`, {
      method: 'POST',
      body: { signatureData }
    })

    await fetchDocument()
    alert('Document signed successfully!')
  } catch (error: any) {
    alert(error.data?.message || 'Failed to sign document')
  } finally {
    signing.value = false
  }
}

const downloadDocx = async () => {
  console.log('Download button clicked, documentId:', documentId)
  console.log('Document blob key:', document.value?.docxBlobKey)

  try {
    // Fetch the DOCX file
    const response = await fetch(`/api/documents/${documentId}/download`)
    console.log('Download response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Download failed with response:', errorText)
      throw new Error(`Download failed: ${response.status} - ${errorText}`)
    }

    // Get the blob
    const blob = await response.blob()
    console.log('Downloaded blob size:', blob.size, 'bytes')

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = `${document.value?.title || 'document'}.docx`

    // Trigger download
    window.document.body.appendChild(link)
    link.click()

    // Cleanup
    window.document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    console.log('Download completed successfully')
  } catch (error) {
    console.error('Download error:', error)
    alert(`Failed to download document: ${error.message || 'Unknown error'}`)
  }
}

const downloadSignedPdf = async () => {
  try {
    const response = await fetch(`/api/documents/${documentId}/download-signed`)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Download failed: ${response.status} - ${errorText}`)
    }

    const blob = await response.blob()

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = `${document.value?.title || 'document'} - Signed.pdf`

    // Trigger download
    window.document.body.appendChild(link)
    link.click()

    // Cleanup
    window.document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download signed PDF error:', error)
    alert(`Failed to download signed PDF: ${error.message || 'Unknown error'}`)
  }
}

// E-Signature methods
const createSignatureSession = async () => {
  signatureError.value = ''
  creatingSession.value = true

  try {
    // First, mark document as ready for signature if needed
    if (!document.value.readyForSignature) {
      await $fetch(`/api/documents/${documentId}/status`, {
        method: 'PUT',
        body: {
          status: 'DRAFT',
          readyForSignature: true,
          attorneyApproved: true
        }
      })
    }

    const response = await $fetch(`/api/documents/${documentId}/signature-session`, {
      method: 'POST',
      body: {
        tier: signatureTier.value,
        expiresIn: signatureExpiry.value,
        sendEmail: sendSignatureEmail.value,
        message: signatureEmailMessage.value || undefined
      }
    })

    if (response.success) {
      signingUrl.value = response.data.signingUrl
      signatureSessionData.value = response.data
      showSignatureModal.value = false
      showSigningLinkModal.value = true

      // Refresh document to get updated status
      await fetchDocument()
    }
  } catch (error: any) {
    signatureError.value = error.data?.message || error.message || 'Failed to create signature session'
  } finally {
    creatingSession.value = false
  }
}

const copySigningUrl = async () => {
  try {
    await navigator.clipboard.writeText(signingUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    // Fallback for older browsers
    const textArea = window.document.createElement('textarea')
    textArea.value = signingUrl.value
    window.document.body.appendChild(textArea)
    textArea.select()
    window.document.execCommand('copy')
    window.document.body.removeChild(textArea)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

const openSigningUrl = () => {
  window.open(signingUrl.value, '_blank')
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.actions-dropdown')) {
    showActionsDropdown.value = false
  }
}

onMounted(() => {
  fetchDocument()
  initCanvas()
  window.document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.document.removeEventListener('click', handleClickOutside)
})
</script>

