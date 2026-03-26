import type { FormFieldValue } from '~/types/form'

interface DraftData {
  values: Record<string, FormFieldValue>
  lastSectionIndex: number
  savedAt: number
}

interface PersistenceOptions {
  mode: 'server' | 'local'
  formId: string
  /** Server mode: context for the draft */
  actionItemId?: string
  clientJourneyId?: string
  matterId?: string
}

/**
 * Composable for form draft persistence.
 *
 * - 'server' mode: saves to formSubmissions table (authenticated users)
 * - 'local' mode: saves to localStorage (public/unauthenticated users)
 *
 * Both expose the same interface so FormRenderer doesn't need to know which is active.
 */
export function useFormPersistence(options: PersistenceOptions) {
  const saving = ref(false)
  const lastSavedAt = ref<number | null>(null)
  const draftId = ref<string | null>(null)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const DEBOUNCE_MS = 30_000 // 30 seconds

  // ── LocalStorage helpers ────────────────────────────────────────────────

  function localKey(): string {
    return `form-draft:${options.formId}`
  }

  function saveLocal(values: Record<string, FormFieldValue>, sectionIndex: number) {
    try {
      const data: DraftData = {
        values,
        lastSectionIndex: sectionIndex,
        savedAt: Date.now()
      }
      localStorage.setItem(localKey(), JSON.stringify(data))
      lastSavedAt.value = data.savedAt
    } catch { /* localStorage full or unavailable */ }
  }

  function loadLocal(): DraftData | null {
    try {
      const raw = localStorage.getItem(localKey())
      if (!raw) return null
      const data = JSON.parse(raw) as DraftData
      // Expire drafts after 7 days
      if (Date.now() - data.savedAt > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(localKey())
        return null
      }
      return data
    } catch {
      return null
    }
  }

  function clearLocal() {
    try { localStorage.removeItem(localKey()) } catch { /* */ }
  }

  // ── Server helpers ──────────────────────────────────────────────────────

  async function saveServer(values: Record<string, FormFieldValue>, sectionIndex: number) {
    saving.value = true
    try {
      const result = await $fetch<{ success: boolean; draftId: string }>(`/api/forms/${options.formId}/draft`, {
        method: 'PUT',
        body: {
          data: values,
          lastSectionIndex: sectionIndex,
          actionItemId: options.actionItemId,
          clientJourneyId: options.clientJourneyId,
          matterId: options.matterId
        }
      })
      draftId.value = result.draftId
      lastSavedAt.value = Date.now()
    } catch {
      // Silent fail — draft saving shouldn't block the user
    } finally {
      saving.value = false
    }
  }

  async function loadServer(): Promise<DraftData | null> {
    try {
      const params: Record<string, string> = {}
      if (options.actionItemId) params.actionItemId = options.actionItemId
      if (options.clientJourneyId) params.clientJourneyId = options.clientJourneyId

      const result = await $fetch<{ draft: { id: string; data: Record<string, FormFieldValue>; lastSectionIndex: number; updatedAt: number | null } | null }>(
        `/api/forms/${options.formId}/draft`,
        { params }
      )
      if (result.draft) {
        draftId.value = result.draft.id
        lastSavedAt.value = result.draft.updatedAt
        return {
          values: result.draft.data,
          lastSectionIndex: result.draft.lastSectionIndex,
          savedAt: result.draft.updatedAt || Date.now()
        }
      }
      return null
    } catch {
      return null
    }
  }

  async function clearServer() {
    // We don't delete server drafts — they get promoted to 'submitted' on final submit
    draftId.value = null
  }

  // ── Public interface ────────────────────────────────────────────────────

  /**
   * Save current form state as a draft. Called on section navigation
   * and debounced during field input.
   */
  async function save(values: Record<string, FormFieldValue>, sectionIndex: number) {
    if (options.mode === 'local') {
      saveLocal(values, sectionIndex)
    } else {
      await saveServer(values, sectionIndex)
    }
  }

  /**
   * Save with debounce — call on every value change.
   * Only actually saves after DEBOUNCE_MS of inactivity.
   */
  function debouncedSave(values: Record<string, FormFieldValue>, sectionIndex: number) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => save(values, sectionIndex), DEBOUNCE_MS)
  }

  /**
   * Load existing draft. Returns null if none exists.
   */
  async function restore(): Promise<DraftData | null> {
    if (options.mode === 'local') {
      return loadLocal()
    } else {
      return await loadServer()
    }
  }

  /**
   * Clear draft (on successful final submission).
   */
  async function clear() {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (options.mode === 'local') {
      clearLocal()
    } else {
      await clearServer()
    }
    lastSavedAt.value = null
  }

  return {
    saving,
    lastSavedAt,
    draftId,
    save,
    debouncedSave,
    restore,
    clear
  }
}
