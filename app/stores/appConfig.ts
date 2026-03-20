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

interface GoogleCalendarConfig {
  configured: boolean
  activeCalendars: number
}

interface AppConfigState {
  serviceAccountConfigured: boolean
  googleDrive: GoogleDriveConfig
  googleCalendar: GoogleCalendarConfig
  isLoaded: boolean
  isLoading: boolean
}

export const useAppConfigStore = defineStore('appConfig', {
  state: (): AppConfigState => ({
    serviceAccountConfigured: false,
    googleDrive: {
      isEnabled: false,
      isConfigured: false
    },
    googleCalendar: {
      configured: false,
      activeCalendars: 0
    },
    isLoaded: false,
    isLoading: false
  }),

  getters: {
    isDriveConfigured: state => state.googleDrive.isConfigured,
    isDriveEnabled: state => state.googleDrive.isEnabled,
    isCalendarConfigured: state => state.googleCalendar.configured,
    isGoogleConfigured: state => state.serviceAccountConfigured
  },

  actions: {
    async fetchConfig() {
      // Don't refetch if already loaded or loading
      if (this.isLoaded || this.isLoading) {
        return
      }

      this.isLoading = true
      try {
        const [driveStatus, workspaceStatus] = await Promise.all([
          $fetch<{ success: boolean, isEnabled: boolean, isConfigured: boolean }>(
            '/api/google-drive/status'
          ).catch(() => ({ success: false, isEnabled: false, isConfigured: false })),
          $fetch<{
            serviceAccount: { configured: boolean }
            drive: { enabled: boolean, configured: boolean }
            calendar: { configured: boolean, activeCalendars: number }
          }>('/api/google-workspace/status').catch(() => null)
        ])

        this.googleDrive = {
          isEnabled: driveStatus.isEnabled,
          isConfigured: driveStatus.isConfigured
        }

        if (workspaceStatus) {
          this.serviceAccountConfigured = workspaceStatus.serviceAccount.configured
          this.googleCalendar = workspaceStatus.calendar
        }

        this.isLoaded = true
      }
      catch (error) {
        console.error('Failed to fetch app config:', error)
        this.isLoaded = true
      }
      finally {
        this.isLoading = false
      }
    },

    /**
     * Force refetch (e.g. after saving settings).
     */
    async refetch() {
      this.isLoaded = false
      await this.fetchConfig()
    },

    /**
     * Reset store state (call on logout)
     */
    reset() {
      this.serviceAccountConfigured = false
      this.googleDrive = { isEnabled: false, isConfigured: false }
      this.googleCalendar = { configured: false, activeCalendars: 0 }
      this.isLoaded = false
      this.isLoading = false
    }
  }
})
