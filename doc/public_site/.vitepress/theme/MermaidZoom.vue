<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const isOpen = ref(false)
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const currentDiagram = ref<SVGElement | null>(null)
const modalContent = ref<HTMLElement | null>(null)

// Scale values: displayed % = scale * 100
// Default opens at 4x (400%), max is 16x (1600%)
const MIN_SCALE = 1
const MAX_SCALE = 16
const DEFAULT_SCALE = 4
const ZOOM_STEP = 1

function openModal(svg: SVGElement) {
  currentDiagram.value = svg.cloneNode(true) as SVGElement
  // Reset transforms - start at readable 400%
  scale.value = DEFAULT_SCALE
  translateX.value = 0
  translateY.value = 0
  isOpen.value = true
  document.body.style.overflow = 'hidden'
}

function closeModal() {
  isOpen.value = false
  currentDiagram.value = null
  document.body.style.overflow = ''
}

function zoomIn() {
  scale.value = Math.min(MAX_SCALE, scale.value + ZOOM_STEP)
}

function zoomOut() {
  scale.value = Math.max(MIN_SCALE, scale.value - ZOOM_STEP)
}

function resetZoom() {
  scale.value = DEFAULT_SCALE
  translateX.value = 0
  translateY.value = 0
}

function fitToScreen() {
  if (!modalContent.value || !currentDiagram.value) return

  const container = modalContent.value
  const svg = currentDiagram.value

  const containerRect = container.getBoundingClientRect()
  const svgWidth = svg.viewBox?.baseVal?.width || svg.getBoundingClientRect().width
  const svgHeight = svg.viewBox?.baseVal?.height || svg.getBoundingClientRect().height

  const scaleX = (containerRect.width - 80) / svgWidth
  const scaleY = (containerRect.height - 80) / svgHeight

  scale.value = Math.min(scaleX, scaleY, MAX_SCALE)
  translateX.value = 0
  translateY.value = 0
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
  scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value + delta))
}

function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isDragging.value = true
  dragStart.value = { x: e.clientX - translateX.value, y: e.clientY - translateY.value }
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  translateX.value = e.clientX - dragStart.value.x
  translateY.value = e.clientY - dragStart.value.y
}

function handleMouseUp() {
  isDragging.value = false
}

function handleKeyDown(e: KeyboardEvent) {
  if (!isOpen.value) return

  switch (e.key) {
    case 'Escape':
      closeModal()
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case '0':
      resetZoom()
      break
    case 'f':
      fitToScreen()
      break
  }
}

function setupMermaidClickHandlers() {
  // Find all mermaid diagrams and add click handlers
  const diagrams = document.querySelectorAll('.mermaid svg')
  diagrams.forEach((svg) => {
    // Add visual indicator that it's clickable
    const svgEl = svg as SVGElement
    svgEl.style.cursor = 'zoom-in'

    // Remove existing listener to prevent duplicates
    svgEl.removeEventListener('click', handleDiagramClick as EventListener)
    svgEl.addEventListener('click', handleDiagramClick as EventListener)
  })
}

function handleDiagramClick(e: Event) {
  const svg = e.currentTarget as SVGElement
  openModal(svg)
}

onMounted(() => {
  // Initial setup
  nextTick(() => {
    setupMermaidClickHandlers()
  })

  // Watch for new diagrams (for client-side navigation)
  const observer = new MutationObserver(() => {
    nextTick(() => {
      setupMermaidClickHandlers()
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyDown)

  onUnmounted(() => {
    observer.disconnect()
    document.removeEventListener('keydown', handleKeyDown)
  })
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="mermaid-modal-overlay"
        @click.self="closeModal"
      >
        <div class="mermaid-modal">
          <!-- Toolbar -->
          <div class="mermaid-modal-toolbar">
            <div class="toolbar-left">
              <span class="toolbar-hint">Click and drag to pan. Scroll to zoom.</span>
            </div>
            <div class="toolbar-center">
              <button @click="zoomOut" title="Zoom Out (-)">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </button>
              <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
              <button @click="zoomIn" title="Zoom In (+)">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </button>
              <button @click="resetZoom" title="Reset (0)">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
              <button @click="fitToScreen" title="Fit to Screen (F)">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              </button>
            </div>
            <div class="toolbar-right">
              <button @click="closeModal" title="Close (Esc)" class="close-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <!-- Diagram Container -->
          <div
            ref="modalContent"
            class="mermaid-modal-content"
            :class="{ dragging: isDragging }"
            @wheel="handleWheel"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
          >
            <div
              class="diagram-wrapper"
              :style="{
                transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
              }"
            >
              <div v-if="currentDiagram" v-html="currentDiagram.outerHTML" class="diagram-container"></div>
            </div>
          </div>

          <!-- Keyboard shortcuts help -->
          <div class="keyboard-hints">
            <span><kbd>+</kbd><kbd>-</kbd> Zoom</span>
            <span><kbd>0</kbd> Reset</span>
            <span><kbd>F</kbd> Fit</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mermaid-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mermaid-modal {
  width: 95vw;
  height: 95vh;
  background: var(--vp-c-bg);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.mermaid-modal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  gap: 16px;
}

.toolbar-left {
  flex: 1;
}

.toolbar-hint {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.mermaid-modal-toolbar button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s;
}

.mermaid-modal-toolbar button:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.close-btn {
  background: var(--vp-c-danger-soft) !important;
  border-color: var(--vp-c-danger-soft) !important;
}

.close-btn:hover {
  background: var(--vp-c-danger) !important;
  color: white !important;
}

.zoom-level {
  min-width: 60px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.mermaid-modal-content {
  flex: 1;
  overflow: hidden;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg);
  /* Checkerboard pattern for transparency */
  background-image:
    linear-gradient(45deg, var(--vp-c-bg-soft) 25%, transparent 25%),
    linear-gradient(-45deg, var(--vp-c-bg-soft) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--vp-c-bg-soft) 75%),
    linear-gradient(-45deg, transparent 75%, var(--vp-c-bg-soft) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.mermaid-modal-content.dragging {
  cursor: grabbing;
}

.diagram-wrapper {
  transform-origin: center center;
  transition: transform 0.1s ease-out;
}

.mermaid-modal-content.dragging .diagram-wrapper {
  transition: none;
}

.diagram-container {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.diagram-container :deep(svg) {
  display: block;
  max-width: none !important;
  height: auto !important;
}

.keyboard-hints {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 8px 16px;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.keyboard-hints span {
  display: flex;
  align-items: center;
  gap: 4px;
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  box-shadow: 0 1px 0 var(--vp-c-divider);
}

/* Transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .mermaid-modal,
.modal-leave-active .mermaid-modal {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .mermaid-modal,
.modal-leave-to .mermaid-modal {
  transform: scale(0.95);
  opacity: 0;
}
</style>
