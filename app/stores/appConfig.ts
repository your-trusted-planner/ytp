/**
 * App Configuration Store
 *
 * Stores application-wide configuration that should be fetched once at login
 * and cached for the session. This includes integration status, feature flags, etc.
 */
import { defineStore } from 'pinia'

interface GoogleDriveConfig {
  isEnabled: boolean
  isConfigured: boolean
}

interface AppConfigState {
  googleDrive: GoogleDriveConfig
  isLoaded: boolean
  isLoading: boolean
}

export const useAppConfigStore = defineStore('appConfig', {
  state: (): AppConfigState => ({
    googleDrive: {
      isEnabled: false,
      isConfigured: false
    },
    isLoaded: false,
    isLoading: false
  }),

  getters: {
    isDriveConfigured: (state) => state.googleDrive.isConfigured,
    isDriveEnabled: (state) => state.googleDrive.isEnabled
  },

  actions: {
    async fetchConfig() {
      // Don't refetch if already loaded or loading
      if (this.isLoaded || this.isLoading) {
        return
      }

      this.isLoading = true
      try {
        const [driveStatus] = await Promise.all([
          $fetch<{ success: boolean; isEnabled: boolean; isConfigured: boolean }>(
            '/api/google-drive/status'
          ).catch(() => ({ success: false, isEnabled: false, isConfigured: false }))
        ])

        this.googleDrive = {
          isEnabled: driveStatus.isEnabled,
          isConfigured: driveStatus.isConfigured
        }
        this.isLoaded = true
      } catch (error) {
        console.error('Failed to fetch app config:', error)
        // Keep defaults on error
        this.isLoaded = true
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Reset store state (call on logout)
     */
    reset() {
      this.googleDrive = { isEnabled: false, isConfigured: false }
      this.isLoaded = false
      this.isLoading = false
    }
  }
})
