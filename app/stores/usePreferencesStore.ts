import { defineStore } from 'pinia'

export type DocumentViewPreference = 'local' | 'drive'

interface PreferencesState {
  // Document viewing preferences
  matterDocumentsDefaultView: DocumentViewPreference

  // Track if we've hydrated from localStorage
  _hydrated: boolean

  // Add more preferences here as needed
  // sidebarCollapsed: boolean
  // tablePageSize: number
  // etc.
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
  } catch (e) {
    console.warn('Failed to save preferences to localStorage:', e)
  }
}

export const usePreferencesStore = defineStore('preferences', {
  state: (): PreferencesState => ({
    matterDocumentsDefaultView: 'local',
    _hydrated: false
  }),

  getters: {
    /**
     * Get the default view for matter documents tab
     */
    documentsDefaultView: (state) => state.matterDocumentsDefaultView
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
        }
      } catch (e) {
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
     * Reset all preferences to defaults
     */
    resetToDefaults() {
      this.matterDocumentsDefaultView = 'local'
      saveToStorage(this.$state)
    }
  }
})
