<template>
  <div
    v-if="isImpersonating"
    class="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm"
  >
    <div class="flex items-center gap-2">
      <Eye class="w-4 h-4" />
      <span>
        Viewing as <strong>{{ impersonatedName }}</strong>
        <span class="opacity-75">({{ impersonatedEmail }})</span>
      </span>
    </div>
    <button
      :disabled="stopping"
      class="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
      @click="stopImpersonating"
    >
      {{ stopping ? 'Stopping...' : 'Stop Impersonating' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { Eye } from 'lucide-vue-next'

const stopping = ref(false)

const { data: sessionData } = await useFetch('/api/auth/session')

const isImpersonating = computed(() => sessionData.value?.impersonating === true)
const impersonatedName = computed(() => {
  const u = sessionData.value?.user
  return u ? `${u.firstName} ${u.lastName}` : ''
})
const impersonatedEmail = computed(() => sessionData.value?.user?.email || '')

async function stopImpersonating() {
  stopping.value = true
  try {
    await $fetch('/api/admin/stop-impersonating', { method: 'POST' })
    // Full page reload to reset all state
    window.location.href = '/clients'
  } catch {
    stopping.value = false
  }
}
</script>
