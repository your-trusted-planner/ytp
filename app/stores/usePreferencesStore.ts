import { defineStore } from 'pinia'

export type DocumentViewPreference = 'local' | 'drive'
export type WeekStartPreference = 0 | 1 // 0 = Sunday, 1 = Monday

interface PreferencesState {
  // Document viewing preferences
  matterDocumentsDefaultView: DocumentViewPreference

  // Calendar / date picker preferences
  weekStartDay: WeekStartPreference // 0 = Sunday (US default), 1 = Monday (ISO 8601)

  // Track if we've hydrated from localStorage
  _hydrated: boolean
}

const STORAGE_KEY = 'ytp-user-preferences'

/**
 * Save preferences to localStorage
 */
function saveToStorage(state: PreferencesState) {
  if (import.meta.server) return

  try {
    // Don't save internal state
    const { _hydrated, ...prefs } = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }
  catch (e) {
    console.warn('Failed to save preferences to localStorage:', e)
  }
}

export const usePreferencesStore = defineStore('preferences', {
  state: (): PreferencesState => ({
    matterDocumentsDefaultView: 'local',
    weekStartDay: 0, // Sunday
    _hydrated: false
  }),

  getters: {
    /**
     * Get the default view for matter documents tab
     */
    documentsDefaultView: state => state.matterDocumentsDefaultView,
    weekStart: state => state.weekStartDay
  },

  actions: {
    /**
     * Hydrate preferences from localStorage (call on client mount)
     */
    hydrateFromStorage() {
      if (import.meta.server || this._hydrated) return

      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const prefs = JSON.parse(stored)
          if (prefs.matterDocumentsDefaultView) {
            this.matterDocumentsDefaultView = prefs.matterDocumentsDefaultView
          }
          if (prefs.weekStartDay !== undefined) {
            this.weekStartDay = prefs.weekStartDay
          }
        }
      }
      catch (e) {
        console.warn('Failed to load preferences from localStorage:', e)
      }

      this._hydrated = true
    },

    /**
     * Set the default view for matter documents tab
     */
    setDocumentsDefaultView(view: DocumentViewPreference) {
      this.matterDocumentsDefaultView = view
      saveToStorage(this.$state)
    },

    /**
     * Set the week start day (0 = Sunday, 1 = Monday)
     */
    setWeekStartDay(day: WeekStartPreference) {
      this.weekStartDay = day
      saveToStorage(this.$state)
    },

    /**
     * Reset all preferences to defaults
     */
    resetToDefaults() {
      this.matterDocumentsDefaultView = 'local'
      this.weekStartDay = 0
      saveToStorage(this.$state)
    }
  }
})
