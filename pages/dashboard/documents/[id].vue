<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <NuxtLink to="/dashboard/documents" class="text-sm text-accent-600 hover:text-accent-900 mb-2 inline-block">
          ← Back to Documents
        </NuxtLink>
        <h1 class="text-3xl font-bold text-gray-900">{{ document?.title || 'Document' }}</h1>
        <p v-if="document?.description" class="text-gray-600 mt-1">{{ document.description }}</p>
      </div>
      <UiBadge
        v-if="document"
        :variant="
          document.status === 'SIGNED' || document.status === 'COMPLETED' ? 'success' :
          document.status === 'SENT' || document.status === 'VIEWED' ? 'warning' :
          'default'
        "
        size="lg"
      >
        {{ document.status }}
      </UiBadge>
    </div>

    <div v-if="loading" class="text-center py-12">
      <p class="text-gray-500">Loading document...</p>
    </div>

    <div v-else-if="!document" class="text-center py-12">
      <p class="text-red-600">Document not found</p>
    </div>

    <template v-else>
      <!-- Document Content -->
      <UiCard title="Document Content">
        <div class="prose max-w-none" v-html="renderedContent"></div>
      </UiCard>

      <!-- Variables Form (if document has unfilled variables) -->
      <UiCard v-if="needsVariables && !isSigned" title="Fill Required Information">
        <form @submit.prevent="handleFillVariables" class="space-y-4">
          <div v-for="variable in documentVariables" :key="variable.name">
            <UiInput
              v-model="variableValues[variable.name]"
              :label="variable.description || variable.name"
              :placeholder="`Enter ${variable.description || variable.name}`"
              required
            />
          </div>
          <div class="flex justify-end">
            <UiButton type="submit" :is-loading="savingVariables">
              Update Document
            </UiButton>
          </div>
        </form>
      </UiCard>

      <!-- Signature Section (if not signed yet) -->
      <UiCard v-if="!isSigned && document.status === 'SENT'" title="Sign Document">
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

      <!-- Document Metadata -->
      <UiCard title="Document Information">
        <div class="grid grid-cols-2 gap-4 text-sm">
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { CheckCircle } from 'lucide-vue-next'
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

const signatureCanvas = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const ctx = ref<CanvasRenderingContext2D | null>(null)

const isSigned = computed(() => {
  return document.value?.status === 'SIGNED' || document.value?.status === 'COMPLETED'
})

const documentVariables = computed(() => {
  if (!document.value?.variableValues) return []
  try {
    const template = document.value.template
    if (!template?.variables) return []
    return JSON.parse(template.variables)
  } catch (e) {
    return []
  }
})

const needsVariables = computed(() => {
  return documentVariables.value.length > 0 && !document.value?.variableValues
})

const renderedContent = computed(() => {
  if (!document.value?.content) return ''
  let content = document.value.content
  
  // Replace variables with actual values if they exist
  if (document.value.variableValues) {
    try {
      const values = JSON.parse(document.value.variableValues)
      Object.keys(values).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        content = content.replace(regex, values[key])
      })
    } catch (e) {
      console.error('Error parsing variable values:', e)
    }
  }
  
  return content
})

const fetchDocument = async () => {
  loading.value = true
  try {
    document.value = await $fetch(`/api/documents/${documentId}`)
    
    // Mark as viewed if not already
    if (document.value.status === 'SENT' && !document.value.viewedAt) {
      await $fetch(`/api/documents/${documentId}/view`, { method: 'POST' })
    }
    
    // Initialize variable values if they exist
    if (document.value.variableValues) {
      variableValues.value = JSON.parse(document.value.variableValues)
    }
  } catch (error) {
    console.error('Failed to fetch document:', error)
  } finally {
    loading.value = false
  }
}

const handleFillVariables = async () => {
  savingVariables.value = true
  try {
    await $fetch(`/api/documents/${documentId}/variables`, {
      method: 'POST',
      body: { variables: variableValues.value }
    })
    await fetchDocument()
  } catch (error) {
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

onMounted(() => {
  fetchDocument()
  initCanvas()
})
</script>

