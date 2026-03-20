import { defineStore } from 'pinia'

interface StaffAttendee {
  userId: string
  firstName: string
  lastName: string
  avatar: string | null
  email: string
}

export interface CalendarEvent {
  id: string
  source: 'google' | 'ytp' | 'both'
  ytpAppointmentId?: string
  title: string
  startTime: string
  endTime: string
  location?: string
  isAllDay: boolean
  staffAttendees: StaffAttendee[]
  clientName?: string
  matterId?: string
  matterTitle?: string
  appointmentType?: string
  appointmentTypeId?: string
  status?: string
  description?: string
  videoMeetingJoinUrl?: string
  locationConfig?: string
  roomId?: string
}

export interface AppointmentType {
  id: string
  name: string
  slug: string
  description: string | null
  defaultDurationMinutes: number
  color: string
  consultationFee: number
  consultationFeeEnabled: boolean
  defaultLocation: string | null
  defaultLocationConfig: string | null
  isPubliclyBookable: boolean
  displayOrder: number
}

export interface Room {
  id: string
  name: string
  building: string | null
  address: string | null
  capacity: number | null
  calendarEmail: string | null
  description: string | null
  isActive: boolean
  displayOrder: number
}

export type ViewMode = 'week' | 'month' | 'agenda'
export type ViewType = 'team' | 'individual'

interface StaffMember {
  id: string
  name: string
  email: string
}

interface CalendarState {
  currentDate: Date
  viewMode: ViewMode
  viewType: ViewType
  selectedAttorneyId: string | null
  events: CalendarEvent[]
  loading: boolean
  error: string | null

  // Shared staff list — fetched once, used by modal + filters
  staffList: StaffMember[]
  staffListLoaded: boolean

  // Appointment types — fetched once, used by modal + event cards
  appointmentTypes: AppointmentType[]
  appointmentTypesLoaded: boolean

  // Rooms — fetched once, used by modal + location selector
  rooms: Room[]
  roomsLoaded: boolean

  // Cache control
  lastFetchKey: string | null
  lastFetchTime: number | null
}

const CACHE_TTL_MS = 30_000 // 30 seconds

