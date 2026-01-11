<template>
  <div class="signature-canvas-container">
    <div class="relative">
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        class="border-2 border-slate-300 rounded-lg bg-white cursor-crosshair touch-none"
        :class="{ 'border-red-500': hasError }"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        @touchstart.prevent="handleTouchStart"
        @touchmove.prevent="handleTouchMove"
        @touchend.prevent="stopDrawing"
      />

      <!-- Signature line -->
      <div
        class="absolute bottom-8 left-4 right-4 border-b border-slate-400"
        style="pointer-events: none;"
      />
      <span
        class="absolute bottom-2 left-4 text-xs text-slate-400"
        style="pointer-events: none;"
      >
        Sign above the line
      </span>
    </div>

    <!-- Controls -->
    <div class="flex justify-between items-center mt-3">
      <div class="flex space-x-2">
        <button
          type="button"
          @click="undo"
          :disabled="historyIndex <= 0"
          class="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Undo
        </button>
        <button
          type="button"
          @click="clear"
          :disabled="!hasSignature"
          class="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear
        </button>
      </div>

      <span v-if="hasSignature" class="text-sm text-green-600 flex items-center">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Signature captured
      </span>
    </div>

    <p v-if="hasError" class="text-sm text-red-600 mt-2">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Props {
  width?: number
  height?: number
  lineWidth?: number
  lineColor?: string
  hasError?: boolean
  errorMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  width: 500,
  height: 200,
  lineWidth: 2,
  lineColor: '#000000',
  hasError: false,
  errorMessage: 'Please provide your signature'
})

const emit = defineEmits<{
  'update:signature': [data: string | null]
  'change': [hasSignature: boolean]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const hasSignature = ref(false)
const history = ref<ImageData[]>([])
const historyIndex = ref(-1)

// Responsive canvas size
const canvasWidth = ref(props.width)
const canvasHeight = ref(props.height)

let ctx: CanvasRenderingContext2D | null = null

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = props.lineWidth
      ctx.strokeStyle = props.lineColor

      // Save initial blank state
      saveState()
    }
  }

  // Handle responsive sizing
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
})

const updateCanvasSize = () => {
  const container = canvasRef.value?.parentElement
  if (container) {
    const containerWidth = container.clientWidth - 4 // Account for border
    canvasWidth.value = Math.min(containerWidth, props.width)
    canvasHeight.value = props.height
  }
}

const getCoordinates = (e: MouseEvent | Touch): { x: number; y: number } => {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }

  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}

const startDrawing = (e: MouseEvent) => {
  if (!ctx) return

  isDrawing.value = true
  const { x, y } = getCoordinates(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

const draw = (e: MouseEvent) => {
  if (!isDrawing.value || !ctx) return

  const { x, y } = getCoordinates(e)
  ctx.lineTo(x, y)
  ctx.stroke()
}

const stopDrawing = () => {
  if (isDrawing.value && ctx) {
    isDrawing.value = false
    ctx.closePath()
    saveState()
    updateSignatureState()
  }
}

const handleTouchStart = (e: TouchEvent) => {
  if (!ctx || e.touches.length === 0) return

  isDrawing.value = true
  const touch = e.touches[0]
  const { x, y } = getCoordinates(touch)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isDrawing.value || !ctx || e.touches.length === 0) return

  const touch = e.touches[0]
  const { x, y } = getCoordinates(touch)
  ctx.lineTo(x, y)
  ctx.stroke()
}

const saveState = () => {
  if (!ctx || !canvasRef.value) return

  // Remove any states after current index (for redo functionality)
  history.value = history.value.slice(0, historyIndex.value + 1)

  // Save current state
  const imageData = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height)
  history.value.push(imageData)
  historyIndex.value = history.value.length - 1

  // Limit history to 20 states
  if (history.value.length > 20) {
    history.value.shift()
    historyIndex.value--
  }
}

const undo = () => {
  if (historyIndex.value <= 0 || !ctx || !canvasRef.value) return

  historyIndex.value--
  const imageData = history.value[historyIndex.value]
  ctx.putImageData(imageData, 0, 0)
  updateSignatureState()
}

const clear = () => {
  if (!ctx || !canvasRef.value) return

  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  saveState()
  updateSignatureState()
}

const updateSignatureState = () => {
  hasSignature.value = checkHasSignature()
  emit('change', hasSignature.value)
  emit('update:signature', hasSignature.value ? getSignatureData() : null)
}

const checkHasSignature = (): boolean => {
  if (!ctx || !canvasRef.value) return false

  const imageData = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height)
  const data = imageData.data

  // Check if any pixel has been drawn (alpha > 0)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return true
  }
  return false
}

const getSignatureData = (): string | null => {
  if (!canvasRef.value || !hasSignature.value) return null
  return canvasRef.value.toDataURL('image/png')
}

// Expose methods for parent components
defineExpose({
  getSignatureData,
  hasSignature: () => hasSignature.value,
  clear
})

// Watch for external clear requests
watch(() => props.hasError, () => {
  // Just update visual state
})
</script>

<style scoped>
.signature-canvas-container {
  width: 100%;
  max-width: 500px;
}
</style>
