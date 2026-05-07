<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const docId = route.params.id as string

const document = ref<any>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

// Field placements
const placements = ref<any[]>([])
let nextFieldId = 1

// PDF viewer
const pdfContainerRef = ref<HTMLElement | null>(
  null,
)
const pageHeights = ref<Record<number, {
  width: number
  height: number
  displayWidth: number
  displayHeight: number
}>>({})

const {
  pages,
  loading: pdfLoading,
  render: renderPdf,
} = usePdfViewer(pdfContainerRef)

// Load document
onMounted(async () => {
  try {
    const result = await $fetch<any>(
      `/api/documents/${docId}`,
    )
    document.value = result

    // Load existing placements
    if (result.fieldPlacements) {
      const count = result.signerCount ?? 1
      const existing = JSON.parse(
        result.fieldPlacements,
      ).filter(
        (f: any) => Number(f.signerRole)
          <= count,
      )
      placements.value = existing
      nextFieldId = existing.reduce(
        (max: number, f: any) => {
          const num = parseInt(
            f.id?.replace('f', ''), 10,
          ) || 0
          return Math.max(max, num + 1)
        },
        1,
      )
    }

    // Render PDF
    await nextTick()
    await renderPdf(
      `/api/documents/${docId}/preview-pdf`,
    )

    await nextTick()
    capturePageDimensions()
  }
  catch (err: any) {
    error.value
      = err.data?.message ?? err.message
  }
  finally {
    loading.value = false
  }
})

const capturePageDimensions = () => {
  const container = pdfContainerRef.value
  if (!container) return

  const canvases = container.querySelectorAll(
    'canvas[data-page]',
  )
  canvases.forEach((canvas) => {
    const el = canvas as HTMLCanvasElement
    const page = parseInt(
      el.dataset.page!, 10,
    )
    pageHeights.value[page] = {
      width: el.width,
      height: el.height,
      displayWidth: el.offsetWidth,
      displayHeight: el.offsetHeight,
    }
  })
}

// Field type definitions
const FIELD_TYPES = [
  {
    type: 'signature',
    label: 'Signature',
    defaultW: 200,
    defaultH: 50,
  },
  {
    type: 'initials',
    label: 'Initials',
    defaultW: 80,
    defaultH: 40,
  },
  {
    type: 'date_signed',
    label: 'Date Signed',
    defaultW: 120,
    defaultH: 20,
  },
  {
    type: 'date',
    label: 'Date',
    defaultW: 120,
    defaultH: 20,
  },
  {
    type: 'name',
    label: 'Name',
    defaultW: 150,
    defaultH: 20,
  },
  {
    type: 'text',
    label: 'Text',
    defaultW: 200,
    defaultH: 20,
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    defaultW: 16,
    defaultH: 16,
  },
]

// Active signer for new fields
const activeSigner = ref(1)
const signerCount = computed(
  () => document.value?.signerCount ?? 1,
)
const isMultiSigner = computed(
  () => signerCount.value >= 2,
)

const SIGNER_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
]

const SIGNER_BORDER_COLORS = [
  'border-blue-400 bg-blue-50/80',
  'border-green-400 bg-green-50/80',
  'border-purple-400 bg-purple-50/80',
  'border-orange-400 bg-orange-50/80',
  'border-pink-400 bg-pink-50/80',
  'border-teal-400 bg-teal-50/80',
]

const signerBgClass = (num: number) =>
  SIGNER_COLORS[
    (num - 1) % SIGNER_COLORS.length
  ]

const signerBorderClass = (num: number) =>
  SIGNER_BORDER_COLORS[
    (num - 1) % SIGNER_BORDER_COLORS.length
  ]

// Drop handler for toolbar drag
const onDrop = (event: DragEvent, pg: number) => {
  const typeStr = event.dataTransfer
    ?.getData('fieldType')
  if (!typeStr) return

  const ft = FIELD_TYPES.find(
    f => f.type === typeStr,
  )
  if (!ft) return

  const dims = pageHeights.value[pg]
  if (!dims) return

  const canvas = pdfContainerRef.value
    ?.querySelector(
      `canvas[data-page="${pg}"]`,
    )
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const scale = dims.width / rect.width

  const screenX = event.clientX - rect.left
  const screenY = event.clientY - rect.top
  const pdfX = screenX * scale
  const pdfY = dims.height - (screenY * scale)

  placements.value.push({
    id: `f${nextFieldId++}`,
    page: pg,
    x: Math.round(pdfX),
    y: Math.round(pdfY),
    width: ft.defaultW,
    height: ft.defaultH,
    type: ft.type,
    signerRole: activeSigner.value,
    label: ft.label,
  })
}

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
}

const onToolbarDragStart = (
  event: DragEvent,
  ft: typeof FIELD_TYPES[number],
) => {
  event.dataTransfer!.setData(
    'fieldType', ft.type,
  )
  event.dataTransfer!.effectAllowed = 'copy'
}

