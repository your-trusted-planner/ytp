<template>
  <div ref="container" />
</template>

<script setup lang="ts">
/**
 * Cloudflare Turnstile invisible CAPTCHA widget.
 *
 * Loads the Turnstile script, renders an invisible widget, and emits
 * the verification token when the challenge is solved.
 *
 * Usage:
 *   <UiTurnstile @verified="token = $event" />
 *   Then include `token` in your form submission body.
 */

const props = withDefaults(defineProps<{
  siteKey?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'invisible'
}>(), {
  theme: 'auto',
  size: 'invisible'
})

const emit = defineEmits<{
  verified: [token: string]
  error: []
  expired: []
}>()

const container = ref<HTMLElement | null>(null)
const widgetId = ref<string | null>(null)

const resolvedSiteKey = computed(() => {
  return props.siteKey || useRuntimeConfig().public.turnstileSiteKey || ''
})

onMounted(() => {
  if (!resolvedSiteKey.value) {
    if (import.meta.dev) {
      console.warn('[Turnstile] No site key configured — widget disabled in development')
      // Emit a dummy token so forms still work in dev without Turnstile
      emit('verified', 'dev-bypass-token')
    }
    return
  }

  loadScript().then(() => renderWidget())
})

onBeforeUnmount(() => {
  if (widgetId.value && window.turnstile) {
    window.turnstile.remove(widgetId.value)
  }
})

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="turnstile"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile'))
    document.head.appendChild(script)
  })
}

function renderWidget() {
  if (!container.value || !window.turnstile) return

  widgetId.value = window.turnstile.render(container.value, {
    sitekey: resolvedSiteKey.value,
    theme: props.theme,
    size: props.size,
    callback: (token: string) => emit('verified', token),
    'error-callback': () => emit('error'),
    'expired-callback': () => emit('expired')
  })
}

// Allow parent to reset the widget (e.g., after a failed submission)
defineExpose({
  reset: () => {
    if (widgetId.value && window.turnstile) {
      window.turnstile.reset(widgetId.value)
    }
  }
})
</script>
