<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const isCollapsed = ref(false)
const hasSidebar = ref(false)
const buttonLeft = ref(272) // Default sidebar width
const STORAGE_KEY = 'vitepress-sidebar-collapsed'

// Load saved preference
onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved !== null) {
    isCollapsed.value = saved === 'true'
    applyCollapsedState(isCollapsed.value)
  }

  // Check for sidebar and get width
  nextTick(() => {
    checkForSidebar()
    updateButtonPosition()
  })

  // Update on resize
  window.addEventListener('resize', updateButtonPosition)

  // Keyboard shortcut
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateButtonPosition)
  document.removeEventListener('keydown', handleKeydown)
})

// Watch for route changes to check sidebar visibility
watch(() => route.path, () => {
  nextTick(() => {
    checkForSidebar()
    updateButtonPosition()
  })
})

function checkForSidebar() {
  // Check if page has sidebar by looking for sidebar content or has-sidebar class
  const sidebar = document.querySelector('.VPSidebar')
  const hasContent = document.querySelector('.VPContent.has-sidebar')
  hasSidebar.value = !!(sidebar && hasContent)
}

function handleKeydown(e: KeyboardEvent) {
  // Don't trigger when typing in inputs or when no sidebar
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }
  if (!hasSidebar.value) {
    return
  }

  // Toggle sidebar with '[' key
  if (e.key === '[') {
    toggle()
  }
}

function updateButtonPosition() {
  const sidebar = document.querySelector('.VPSidebar')
  if (sidebar && !isCollapsed.value) {
    buttonLeft.value = sidebar.getBoundingClientRect().width
  }
}

// Watch for changes and persist
watch(isCollapsed, (collapsed) => {
  localStorage.setItem(STORAGE_KEY, String(collapsed))
  applyCollapsedState(collapsed)
})

function applyCollapsedState(collapsed: boolean) {
  document.documentElement.classList.toggle('sidebar-collapsed', collapsed)
}

function toggle() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <Teleport to="body">
    <button
      v-if="hasSidebar"
      class="sidebar-toggle-btn"
      :class="{ collapsed: isCollapsed }"
      :style="{ left: isCollapsed ? '0px' : `${buttonLeft}px` }"
      @click="toggle"
      :title="isCollapsed ? 'Expand sidebar (Press [)' : 'Collapse sidebar (Press [)'"
      aria-label="Toggle sidebar"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="toggle-icon"
      >
        <polyline points="11 17 6 12 11 7"></polyline>
        <polyline points="18 17 13 12 18 7"></polyline>
      </svg>
    </button>
  </Teleport>
</template>

<style scoped>
.sidebar-toggle-btn {
  position: fixed;
  top: calc(var(--vp-nav-height, 64px) + 16px);
  z-index: 100;
  width: 24px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-left: none;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  transition: left 0.3s ease, background 0.2s ease, opacity 0.2s ease;
  opacity: 0.7;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.sidebar-toggle-btn:hover {
  opacity: 1;
  background: var(--vp-c-bg-soft);
}

.toggle-icon {
  transition: transform 0.3s ease;
  color: var(--vp-c-text-2);
}

.sidebar-toggle-btn.collapsed .toggle-icon {
  transform: rotate(180deg);
}

/* Hide on mobile - VitePress handles mobile sidebar differently */
@media (max-width: 959px) {
  .sidebar-toggle-btn {
    display: none;
  }
}
</style>