export const useCalendarStore = defineStore('calendar', {
  state: (): CalendarState => ({
    currentDate: new Date(),
    viewMode: 'week',
    viewType: 'team',
    selectedAttorneyId: null,
    events: [],
    loading: false,
    error: null,
    staffList: [],
    staffListLoaded: false,
    appointmentTypes: [],
    appointmentTypesLoaded: false,
    rooms: [],
    roomsLoaded: false,
    lastFetchKey: null,
    lastFetchTime: null
  }),

  getters: {
    dateRange(): { timeMin: string; timeMax: string } {
      const d = this.currentDate
      if (this.viewMode === 'week') {
        const start = new Date(d)
        start.setDate(d.getDate() - d.getDay())
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(start.getDate() + 7)
        return { timeMin: start.toISOString(), timeMax: end.toISOString() }
      } else if (this.viewMode === 'month') {
        const start = new Date(d.getFullYear(), d.getMonth(), 1)
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        return { timeMin: start.toISOString(), timeMax: end.toISOString() }
      } else {
        const start = new Date(d)
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(start.getDate() + 14)
        return { timeMin: start.toISOString(), timeMax: end.toISOString() }
      }
    },

    dateLabel(): string {
      const d = this.currentDate
      if (this.viewMode === 'week') {
        const start = new Date(d)
        start.setDate(d.getDate() - d.getDay())
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        return `${startStr} - ${endStr}`
      }
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    },

    weekDays(): Date[] {
      const d = this.currentDate
      const start = new Date(d)
      start.setDate(d.getDate() - d.getDay())
      const days: Date[] = []
      for (let i = 0; i < 7; i++) {
        const day = new Date(start)
        day.setDate(start.getDate() + i)
        days.push(day)
      }
      return days
    },

    /**
     * Build a cache key from the current fetch parameters.
     */
    fetchKey(): string {
      return `${this.dateRange.timeMin}|${this.dateRange.timeMax}|${this.viewType}|${this.selectedAttorneyId || ''}`
    }
  },

  actions: {
    /**
     * Fetch events from the API.
     * Skips the network call if the same parameters were fetched within CACHE_TTL_MS.
     * Pass force=true to bypass cache (e.g. after a CRUD operation).
     */
    async fetchEvents(force = false) {
      const key = this.fetchKey
      if (
        !force &&
        this.lastFetchKey === key &&
        this.lastFetchTime &&
        Date.now() - this.lastFetchTime < CACHE_TTL_MS
      ) {
        return // cache hit
      }

      this.loading = true
      this.error = null
      try {
        const params: Record<string, string> = {
          timeMin: this.dateRange.timeMin,
          timeMax: this.dateRange.timeMax,
          view: this.viewType
        }
        if (this.selectedAttorneyId) {
          params.attorneyIds = this.selectedAttorneyId
        }

        const query = new URLSearchParams(params).toString()
        const data = await $fetch<{ events: CalendarEvent[] }>(`/api/calendar/events?${query}`)
        this.events = data.events
        this.lastFetchKey = key
        this.lastFetchTime = Date.now()
      } catch (err: any) {
        console.error('Failed to fetch calendar events:', err)
        this.error = err.data?.message || 'Failed to load calendar'
        this.events = []
      } finally {
        this.loading = false
      }
    },

    /**
     * Load the staff list (fetched once, shared across modal + filters).
     */
    async loadStaffList() {
      if (this.staffListLoaded) return
      try {
        const calendars = await $fetch<any[]>('/api/admin/calendars')
        const seen = new Set<string>()
        this.staffList = calendars
          .filter(c => {
            if (seen.has(c.attorneyId)) return false
            seen.add(c.attorneyId)
            return true
          })
          .map(c => ({
            id: c.attorneyId,
            name: c.attorneyName || c.attorneyEmail,
            email: c.attorneyEmail || ''
          }))
        this.staffListLoaded = true
      } catch {
        // Non-admin may not have access — that's fine
      }
    },

    /**
     * Load appointment types (fetched once, shared across modal + event cards).
     */
    async loadAppointmentTypes() {
      if (this.appointmentTypesLoaded) return
      try {
        this.appointmentTypes = await $fetch<AppointmentType[]>('/api/appointment-types')
        this.appointmentTypesLoaded = true
      } catch {
        // May fail if no types configured yet — that's fine
      }
    },

    /**
     * Load rooms (fetched once, shared across modal + location selectors).
     */
    async loadRooms() {
      if (this.roomsLoaded) return
      try {
        const allRooms = await $fetch<Room[]>('/api/admin/rooms')
        this.rooms = allRooms.filter(r => r.isActive)
        this.roomsLoaded = true
      } catch {
        // May fail if no rooms configured — that's fine
      }
    },

    /**
     * Get the color for an appointment type by ID.
     * Falls back to legacy enum color mapping for backward compat.
     */
    getTypeColor(appointmentTypeId?: string, legacyType?: string): string {
      if (appointmentTypeId) {
        const type = this.appointmentTypes.find(t => t.id === appointmentTypeId)
        if (type) return type.color
      }
      // Fallback to legacy colors
      const legacyColors: Record<string, string> = {
        CONSULTATION: '#3b82f6',
        MEETING: '#8b5cf6',
        CALL: '#eab308',
        FOLLOW_UP: '#f97316',
        SIGNING: '#22c55e',
        OTHER: '#6b7280'
      }
      return legacyColors[legacyType || ''] || '#6366f1'
    },

    /**
     * Get an appointment type by ID.
     */
    getTypeById(id: string): AppointmentType | undefined {
      return this.appointmentTypes.find(t => t.id === id)
    },

    async createAppointment(data: Record<string, any>) {
      const result = await $fetch('/api/calendar/appointments', {
        method: 'POST',
        body: data
      })
      await this.fetchEvents(true)
      return result
    },

    async updateAppointment(id: string, data: Record<string, any>) {
      const result = await $fetch(`/api/calendar/appointments/${id}`, {
        method: 'PUT',
        body: data
      })
      await this.fetchEvents(true)
      return result
    },

    async cancelAppointment(id: string, cancelOnGoogle = true) {
      const result = await $fetch(`/api/calendar/appointments/${id}?cancelOnGoogle=${cancelOnGoogle}`, {
        method: 'DELETE'
      })
      await this.fetchEvents(true)
      return result
    },

    // Navigation
    goToday() {
      this.currentDate = new Date()
    },

    goForward() {
      const d = new Date(this.currentDate)
      if (this.viewMode === 'week') {
        d.setDate(d.getDate() + 7)
      } else if (this.viewMode === 'month') {
        d.setMonth(d.getMonth() + 1)
      } else {
        d.setDate(d.getDate() + 14)
      }
      this.currentDate = d
    },

    goBack() {
      const d = new Date(this.currentDate)
      if (this.viewMode === 'week') {
        d.setDate(d.getDate() - 7)
      } else if (this.viewMode === 'month') {
        d.setMonth(d.getMonth() - 1)
      } else {
        d.setDate(d.getDate() - 14)
      }
      this.currentDate = d
    },

    goToDate(date: Date) {
      this.currentDate = date
    },

    // Event lookups — compare by local date/hour to handle timezone offsets correctly
    getEventsForDay(day: Date): CalendarEvent[] {
      const dayY = day.getFullYear()
      const dayM = day.getMonth()
      const dayD = day.getDate()

      return this.events.filter(e => {
        const start = new Date(e.startTime)
        return start.getFullYear() === dayY &&
          start.getMonth() === dayM &&
          start.getDate() === dayD
      })
    },

    getEventsForHour(day: Date, hour: number): CalendarEvent[] {
      return this.getEventsForDay(day).filter(e => {
        const start = new Date(e.startTime)
        return start.getHours() === hour
      })
    },

    /**
     * Invalidate the cache so the next fetchEvents() call hits the network.
     */
    invalidateCache() {
      this.lastFetchKey = null
      this.lastFetchTime = null
    }
  }
})
