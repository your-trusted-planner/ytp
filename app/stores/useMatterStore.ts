import { defineStore } from 'pinia'
import type {
  Matter,
  MatterService,
  MatterJourney,
  MatterPayment,
  MatterDocument,
  MatterUpload,
  DriveSyncStatus
} from '~/types/matter'
import {
  transformMatter,
  transformMatterService,
  transformMatterJourney,
  transformMatterPayment
} from '~/types/matter'

interface MatterState {
  // Current matter being viewed
  currentMatter: Matter | null
  currentMatterId: string | null

  // Related data for current matter
  services: MatterService[]
  journeys: MatterJourney[]
  payments: MatterPayment[]
  documents: MatterDocument[]
  uploads: MatterUpload[]

  // Loading states
  loading: boolean
  loadingServices: boolean
  loadingJourneys: boolean
  loadingPayments: boolean
  loadingDocuments: boolean

  // Error state
  error: string | null
}

export const useMatterStore = defineStore('matter', {
  state: (): MatterState => ({
    currentMatter: null,
    currentMatterId: null,
    services: [],
    journeys: [],
    payments: [],
    documents: [],
    uploads: [],
    loading: false,
    loadingServices: false,
    loadingJourneys: false,
    loadingPayments: false,
    loadingDocuments: false,
    error: null
  }),

  getters: {
    /**
     * Full client name
     */
    clientName(): string {
      if (!this.currentMatter) return ''
      const first = this.currentMatter.clientFirstName || ''
      const last = this.currentMatter.clientLastName || ''
      return `${first} ${last}`.trim()
    },

    /**
     * Full lead attorney name
     */
    leadAttorneyName(): string {
      if (!this.currentMatter) return ''
      const first = this.currentMatter.leadAttorneyFirstName || ''
      const last = this.currentMatter.leadAttorneyLastName || ''
      return `${first} ${last}`.trim()
    },

    /**
     * Total payments amount
     */
    totalPayments(): number {
      return this.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
    },

    /**
     * Is matter synced to Google Drive
     */
    isDriveSynced(): boolean {
      return this.currentMatter?.googleDriveSyncStatus === 'SYNCED'
    },

    /**
     * Has a Google Drive folder ID
     */
    hasDriveFolder(): boolean {
      return !!this.currentMatter?.googleDriveFolderId
    }
  },

  actions: {
    /**
     * Fetch a matter by ID and all related data
     */
    async fetchMatter(matterId: string) {
      // Skip if already loaded
      if (this.currentMatterId === matterId && this.currentMatter) {
        return this.currentMatter
      }

      this.loading = true
      this.error = null
      this.currentMatterId = matterId

      try {
        const response = await $fetch<{ matter: Record<string, any> }>(`/api/matters/${matterId}`)
        this.currentMatter = transformMatter(response.matter)

        // Fetch related data in parallel
        await Promise.all([
          this.fetchServices(matterId),
          this.fetchJourneys(matterId),
          this.fetchPayments(matterId)
        ])

        return this.currentMatter
      } catch (err: any) {
        this.error = err.data?.message || err.message || 'Failed to fetch matter'
        console.error('Failed to fetch matter:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Refresh current matter data without clearing state
     */
    async refreshMatter() {
      if (!this.currentMatterId) return

      try {
        const response = await $fetch<{ matter: Record<string, any> }>(`/api/matters/${this.currentMatterId}`)
        this.currentMatter = transformMatter(response.matter)
        return this.currentMatter
      } catch (err: any) {
        console.error('Failed to refresh matter:', err)
        throw err
      }
    },

    /**
     * Fetch services for current matter
     */
    async fetchServices(matterId?: string) {
      const id = matterId || this.currentMatterId
      if (!id) return

      this.loadingServices = true
      try {
        const response = await $fetch<{ services: Record<string, any>[] }>(`/api/matters/${id}/services`)
        this.services = (response.services || []).map(transformMatterService)
      } catch (err) {
        console.error('Failed to fetch services:', err)
      } finally {
        this.loadingServices = false
      }
    },

    /**
     * Fetch journeys for current matter
     */
    async fetchJourneys(matterId?: string) {
      const id = matterId || this.currentMatterId
      if (!id) return

      this.loadingJourneys = true
      try {
        const response = await $fetch<{ journeys: Record<string, any>[] }>(`/api/client-journeys/matter/${id}`)
        this.journeys = (response.journeys || []).map(transformMatterJourney)
      } catch (err) {
        console.error('Failed to fetch journeys:', err)
      } finally {
        this.loadingJourneys = false
      }
    },

    /**
     * Fetch payments for current matter
     */
    async fetchPayments(matterId?: string) {
      const id = matterId || this.currentMatterId
      if (!id) return

      this.loadingPayments = true
      try {
        const response = await $fetch<{ payments: Record<string, any>[] }>(`/api/payments/matter/${id}`)
        this.payments = (response.payments || []).map(transformMatterPayment)
      } catch (err) {
        console.error('Failed to fetch payments:', err)
      } finally {
        this.loadingPayments = false
      }
    },

    /**
     * Fetch documents for current matter
     */
    async fetchDocuments(matterId?: string) {
      const id = matterId || this.currentMatterId
      if (!id) return

      this.loadingDocuments = true
      try {
        const response = await $fetch<{
          documents: MatterDocument[]
          uploads: MatterUpload[]
        }>(`/api/matters/${id}/documents`)

        this.documents = response.documents || []
        this.uploads = response.uploads || []
      } catch (err) {
        console.error('Failed to fetch documents:', err)
      } finally {
        this.loadingDocuments = false
      }
    },

    /**
     * Update Google Drive sync status (optimistic update)
     */
    updateDriveSync(data: {
      folderId: string
      folderUrl: string
      status?: DriveSyncStatus
    }) {
      if (this.currentMatter) {
        this.currentMatter.googleDriveFolderId = data.folderId
        this.currentMatter.googleDriveFolderUrl = data.folderUrl
        this.currentMatter.googleDriveSyncStatus = data.status || 'SYNCED'
        this.currentMatter.googleDriveSyncError = null
        this.currentMatter.googleDriveLastSyncAt = Math.floor(Date.now() / 1000)
      }
    },

    /**
     * Clear the current matter (on navigation away)
     */
    clearCurrentMatter() {
      this.currentMatter = null
      this.currentMatterId = null
      this.services = []
      this.journeys = []
      this.payments = []
      this.documents = []
      this.uploads = []
      this.error = null
    },

    /**
     * Add a service to the current matter (after API call succeeds)
     */
    addService(service: MatterService) {
      this.services.push(service)
    },

    /**
     * Refresh services list
     */
    async refreshServices() {
      await this.fetchServices()
    }
  }
})