// Drag fields within a page
const dragState = ref<any>(null)

const startFieldDrag = (
  event: MouseEvent,
  field: any,
) => {
  const canvas = pdfContainerRef.value
    ?.querySelector(
      `canvas[data-page="${field.page}"]`,
    )
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const dims = pageHeights.value[field.page]
  const scale = dims.width / rect.width

  dragState.value = {
    fieldId: field.id,
    startScreenX: event.clientX,
    startScreenY: event.clientY,
    startPdfX: field.x,
    startPdfY: field.y,
    scale,
  }

  const onMove = (e: MouseEvent) => {
    if (!dragState.value) return
    const dx
      = (e.clientX
        - dragState.value.startScreenX)
      * dragState.value.scale
    const dy
      = (e.clientY
        - dragState.value.startScreenY)
      * dragState.value.scale

    const f = placements.value.find(
      (p: any) =>
        p.id === dragState.value.fieldId,
    )
    if (f) {
      f.x = Math.round(
        dragState.value.startPdfX + dx,
      )
      // Y inverted (PDF bottom-left origin)
      f.y = Math.round(
        dragState.value.startPdfY - dy,
      )
    }
  }

  const onUp = () => {
    dragState.value = null
    window.removeEventListener(
      'mousemove', onMove,
    )
    window.removeEventListener(
      'mouseup', onUp,
    )
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const removeField = (id: string) => {
  placements.value = placements.value.filter(
    f => f.id !== id,
  )
}

const selectedField = ref<any>(null)

// Convert PDF coords to screen position
const fieldStyle = (field: any) => {
  const dims = pageHeights.value[field.page]
  if (!dims) return { display: 'none' }

  const scaleX
    = dims.displayWidth / dims.width
  const scaleY
    = dims.displayHeight / dims.height

  const left = field.x * scaleX
  const top
    = (dims.height - field.y) * scaleY
  const width = field.width * scaleX
  const height = field.height * scaleY

  return {
    position: 'absolute' as const,
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  }
}

// Validate all signers have signature fields
const validatePlacements = () => {
  const count = signerCount.value
  for (let n = 1; n <= count; n++) {
    const hasSig = placements.value.some(
      f => Number(f.signerRole) === n
        && f.type === 'signature',
    )
    if (!hasSig) {
      error.value
        = `Signer ${n} needs at least one`
        + ` signature field`
      return false
    }
  }
  return true
}

const savePlacements = async () => {
  error.value = null
  if (!validatePlacements()) return

  saving.value = true
  try {
    await $fetch(
      `/api/documents/${docId}/placements`,
      {
        method: 'PUT',
        body: {
          placements: placements.value,
        },
      },
    )
  }
  catch (err: any) {
    error.value
      = err.data?.message ?? err.message
  }
  finally {
    saving.value = false
  }
}

const saveAndReturn = async () => {
  await savePlacements()
  if (error.value) return
  router.push(`/documents/${docId}`)
}

const updateSignerCount = async (
  count: number,
) => {
  try {
    await $fetch(
      `/api/documents/${docId}/signer-count`,
      {
        method: 'PUT',
        body: { signerCount: count },
      },
    )
    if (document.value) {
      document.value.signerCount = count
    }
    placements.value = placements.value.filter(
      f => Number(f.signerRole) <= count,
    )
    if (activeSigner.value > count) {
      activeSigner.value = count
    }
  }
  catch (err: any) {
    error.value
      = err.data?.message ?? err.message
  }
}
</script>

<template>
  <div class="flex flex-col h-screen">
    <!-- Header bar -->
    <div
      class="flex items-center justify-between
        px-4 py-3 border-b border-slate-200
        bg-white shrink-0"
    >
      <div>
        <NuxtLink
          :to="`/documents/${docId}`"
          class="text-xs text-slate-500
            hover:text-slate-700"
        >
          &larr; Back to Document
        </NuxtLink>
        <h1
          class="text-lg font-bold
            text-slate-800"
        >
          Prepare Fields
        </h1>
      </div>
      <div class="flex gap-2">
        <button
          :disabled="saving"
          class="px-4 py-2 border
            border-slate-300 rounded-lg
            text-sm font-medium text-slate-700
            hover:bg-slate-50
            disabled:opacity-50"
          @click="savePlacements"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
        <button
          :disabled="saving
            || !placements.length"
          class="px-4 py-2 bg-[#0A2540]
            text-white rounded-lg text-sm
            font-medium hover:bg-[#0d2f52]
            disabled:opacity-50"
          @click="saveAndReturn"
        >
          Done
        </button>
      </div>
    </div>

    <p
      v-if="error"
      class="px-4 py-2 text-sm text-red-600
        bg-red-50"
    >
      {{ error }}
    </p>

    <div class="flex flex-1 overflow-hidden">
      <!-- Toolbar sidebar -->
      <div
        class="w-48 bg-slate-50 border-r
          border-slate-200 p-3 shrink-0
          overflow-y-auto"
      >
        <!-- Signer count -->
        <p
          class="text-xs font-semibold
            text-slate-500 mb-2 uppercase
            tracking-wide"
        >
          Signers
        </p>
        <div class="flex gap-1 mb-4">
          <button
            v-for="n in 6"
            :key="n"
            class="w-7 h-7 rounded text-[10px]
              font-bold transition-colors"
            :class="signerCount === n
              ? 'bg-[#0A2540] text-white'
              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'"
            @click="updateSignerCount(n)"
          >
            {{ n }}
          </button>
        </div>

        <!-- Active signer toggle -->
        <div
          v-if="isMultiSigner"
          class="mb-4"
        >
          <p
            class="text-xs font-semibold
              text-slate-500 mb-2 uppercase
              tracking-wide"
          >
            Placing for Signer
          </p>
          <div class="flex gap-1 flex-wrap">
            <button
              v-for="n in signerCount"
              :key="n"
              class="w-8 h-8 rounded-md
                text-xs font-bold
                transition-colors"
              :class="activeSigner === n
                ? signerBgClass(n) + ' text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'"
              @click="activeSigner = n"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <p
          class="text-xs font-semibold
            text-slate-500 mb-2 uppercase
            tracking-wide"
        >
          Fields
        </p>
        <div class="space-y-1">
          <div
            v-for="ft in FIELD_TYPES"
            :key="ft.type"
            draggable="true"
            class="flex items-center gap-2
              px-3 py-2 rounded-lg
              bg-white border border-slate-200
              text-sm text-slate-700
              cursor-grab hover:border-blue-300
              hover:bg-blue-50/50
              active:cursor-grabbing
              transition-colors"
            @dragstart="
              onToolbarDragStart($event, ft)"
          >
            {{ ft.label }}
          </div>
        </div>

        <!-- Selected field properties -->
        <div
          v-if="selectedField"
          class="mt-6"
        >
          <p
            class="text-xs font-semibold
              text-slate-500 mb-2 uppercase
              tracking-wide"
          >
            Properties
          </p>
          <div class="space-y-2">
            <div>
              <label
                class="block text-xs
                  text-slate-500 mb-1"
              >
                Label
              </label>
              <input
                v-model="selectedField.label"
                type="text"
                class="w-full px-2 py-1 border
                  border-slate-300 rounded
                  text-xs"
              >
            </div>
            <div>
              <label
                class="block text-xs
                  text-slate-500 mb-1"
              >
                Signer
              </label>
              <select
                v-model="
                  selectedField.signerRole"
                class="w-full px-2 py-1 border
                  border-slate-300 rounded
                  text-xs bg-white"
              >
                <option
                  v-for="n in signerCount"
                  :key="n"
                  :value="n"
                >
                  Signer {{ n }}
                </option>
              </select>
            </div>
            <button
              class="text-xs text-red-500
                hover:underline"
              @click="removeField(
                selectedField.id);
              selectedField = null"
            >
              Remove Field
            </button>
          </div>
        </div>

        <p class="mt-6 text-xs text-slate-400">
          Drag fields onto the document pages.
        </p>
      </div>

      <!-- PDF pages with field overlays -->
      <div
        ref="pdfContainerRef"
        class="flex-1 overflow-y-auto
          bg-slate-200 p-6"
      >
        <div
          v-if="pdfLoading || loading"
          class="text-center py-12
            text-slate-400"
        >
          Loading document...
        </div>

        <div
          class="flex flex-col items-center
            gap-6"
        >
          <div
            v-for="pageNum in pages"
            :key="pageNum"
            class="relative"
            @drop="onDrop($event, pageNum)"
            @dragover="onDragOver"
          >
            <canvas
              :data-page="pageNum"
              class="shadow-lg bg-white"
              style="max-width: 100%"
            />

            <!-- Field overlays -->
            <div
              v-for="field in placements.filter(
                (f) => f.page === pageNum)"
              :key="field.id"
              :style="fieldStyle(field)"
              class="absolute border-2
                rounded cursor-move
                flex items-center
                justify-center
                text-[10px] font-medium
                select-none"
              :class="[
                signerBorderClass(
                  field.signerRole),
                selectedField?.id === field.id
                  ? 'ring-2 ring-blue-500'
                  : '',
              ]"
              @mousedown.prevent="
                selectedField = field;
                startFieldDrag($event, field)"
            >
              <span class="truncate px-1">
                {{ field.label }}
              </span>
              <span
                class="absolute -top-2 -right-2
                  w-4 h-4 rounded-full
                  text-[9px] font-bold
                  leading-none shadow-sm
                  flex items-center
                  justify-center text-white"
                :class="signerBgClass(
                  field.signerRole)"
              >
                {{ field.signerRole }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
