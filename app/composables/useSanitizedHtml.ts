import DOMPurify from 'dompurify'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'

/**
 * Composable that sanitizes HTML content using DOMPurify to prevent XSS attacks.
 * Use this whenever rendering user-provided or untrusted HTML with v-html.
 *
 * @param content - Reactive or static HTML content to sanitize
 * @returns Computed ref containing sanitized HTML
 *
 * @example
 * // With a ref
 * const rawHtml = ref('<script>alert("xss")</script><p>Hello</p>')
 * const safeHtml = useSanitizedHtml(rawHtml)
 * // In template: <div v-html="safeHtml"></div>
 *
 * @example
 * // With a getter function
 * const safeContent = useSanitizedHtml(() => document.value?.content)
 */
export function useSanitizedHtml(content: MaybeRefOrGetter<string | null | undefined>) {
  return computed(() => {
    const value = toValue(content)
    if (!value) return ''
    return DOMPurify.sanitize(value)
  })
}
