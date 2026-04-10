<template>
  <div class="inline-flex items-center gap-2">
    <!-- Masked display -->
    <span
      v-if="!revealed"
      class="font-mono text-sm text-gray-700"
    >
      {{ maskedValue || '—' }}
    </span>

    <!-- Revealed value -->
    <span
      v-else
      class="font-mono text-sm text-gray-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
    >
      {{ revealedValue }}
    </span>

    <!-- Reveal button (hidden if no display value or unauthorized) -->
    <button
      v-if="last4 && canReveal"
      class="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
      :class="{ 'text-amber-600 hover:text-amber-700': revealed }"
      :title="revealed ? 'Hide' : `Reveal full ${label}`"
      :disabled="loading"
      @click="revealed ? hide() : reveal()"
    >
      <component
        :is="loading ? Loader2 : revealed ? EyeOff : Eye"
        class="w-4 h-4"
        :class="{ 'animate-spin': loading }"
      />
    </button>

    <!-- Copy button (only when revealed) -->
    <button
      v-if="revealed && revealedValue"
      class="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
      title="Copy to clipboard"
      @click="copyToClipboard"
    >
      <component
        :is="copied ? Check : Copy"
        class="w-4 h-4"
        :class="{ 'text-green-600': copied }"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Eye, EyeOff, Copy, Check, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  /** Person ID for the reveal API call */
  personId: string
  /** Sensitive field key (e.g., 'tin') — matches server/config/sensitive-fields.ts */
  field: string
  /** The last-N display value (e.g., '6789') */
  last4: string | null
  /** Human-readable label (e.g., 'Tax ID') */
  label: string
  /** Pre-formatted masked string (e.g., '•••-••-6789'). If not provided, shows raw last4. */
  masked?: string
}>()

const authStore = useAuthStore()

const loading = ref(false)
const revealed = ref(false)
const revealedValue = ref('')
const copied = ref(false)
let autoHideTimer: ReturnType<typeof setTimeout> | null = null

const toast = useToast()

const maskedValue = computed(() => props.masked || props.last4)

// Only ADMIN and LAWYER can reveal — matches server-side config
const canReveal = computed(() => {
  return authStore.isAdmin || authStore.isLawyer
})

async function reveal() {
  loading.value = true
  try {
    const result = await $fetch<{ value: string }>(`/api/people/${props.personId}/reveal-field`, {
      params: { field: props.field }
    })
    revealedValue.value = result.value
    revealed.value = true

    // Auto-hide after 30 seconds
    autoHideTimer = setTimeout(() => hide(), 30000)
  }
  catch (err: any) {
    toast.error(err?.data?.message || `Failed to reveal ${props.label}`)
  }
  finally {
    loading.value = false
  }
}

function hide() {
  revealed.value = false
  revealedValue.value = ''
  if (autoHideTimer) {
    clearTimeout(autoHideTimer)
    autoHideTimer = null
  }
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(revealedValue.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
  catch {
    toast.error('Failed to copy to clipboard')
  }
}

onUnmounted(() => {
  if (autoHideTimer) clearTimeout(autoHideTimer)
})
</script>
